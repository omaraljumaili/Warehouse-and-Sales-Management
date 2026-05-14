import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Users, Truck, Plus, Phone, Mail, MapPin, Hash, Trash2, Search, Edit3, X, DollarSign } from 'lucide-react';
import { db } from '../db';
import type { Language, Customer, Supplier, Payment } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface CRMViewProps {
  lang: Language;
  t: any;
}

export function CRMView({ lang, t }: CRMViewProps) {
  const [activeTab, setActiveTab] = useState<'Customers' | 'Suppliers'>('Customers');
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingContact, setEditingContact] = useState<Customer | Supplier | null>(null);
  const [viewingDetails, setViewingDetails] = useState<Customer | Supplier | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const settings = useLiveQuery(() => db.settings.get('current'));
  const currency = settings?.currency || '$';

  const customers = useLiveQuery(() => db.customers.toArray());
  const suppliers = useLiveQuery(() => db.suppliers.toArray());

  const contactSales = useLiveQuery(
    () => viewingDetails && activeTab === 'Customers' 
      ? db.sales.where('customerId').equals(viewingDetails.id!).toArray() 
      : Promise.resolve([]),
    [viewingDetails, activeTab]
  );

  const contactPayments = useLiveQuery(
    () => viewingDetails && activeTab === 'Customers'
      ? db.payments.where('customerId').equals(viewingDetails.id!).toArray()
      : Promise.resolve([]),
    [viewingDetails, activeTab]
  );

  const contactPurchases = useLiveQuery(
    () => viewingDetails && activeTab === 'Suppliers' 
      ? db.purchases.where('supplierId').equals(viewingDetails.id!).toArray() 
      : Promise.resolve([]),
    [viewingDetails, activeTab]
  );

  const filteredContacts = useMemo(() => {
    const list = activeTab === 'Customers' ? customers : suppliers;
    if (!list) return [];
    return list.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.nameAr && c.nameAr.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.phone.includes(searchQuery) ||
      (c.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [activeTab, customers, suppliers, searchQuery]);

  const handleOpenModal = (contact?: Customer | Supplier) => {
    if (contact) {
      setEditingContact(contact);
    } else {
      setEditingContact(null);
    }
    setShowModal(true);
  };

  const tc = t.crm;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      nameAr: formData.get('nameAr') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      address: formData.get('address') as string,
    };
    
    if (activeTab === 'Customers') {
      if (editingContact) {
        await db.customers.update(editingContact.id!, { ...data });
      } else {
        await db.customers.add({
          ...data as any,
          totalSpent: 0,
          totalPaid: 0,
          lastVisit: Date.now()
        });
      }
    } else {
      if (editingContact) {
        await db.suppliers.update(editingContact.id!, { 
          ...data,
          contactName: formData.get('contactName') as string 
        });
      } else {
        await db.suppliers.add({
          ...data,
          contactName: formData.get('contactName') as string
        });
      }
    }
    setShowModal(false);
    setEditingContact(null);
  };

  const handleDelete = async (id: number) => {
    if (confirm(tc.confirmDelete)) {
      if (activeTab === 'Customers') await db.customers.delete(id);
      else await db.suppliers.delete(id);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-6">
        <div className="flex gap-4 p-1 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <button 
            onClick={() => { setActiveTab('Customers'); setSearchQuery(''); }}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === 'Customers' ? "bg-apple-blue text-white shadow-lg shadow-apple-blue/20" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            <Users size={18} />
            {tc.customers}
          </button>
          <button 
            onClick={() => { setActiveTab('Suppliers'); setSearchQuery(''); }}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === 'Suppliers' ? "bg-apple-blue text-white shadow-lg shadow-apple-blue/20" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            <Truck size={18} />
            {tc.suppliers}
          </button>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64 group">
            <input
              type="text"
              placeholder={tc.searchContacts}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-full py-2.5 px-12 text-sm focus:outline-none focus:ring-4 focus:ring-apple-blue/5 transition-all shadow-sm font-rubik"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-apple-blue transition-colors" size={18} />
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="h-11 px-6 rounded-full bg-apple-blue text-white font-black uppercase tracking-widest text-[11px] flex items-center gap-2 shadow-xl shadow-apple-blue/20 hover:scale-[1.03] active:scale-95 transition-all"
          >
            <Plus size={18} />
            {activeTab === 'Customers' ? tc.addCustomer : tc.addSupplier}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredContacts.map(person => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={`${activeTab}-${person.id}`}
                className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm group hover:shadow-xl hover:shadow-apple-blue/5 transition-all relative"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 bg-apple-bg rounded-2xl flex items-center justify-center text-apple-blue ring-1 ring-gray-100 shadow-sm">
                    {activeTab === 'Customers' ? <Users size={28} /> : <Truck size={28} />}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleOpenModal(person)}
                      title={tc.editContact}
                      className="p-2 text-gray-300 hover:text-apple-blue transition-colors"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(person.id!)}
                      title={t.delete}
                      className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div 
                  className="cursor-pointer"
                  onClick={() => setViewingDetails(person)}
                >
                  <h3 className="text-xl font-bold text-apple-dark-blue mb-4 hover:text-apple-blue transition-colors">
                    {lang === 'ar' && person.nameAr ? person.nameAr : person.name}
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-[13px] text-apple-gray font-medium">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                        <Phone size={14} />
                      </div>
                      {person.phone}
                    </div>
                    {person.email && (
                      <div className="flex items-center gap-3 text-[13px] text-apple-gray font-medium">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                          <Mail size={14} />
                        </div>
                        <span className="truncate">{person.email}</span>
                      </div>
                    )}
                    {activeTab === 'Customers' && (
                      <div className="space-y-1 mt-2">
                        <div className="flex items-center gap-3 text-[13px] text-apple-gray font-medium">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-apple-blue">
                            <Hash size={14} />
                          </div>
                          {currency}{(person as Customer).totalSpent.toLocaleString()} {tc.spent}
                        </div>
                        {((person as Customer).totalSpent - (person as Customer).totalPaid > 0) && (
                          <div className="flex items-center gap-3 text-[13px] text-red-500 font-bold">
                            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                              <DollarSign size={14} />
                            </div>
                            {currency}{((person as Customer).totalSpent - (person as Customer).totalPaid).toLocaleString()} {tc.due}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredContacts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-40 text-center opacity-40">
             <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300">
                {activeTab === 'Customers' ? <Users size={40} /> : <Truck size={40} />}
             </div>
             <p className="font-bold flex flex-col gap-1">
                <span>{tc.noResults} {activeTab === 'Customers' ? tc.customers : tc.suppliers}</span>
                <span className="text-xs font-normal">{tc.noResultsSub}</span>
             </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl p-12 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-apple-blue/5 rounded-full blur-3xl -mr-20 -mt-20" />
              
              <div className="flex items-center justify-between mb-10 relative">
                <h2 className="text-3xl font-black text-apple-dark-blue">
                  {editingContact ? tc.editContact : (activeTab === 'Customers' ? tc.addCustomer : tc.addSupplier)}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={24} className="text-gray-400" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6 relative">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{tc.fullName}</label>
                    <input
                      name="name"
                      required
                      defaultValue={editingContact?.name}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-apple-blue/10 transition-all font-rubik"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{tc.fullNameAr}</label>
                    <input
                      name="nameAr"
                      defaultValue={editingContact?.nameAr}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-apple-blue/10 transition-all font-rubik"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{tc.phone}</label>
                    <input
                      name="phone"
                      required
                      defaultValue={editingContact?.phone}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-apple-blue/10 transition-all font-rubik"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{tc.email}</label>
                    <input
                      name="email"
                      type="email"
                      defaultValue={editingContact?.email}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-apple-blue/10 transition-all font-rubik"
                    />
                  </div>
                  {activeTab === 'Suppliers' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{tc.contactPerson}</label>
                      <input
                        name="contactName"
                        defaultValue={(editingContact as Supplier)?.contactName}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-apple-blue/10 transition-all font-rubik"
                      />
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{tc.address}</label>
                  <textarea
                    name="address"
                    defaultValue={editingContact?.address}
                    rows={2}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-apple-blue/10 transition-all font-rubik resize-none"
                  />
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="submit"
                    className="w-full py-5 rounded-2xl bg-apple-blue text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-apple-blue/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    {editingContact ? tc.updateRecords : tc.createContact}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {viewingDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl p-10 relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              <button 
                onClick={() => setViewingDetails(null)}
                className="absolute top-8 right-8 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-400" />
              </button>

              <div className="flex items-center gap-6 mb-10">
                <div className="w-20 h-20 bg-apple-bg rounded-3xl flex items-center justify-center text-apple-blue shadow-sm ring-1 ring-gray-100">
                  {activeTab === 'Customers' ? <Users size={40} /> : <Truck size={40} />}
                </div>
                <div>
                   <h2 className="text-3xl font-black text-apple-dark-blue leading-tight">
                     {lang === 'ar' && viewingDetails.nameAr ? viewingDetails.nameAr : viewingDetails.name}
                   </h2>
                   <div className="flex items-center gap-4 mt-1 text-apple-gray font-bold text-sm">
                      <span className="flex items-center gap-1 leading-none"><Phone size={14}/> {viewingDetails.phone}</span>
                      {viewingDetails.email && <span className="flex items-center gap-1 leading-none"><Mail size={14}/> {viewingDetails.email}</span>}
                   </div>
                </div>
              </div>

              <div id="details-scroll-container" className="flex-1 overflow-y-auto px-1 space-y-8 custom-scrollbar">
                {viewingDetails.address && (
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{tc.address}</p>
                    <div className="bg-gray-50 p-4 rounded-2xl flex items-start gap-3">
                      <MapPin size={18} className="text-apple-blue shrink-0 mt-0.5" />
                      <p className="text-sm font-bold text-apple-dark-blue leading-relaxed">{viewingDetails.address}</p>
                    </div>
                  </div>
                )}

                <div>
                   <div className="flex items-center justify-between mb-4 px-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                         {activeTab === 'Customers' ? tc.accountStatus : tc.purchaseHistory}
                      </p>
                      {activeTab === 'Customers' && viewingDetails && (
                        <button 
                          onClick={() => { setEditingPayment(null); setShowPaymentModal(true); }}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-apple-green text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-apple-green/20 hover:scale-105 active:scale-95 transition-all"
                        >
                          <Plus size={14} />
                          {tc.recordPayment}
                        </button>
                      )}
                   </div>
                   {activeTab === 'Customers' && viewingDetails && (
                     <div className="bg-apple-bg rounded-3xl p-6 mb-8 border border-gray-100">
                        <div className="grid grid-cols-3 gap-4">
                           <div className="text-center">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{tc.totalSpent}</p>
                              <p className="text-lg font-black text-apple-dark-blue">{currency}{(viewingDetails as Customer).totalSpent.toLocaleString()}</p>
                           </div>
                           <div className="text-center">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{tc.totalPaid}</p>
                              <p className="text-lg font-black text-apple-green">{currency}{(viewingDetails as Customer).totalPaid.toLocaleString()}</p>
                           </div>
                           <div className="text-center">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{tc.balanceDue}</p>
                              <p className="text-lg font-black text-red-500">{currency}{((viewingDetails as Customer).totalSpent - (viewingDetails as Customer).totalPaid).toLocaleString()}</p>
                           </div>
                        </div>
                     </div>
                   )}
                   <div className="space-y-6">
                      {activeTab === 'Customers' ? (
                        <div className="space-y-6">
                          <div>
                            <div className="flex items-center justify-between px-1 mb-3">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{tc.paymentHistory}</p>
                              <div className="flex items-center gap-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                <span className="hidden sm:inline">{tc.method}</span>
                                <span className="hidden sm:inline">{tc.date}</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {contactPayments?.map(payment => (
                                <div key={`payment-${payment.id}`} className="p-4 rounded-xl border border-gray-50 flex items-center justify-between bg-white/50 group/item hover:bg-white hover:shadow-md hover:shadow-apple-green/5 transition-all">
                                  <div className="flex items-center gap-4">
                                    <div className={cn(
                                      "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                      editingPayment?.id === payment.id ? "bg-apple-blue text-white" : "bg-green-50 text-apple-green"
                                    )}>
                                      <DollarSign size={14} />
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-apple-dark-blue">
                                        {currency}{payment.amount.toLocaleString()}
                                        <span className="text-[10px] text-gray-400 font-medium leading-none ml-2 bg-gray-100 px-1.5 py-0.5 rounded">
                                          {payment.method === 'Cash' ? t.pos.cash : 
                                           payment.method === 'Card' ? t.pos.card : 
                                           t.pos.transfer}
                                        </span>
                                      </p>
                                      <p className="text-[10px] text-apple-gray font-medium">{new Date(payment.date).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 focus-within:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => {
                                        setEditingPayment(payment);
                                        setShowPaymentModal(true);
                                      }}
                                      title={tc.update}
                                      className="p-1.5 text-gray-300 hover:text-apple-blue transition-colors"
                                    >
                                      <Edit3 size={14} />
                                    </button>
                                    <button 
                                      onClick={async () => {
                                        if (confirm(tc.confirmDeletePayment)) {
                                          await db.transaction('rw', [db.payments, db.customers], async () => {
                                            await db.payments.delete(payment.id!);
                                            const updatedPaid = (viewingDetails as Customer).totalPaid - payment.amount;
                                            await db.customers.update(viewingDetails.id!, { totalPaid: updatedPaid });
                                            setViewingDetails({ ...viewingDetails, totalPaid: updatedPaid } as Customer);
                                            if (editingPayment?.id === payment.id) setEditingPayment(null);
                                          });
                                        }
                                      }}
                                      title={t.delete}
                                      className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              {contactPayments?.length === 0 && <p className="text-center py-6 text-[11px] text-gray-400 font-medium italic">{tc.noDirectPayments}</p>}
                            </div>
                          </div>

                          <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1 mb-3">{tc.recentSales}</p>
                            <div className="space-y-3">
                              {contactSales?.map(sale => (
                                <div key={`sale-${sale.id}`} className="p-4 rounded-2xl border border-gray-100 flex items-center justify-between bg-white">
                                  <div>
                                     <p className="font-bold text-apple-dark-blue">{new Date(sale.date).toLocaleDateString()}</p>
                                     <p className="text-xs text-apple-gray font-medium">{sale.items.length} {t.crm.itemsCount} • {sale.paymentMethod === 'Cash' ? t.pos.cash : sale.paymentMethod === 'Card' ? t.pos.card : t.pos.transfer}</p>
                                  </div>
                                  <div className="text-right">
                                     <p className="font-black text-apple-blue">{currency}{sale.totalAmount.toLocaleString()}</p>
                                     {sale.totalAmount > sale.amountPaid && (
                                       <p className="text-[10px] text-red-500 font-bold">{lang === 'ar' ? 'غير مدفوع' : 'Unpaid'}: {currency}{(sale.totalAmount - sale.amountPaid).toLocaleString()}</p>
                                     )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        contactPurchases?.map(p => (
                          <div key={`purchase-${p.id}`} className="p-4 rounded-2xl border border-gray-100 flex items-center justify-between bg-white">
                            <div>
                               <p className="font-bold text-apple-dark-blue">{new Date(p.date).toLocaleDateString()}</p>
                               <p className="text-xs text-apple-gray font-medium">{lang === 'ar' ? 'فاتورة' : 'Invoice'}: {p.invoiceNumber} • {p.status}</p>
                            </div>
                            <p className="font-black text-apple-blue">{currency}{p.totalAmount.toLocaleString()}</p>
                          </div>
                        ))
                      )}
                      {((activeTab === 'Customers' ? (contactSales?.length === 0 && contactPayments?.length === 0) : contactPurchases?.length === 0)) && (
                        <p className="text-center py-10 text-gray-400 font-bold">{tc.noHistory}</p>
                      )}
                   </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPaymentModal && viewingDetails && activeTab === 'Customers' && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-[48px] shadow-2xl p-10 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-apple-green/5 rounded-full blur-3xl -mr-16 -mt-16" />
              
              <div className="flex items-center justify-between mb-8 relative">
                <h2 className="text-2xl font-black text-apple-dark-blue">
                  {editingPayment ? tc.editPayment : tc.recordPayment}
                </h2>
                <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const amount = parseFloat(formData.get('amount') as string);
                  const method = formData.get('method') as 'Cash' | 'Card' | 'Transfer';
                  const dateStr = formData.get('date') as string;
                  const date = dateStr ? new Date(dateStr).getTime() : Date.now();
                  
                  if (amount > 0) {
                    if (editingPayment) {
                      await db.transaction('rw', [db.payments, db.customers], async () => {
                        await db.payments.update(editingPayment.id!, { amount, method, date });
                        const updatedPaid = (viewingDetails as Customer).totalPaid - editingPayment.amount + amount;
                        await db.customers.update(viewingDetails.id!, { totalPaid: updatedPaid });
                        setViewingDetails({ ...viewingDetails, totalPaid: updatedPaid } as Customer);
                        setEditingPayment(null);
                        setShowPaymentModal(false);
                      });
                    } else {
                      await db.transaction('rw', [db.payments, db.customers], async () => {
                        await db.payments.add({
                          customerId: viewingDetails.id!,
                          amount,
                          date,
                          method
                        });
                        const updatedPaid = (viewingDetails as Customer).totalPaid + amount;
                        await db.customers.update(viewingDetails.id!, { totalPaid: updatedPaid });
                        setViewingDetails({ ...viewingDetails, totalPaid: updatedPaid } as Customer);
                        setShowPaymentModal(false);
                      });
                    }
                  }
                }}
                className="space-y-6 relative"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{tc.amount}</label>
                  <div className="relative">
                    <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-apple-green" />
                    <input
                      name="amount"
                      type="number"
                      step="0.01"
                      required
                      defaultValue={editingPayment?.amount}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-apple-green/10 transition-all font-rubik"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{tc.method}</label>
                  <select
                    name="method"
                    defaultValue={editingPayment?.method || 'Cash'}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-apple-green/10 transition-all font-rubik"
                  >
                    <option value="Cash">{t.pos.cash}</option>
                    <option value="Card">{t.pos.card}</option>
                    <option value="Transfer">{t.pos.transfer}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{tc.date}</label>
                  <input
                    name="date"
                    type="date"
                    required
                    defaultValue={new Date(editingPayment?.date || Date.now()).toISOString().split('T')[0]}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-apple-green/10 transition-all font-rubik"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="submit"
                    className="w-full py-5 rounded-2xl bg-apple-green text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-apple-green/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    {editingPayment ? tc.update : tc.record}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


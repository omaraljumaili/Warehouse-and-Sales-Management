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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
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
    if (confirm(lang === 'en' ? 'Are you sure?' : 'هل أنت متأكد؟')) {
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
            {t.crm.customers}
          </button>
          <button 
            onClick={() => { setActiveTab('Suppliers'); setSearchQuery(''); }}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === 'Suppliers' ? "bg-apple-blue text-white shadow-lg shadow-apple-blue/20" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            <Truck size={18} />
            {t.crm.suppliers}
          </button>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64 group">
            <input
              type="text"
              placeholder={lang === 'en' ? 'Search contacts...' : 'ابحث عن جهات الاتصال...'}
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
            {activeTab === 'Customers' ? t.crm.addCustomer : t.crm.addSupplier}
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
                key={person.id}
                className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm group hover:shadow-xl hover:shadow-apple-blue/5 transition-all relative"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 bg-apple-bg rounded-2xl flex items-center justify-center text-apple-blue ring-1 ring-gray-100 shadow-sm">
                    {activeTab === 'Customers' ? <Users size={28} /> : <Truck size={28} />}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleOpenModal(person)}
                      className="p-2 text-gray-300 hover:text-apple-blue transition-colors"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(person.id!)}
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
                  <h3 className="text-xl font-bold text-apple-dark-blue mb-4 hover:text-apple-blue transition-colors">{person.name}</h3>
                  
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
                          ${(person as Customer).totalSpent.toLocaleString()} Spent
                        </div>
                        {((person as Customer).totalSpent - (person as Customer).totalPaid > 0) && (
                          <div className="flex items-center gap-3 text-[13px] text-red-500 font-bold">
                            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                              <DollarSign size={14} />
                            </div>
                            ${((person as Customer).totalSpent - (person as Customer).totalPaid).toLocaleString()} Due
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
                <span>No results found in {activeTab}</span>
                <span className="text-xs font-normal">Try a different search term or add a new record</span>
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
                  {editingContact ? (lang === 'en' ? 'Edit Contact' : 'تعديل جهة الاتصال') : (activeTab === 'Customers' ? t.crm.addCustomer : t.crm.addSupplier)}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={24} className="text-gray-400" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6 relative">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{lang === 'en' ? 'Full Name' : 'الاسم الكامل'}</label>
                    <input
                      name="name"
                      required
                      defaultValue={editingContact?.name}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-apple-blue/10 transition-all font-rubik"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t.crm.phone}</label>
                    <input
                      name="phone"
                      required
                      defaultValue={editingContact?.phone}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-apple-blue/10 transition-all font-rubik"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{lang === 'en' ? 'Email Address' : 'البريد الإلكتروني'}</label>
                    <input
                      name="email"
                      type="email"
                      defaultValue={editingContact?.email}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-apple-blue/10 transition-all font-rubik"
                    />
                  </div>
                  {activeTab === 'Suppliers' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{lang === 'en' ? 'Contact Person' : 'شخص التواصل'}</label>
                      <input
                        name="contactName"
                        defaultValue={(editingContact as Supplier)?.contactName}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-apple-blue/10 transition-all font-rubik"
                      />
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{lang === 'en' ? 'Physical Address' : 'العنوان'}</label>
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
                    {editingContact ? (lang === 'en' ? 'Update Records' : 'تحديث السجلات') : (lang === 'en' ? 'Create Contact' : 'إنشاء جهة اتصال')}
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
                   <h2 className="text-3xl font-black text-apple-dark-blue leading-tight">{viewingDetails.name}</h2>
                   <div className="flex items-center gap-4 mt-1 text-apple-gray font-bold text-sm">
                      <span className="flex items-center gap-1"><Phone size={14}/> {viewingDetails.phone}</span>
                      {viewingDetails.email && <span className="flex items-center gap-1"><Mail size={14}/> {viewingDetails.email}</span>}
                   </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-1 space-y-8 custom-scrollbar">
                {viewingDetails.address && (
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Location</p>
                    <div className="bg-gray-50 p-4 rounded-2xl flex items-start gap-3">
                      <MapPin size={18} className="text-apple-blue shrink-0 mt-0.5" />
                      <p className="text-sm font-bold text-apple-dark-blue leading-relaxed">{viewingDetails.address}</p>
                    </div>
                  </div>
                )}

                <div>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-1">
                      {activeTab === 'Customers' ? 'Account Status' : 'Purchase History'}
                   </p>
                   {activeTab === 'Customers' && viewingDetails && (
                     <div className="bg-apple-bg rounded-3xl p-6 mb-8 border border-gray-100">
                        <div className="grid grid-cols-3 gap-4 mb-6">
                           <div className="text-center">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Spent</p>
                              <p className="text-lg font-black text-apple-dark-blue">${(viewingDetails as Customer).totalSpent.toLocaleString()}</p>
                           </div>
                           <div className="text-center">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Paid</p>
                              <p className="text-lg font-black text-apple-green">${(viewingDetails as Customer).totalPaid.toLocaleString()}</p>
                           </div>
                           <div className="text-center">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Balance Due</p>
                              <p className="text-lg font-black text-red-500">${((viewingDetails as Customer).totalSpent - (viewingDetails as Customer).totalPaid).toLocaleString()}</p>
                           </div>
                        </div>

                        <div className="space-y-4">
                           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">{editingPayment ? (lang === 'en' ? 'Edit Payment' : 'تعديل الدفعة') : (lang === 'en' ? 'Quick Record Payment' : 'تسجيل دفعة سريعة')}</p>
                           <div className="flex flex-wrap gap-3">
                              <input 
                                 type="number"
                                 id="paymentAmount"
                                 key={editingPayment?.id || 'new'}
                                 defaultValue={editingPayment?.amount || ''}
                                 placeholder={lang === 'en' ? 'Amount' : 'المبلغ'}
                                 className="flex-1 min-w-[120px] bg-white border border-gray-100 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-apple-green/5 transition-all"
                              />
                              <select 
                                id="paymentMethod"
                                defaultValue={editingPayment?.method || 'Cash'}
                                className="bg-white border border-gray-100 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-apple-green/5 transition-all"
                              >
                                <option value="Cash">Cash</option>
                                <option value="Card">Card</option>
                                <option value="Transfer">Transfer</option>
                              </select>
                              <button 
                                 onClick={async () => {
                                    const amountInput = document.getElementById('paymentAmount') as HTMLInputElement;
                                    const methodInput = document.getElementById('paymentMethod') as HTMLSelectElement;
                                    const amount = parseFloat(amountInput.value);
                                    const method = methodInput.value as 'Cash' | 'Card' | 'Transfer';
                                    
                                    if (amount > 0) {
                                       if (editingPayment) {
                                          await db.transaction('rw', [db.payments, db.customers], async () => {
                                             await db.payments.update(editingPayment.id!, { amount, method });
                                             const updatedPaid = (viewingDetails as Customer).totalPaid - editingPayment.amount + amount;
                                             await db.customers.update(viewingDetails.id!, { totalPaid: updatedPaid });
                                             setViewingDetails({ ...viewingDetails, totalPaid: updatedPaid } as Customer);
                                             setEditingPayment(null);
                                          });
                                       } else {
                                          await db.transaction('rw', [db.payments, db.customers], async () => {
                                             await db.payments.add({
                                                customerId: viewingDetails.id!,
                                                amount,
                                                date: Date.now(),
                                                method
                                             });
                                             const updatedPaid = (viewingDetails as Customer).totalPaid + amount;
                                             await db.customers.update(viewingDetails.id!, { totalPaid: updatedPaid });
                                             setViewingDetails({ ...viewingDetails, totalPaid: updatedPaid } as Customer);
                                             amountInput.value = '';
                                          });
                                       }
                                    }
                                 }}
                                 className="bg-apple-green text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-apple-green/20 hover:scale-[1.03] active:scale-95 transition-all"
                              >
                                 {editingPayment ? (lang === 'en' ? 'Update' : 'تحديث') : (lang === 'en' ? 'Record' : 'تسجيل')}
                              </button>
                              {editingPayment && (
                                <button 
                                  onClick={() => setEditingPayment(null)}
                                  className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                  {lang === 'en' ? 'Cancel' : 'إلغاء'}
                                </button>
                              )}
                           </div>
                        </div>
                     </div>
                   )}
                   <div className="space-y-6">
                      {activeTab === 'Customers' ? (
                        <div className="space-y-6">
                          <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1 mb-3">{lang === 'en' ? 'Payment History' : 'سجل الدفعات'}</p>
                            <div className="space-y-2">
                              {contactPayments?.map(payment => (
                                <div key={payment.id} className="p-4 rounded-xl border border-gray-50 flex items-center justify-between bg-white/50 group/item">
                                  <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-apple-green">
                                      <DollarSign size={14} />
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-apple-dark-blue">${payment.amount.toLocaleString()} <span className="text-[10px] text-gray-400 font-medium leading-none ml-2">{payment.method}</span></p>
                                      <p className="text-[10px] text-apple-gray font-medium">{new Date(payment.date).toLocaleString()}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => setEditingPayment(payment)}
                                      className="p-1.5 text-gray-300 hover:text-apple-blue transition-colors"
                                    >
                                      <Edit3 size={14} />
                                    </button>
                                    <button 
                                      onClick={async () => {
                                        if (confirm(lang === 'en' ? 'Delete this payment record?' : 'حذف سجل الدفع هذا؟')) {
                                          await db.transaction('rw', [db.payments, db.customers], async () => {
                                            await db.payments.delete(payment.id!);
                                            const updatedPaid = (viewingDetails as Customer).totalPaid - payment.amount;
                                            await db.customers.update(viewingDetails.id!, { totalPaid: updatedPaid });
                                            setViewingDetails({ ...viewingDetails, totalPaid: updatedPaid } as Customer);
                                          });
                                        }
                                      }}
                                      className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              {contactPayments?.length === 0 && <p className="text-center py-4 text-[11px] text-gray-400 font-medium">No direct payments recorded</p>}
                            </div>
                          </div>

                          <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1 mb-3">{lang === 'en' ? 'Recent Sales' : 'المبيعات الأخيرة'}</p>
                            <div className="space-y-3">
                              {contactSales?.map(sale => (
                                <div key={sale.id} className="p-4 rounded-2xl border border-gray-100 flex items-center justify-between bg-white">
                                  <div>
                                     <p className="font-bold text-apple-dark-blue">{new Date(sale.date).toLocaleDateString()}</p>
                                     <p className="text-xs text-apple-gray font-medium">{sale.items.length} items • {sale.paymentMethod}</p>
                                  </div>
                                  <div className="text-right">
                                     <p className="font-black text-apple-blue">${sale.totalAmount.toLocaleString()}</p>
                                     {sale.totalAmount > sale.amountPaid && (
                                       <p className="text-[10px] text-red-500 font-bold">Unpaid: ${(sale.totalAmount - sale.amountPaid).toLocaleString()}</p>
                                     )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        contactPurchases?.map(p => (
                          <div key={p.id} className="p-4 rounded-2xl border border-gray-100 flex items-center justify-between bg-white">
                            <div>
                               <p className="font-bold text-apple-dark-blue">{new Date(p.date).toLocaleDateString()}</p>
                               <p className="text-xs text-apple-gray font-medium">Invoice: {p.invoiceNumber} • {p.status}</p>
                            </div>
                            <p className="font-black text-apple-blue">${p.totalAmount.toLocaleString()}</p>
                          </div>
                        ))
                      )}
                      {((activeTab === 'Customers' ? (contactSales?.length === 0 && contactPayments?.length === 0) : contactPurchases?.length === 0)) && (
                        <p className="text-center py-10 text-gray-400 font-bold">No history found</p>
                      )}
                   </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Search, Printer, Calendar, User, DollarSign, Eye, X, History, ShoppingBag, CreditCard, ChevronRight, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { InvoicePrinter } from './InvoicePrinter';
import type { Sale, Language } from '../types';
import { cn } from '../lib/utils';

interface SalesViewProps {
  lang: Language;
  t: any;
}

export function SalesView({ lang, t }: SalesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [viewingDetails, setViewingDetails] = useState<Sale | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const sales = useLiveQuery(() => 
    db.sales.orderBy('date').reverse().toArray()
  );

  const customers = useLiveQuery(() => db.customers.toArray());

  const filteredSales = useMemo(() => {
    if (!sales) return [];
    const search = searchQuery.toLowerCase();
    
    return sales.filter(s => {
      const customer = customers?.find(c => c.id === s.customerId);
      const customerName = customer ? (lang === 'ar' && customer.nameAr ? customer.nameAr : customer.name) : (lang === 'ar' ? 'بدون تحديد عميل' : 'Walk-in');
      
      return s.id?.toString().includes(search) ||
             s.paymentMethod.toLowerCase().includes(search) ||
             customerName.toLowerCase().includes(search);
    });
  }, [sales, searchQuery, customers, lang]);

  const handlePrint = (sale: Sale) => {
    setSelectedSale(sale);
    setShowPrintModal(true);
  };

  const settings = useLiveQuery(() => db.settings.get('current'));

  const executePrint = () => {
    window.focus();
    setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.error("Print failed:", err);
      }
    }, 250);
  };

  const formatCurrency = (val: number) => {
    const formatted = val.toLocaleString(undefined, { 
      minimumFractionDigits: settings?.currency === 'د.ع' ? 0 : 2,
      maximumFractionDigits: settings?.currency === 'د.ع' ? 0 : 2 
    });
    return lang === 'ar' ? `${formatted} ${settings?.currency || 'د.ع'}` : `${settings?.currency || '$'}${formatted}`;
  };

  const tp = t.salesHistory;

  return (
    <div className="flex flex-col h-full space-y-10 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-apple-dark-blue tracking-tighter">
            {tp.title}
          </h2>
          <p className="text-apple-gray font-bold mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-apple-blue" />
            {tp.subtitle}
          </p>
        </div>

        <div className="relative group w-full md:w-96">
          <input
            type="text"
            placeholder={tp.search}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-[32px] py-4 px-14 text-sm focus:outline-none focus:ring-4 focus:ring-apple-blue/5 transition-all shadow-sm font-bold"
          />
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-apple-blue transition-colors" size={20} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        <div className="grid grid-cols-1 gap-6">
          {filteredSales?.map((sale, idx) => {
            const customer = customers?.find(c => c.id === sale.customerId);
            const customerName = customer ? (lang === 'ar' && customer.nameAr ? customer.nameAr : customer.name) : (lang === 'ar' ? 'عميل نقدي' : 'Cash Customer');

            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={sale.id}
                className="bg-white p-8 rounded-[48px] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-apple-blue/5 transition-all group overflow-hidden relative"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                  <div className="flex items-center gap-8">
                    <div className="w-16 h-16 bg-apple-bg rounded-3xl flex items-center justify-center text-apple-blue shadow-inner relative overflow-hidden group-hover:scale-105 transition-transform">
                      <div className="absolute inset-0 bg-apple-blue/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <ShoppingBag size={28} />
                    </div>
                    <div>
                      <div className="flex items-center gap-4 mb-2">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full text-gray-400 font-black text-[10px] uppercase tracking-widest border border-gray-100">
                           <Hash size={12} />
                           {sale.id}
                        </div>
                        <span className={cn(
                          "px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                          sale.paymentMethod === 'Cash' ? "bg-green-50 text-apple-green" :
                          sale.paymentMethod === 'Credit' ? "bg-red-50 text-red-500" :
                          "bg-blue-50 text-apple-blue"
                        )}>
                          {sale.paymentMethod === 'Cash' ? t.pos.cash : 
                           sale.paymentMethod === 'Credit' ? t.pos.credit : 
                           sale.paymentMethod === 'Card' ? t.pos.card : 
                           sale.paymentMethod === 'Partial' ? t.pos.partial : sale.paymentMethod}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-black text-apple-dark-blue">{customerName}</h3>
                        {sale.items.length > 1 && (
                          <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg">
                            +{sale.items.length - 1} items
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-apple-gray font-bold mt-1 flex items-center gap-2">
                        <Calendar size={14} className="text-gray-300" />
                        {new Date(sale.date).toLocaleString(lang === 'ar' ? 'ar-IQ' : 'en-US')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-12 lg:gap-16">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{tp.totalAmount}</p>
                      <p className="text-2xl font-black text-apple-dark-blue tracking-tight">{formatCurrency(sale.totalAmount)}</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setViewingDetails(sale)}
                        className="p-4 bg-gray-50 rounded-2xl text-gray-400 hover:bg-apple-dark-blue hover:text-white transition-all shadow-sm border border-transparent hover:border-apple-dark-blue"
                      >
                        <Eye size={22} />
                      </button>
                      <button 
                        onClick={() => handlePrint(sale)}
                        className="p-4 bg-apple-bg rounded-2xl text-apple-blue hover:bg-apple-blue hover:text-white transition-all shadow-sm border border-apple-blue/5"
                      >
                        <Printer size={22} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
          
          {filteredSales?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-40 opacity-30">
               <div className="w-24 h-24 bg-gray-50 rounded-[40px] flex items-center justify-center mb-6">
                  <History size={48} />
               </div>
               <p className="font-black text-lg uppercase tracking-widest">{tp.noSales}</p>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {viewingDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-apple-dark-blue/20 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-10 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-5">
                   <div className="w-14 h-14 bg-apple-blue/10 rounded-2xl flex items-center justify-center text-apple-blue">
                      <Eye size={28} />
                   </div>
                   <div>
                      <h2 className="text-2xl font-black text-apple-dark-blue tracking-tight">{t.invoice.details}</h2>
                      <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-0.5">#{viewingDetails.id} • {new Date(viewingDetails.date).toLocaleDateString()}</p>
                   </div>
                </div>
                <button 
                  onClick={() => setViewingDetails(null)}
                  className="w-12 h-12 rounded-full hover:bg-gray-50 flex items-center justify-center transition-colors border border-gray-100"
                >
                  <X size={24} className="text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-8">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t.pos.customer}</p>
                        <p className="font-black text-apple-dark-blue">
                          {customers?.find(c => c.id === viewingDetails.customerId)?.name || (lang === 'ar' ? 'عميل نقدي' : 'Cash Customer')}
                        </p>
                     </div>
                     <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t.invoice.payment}</p>
                        <p className="font-black text-apple-blue">{viewingDetails.paymentMethod}</p>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">{t.invoice.description}</p>
                     <div className="space-y-3">
                        {viewingDetails.items.map((item, idx) => (
                           <div key={idx} className="flex items-center justify-between p-5 bg-white border border-gray-50 rounded-2xl hover:border-apple-blue/20 transition-colors">
                              <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs font-black">
                                    {idx + 1}
                                 </div>
                                 <div>
                                    <p className="font-bold text-apple-dark-blue">{item.name}</p>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.qty} units × {formatCurrency(item.price)}</p>
                                 </div>
                              </div>
                              <p className="font-black text-apple-dark-blue">{formatCurrency(item.total)}</p>
                           </div>
                        ))}
                     </div>
                  </div>
              </div>

              <div className="p-10 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t.invoice.grandTotal}</p>
                    <p className="text-3xl font-black text-apple-dark-blue">{formatCurrency(viewingDetails.totalAmount)}</p>
                  </div>
                  <button 
                    onClick={() => { handlePrint(viewingDetails); setViewingDetails(null); }}
                    className="flex items-center gap-3 px-8 py-4 bg-apple-blue text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.03] active:scale-95 transition-all shadow-xl shadow-apple-blue/20"
                  >
                    <Printer size={20} />
                    {t.pos.printNow}
                  </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPrintModal && selectedSale && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-apple-dark-blue/40 backdrop-blur-sm print:hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-[48px] shadow-2xl p-12 text-center relative"
            >
              <button 
                onClick={() => setShowPrintModal(false)}
                className="absolute top-8 right-8 w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors transition-transform active:scale-90"
              >
                <X size={20} className="text-gray-400" />
              </button>
              
              <div className="w-24 h-24 bg-apple-bg rounded-[40px] flex items-center justify-center text-apple-blue mx-auto mb-8 shadow-inner relative overflow-hidden">
                <div className="absolute inset-0 bg-apple-blue/5 animate-pulse" />
                <Printer size={48} className="relative z-10" />
              </div>
              <h2 className="text-3xl font-black text-apple-dark-blue mb-2">{tp.reprint}</h2>
              <p className="text-apple-gray font-bold mb-10 uppercase text-[10px] tracking-widest bg-gray-50 inline-block px-4 py-1 rounded-full">{t.purchases.invoice} #{selectedSale.id}</p>
              
              <div className="space-y-4">
                <button 
                  onClick={executePrint}
                  disabled={!settings}
                  className="w-full h-16 rounded-3xl bg-apple-blue text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-apple-blue/20 hover:scale-[1.02] active:scale-100 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                >
                  <Printer size={20} />
                  {t.pos.printNow}
                </button>
                <button 
                  onClick={() => setShowPrintModal(false)}
                  className="w-full h-16 rounded-3xl bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-xs hover:bg-gray-100 transition-all"
                >
                  {t.pos.close}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {selectedSale && <InvoicePrinter sale={selectedSale} lang={lang} t={t} settings={settings} />}
    </div>
  );
}


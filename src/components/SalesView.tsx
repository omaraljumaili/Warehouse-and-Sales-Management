import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Search, Printer, Calendar, User, DollarSign, Eye, X, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { InvoicePrinter } from './InvoicePrinter';
import type { Sale, Language } from '../types';
import { cn } from '../lib/utils';

interface SalesViewProps {
  lang: Language;
}

export function SalesView({ lang }: SalesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const sales = useLiveQuery(() => 
    db.sales.orderBy('date').reverse().toArray()
  );

  const filteredSales = sales?.filter(s => 
    s.id?.toString().includes(searchQuery) ||
    s.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePrint = (sale: Sale) => {
    setSelectedSale(sale);
    setShowPrintModal(true);
  };

  const executePrint = () => {
    window.focus();
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black text-apple-dark-blue tracking-tighter">
            {lang === 'en' ? 'Sales History' : 'سجل المبيعات'}
          </h2>
          <p className="text-apple-gray font-medium mt-1">Review and reprint past invoices</p>
        </div>

        <div className="relative group w-80">
          <input
            type="text"
            placeholder={lang === 'en' ? 'Search invoice # or payment...' : 'ابحث عن رقم الفاتورة أو الدفع...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-full py-3 px-12 text-sm focus:outline-none focus:ring-4 focus:ring-apple-blue/5 transition-all shadow-sm font-rubik"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-apple-blue transition-colors" size={18} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        <div className="grid grid-cols-1 gap-4">
          {filteredSales?.map(sale => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={sale.id}
              className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-apple-blue/5 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-apple-bg rounded-2xl flex items-center justify-center text-apple-blue ring-1 ring-gray-100">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-black text-apple-dark-blue">#{sale.id}</h3>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                        sale.paymentMethod === 'Cash' ? "bg-green-50 text-apple-green" :
                        sale.paymentMethod === 'Credit' ? "bg-red-50 text-red-500" :
                        "bg-blue-50 text-apple-blue"
                      )}>
                        {sale.paymentMethod}
                      </span>
                    </div>
                    <p className="text-sm text-apple-gray font-medium">{new Date(sale.date).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-12">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{lang === 'en' ? 'Total Amount' : 'المبلغ الإجمالي'}</p>
                    <p className="text-xl font-black text-apple-dark-blue">${sale.totalAmount.toLocaleString()}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handlePrint(sale)}
                      className="p-3 bg-apple-bg rounded-2xl text-apple-blue hover:bg-apple-blue hover:text-white transition-all shadow-sm ring-1 ring-gray-100"
                    >
                      <Printer size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          
          {filteredSales?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-40 opacity-30">
               <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <History size={40} />
               </div>
               <p className="font-bold">{lang === 'en' ? 'No sales found' : 'لا يوجد مبيعات'}</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showPrintModal && selectedSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm print:hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-[48px] shadow-2xl p-10 text-center"
            >
              <button 
                onClick={() => setShowPrintModal(false)}
                className="absolute top-8 right-8 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-400" />
              </button>
              
              <div className="w-20 h-20 bg-apple-bg rounded-[32px] flex items-center justify-center text-apple-blue mx-auto mb-6">
                <Printer size={40} />
              </div>
              <h2 className="text-3xl font-black text-apple-dark-blue mb-2">{lang === 'en' ? 'Reprint Invoice' : 'إعادة طباعة الفاتورة'}</h2>
              <p className="text-apple-gray font-medium mb-8">Invoice #{selectedSale.id}</p>
              
              <button 
                onClick={executePrint}
                className="w-full h-14 rounded-2xl bg-apple-blue text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-apple-blue/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
              >
                <Printer size={18} />
                {lang === 'en' ? 'Print Now' : 'اطبع الآن'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {selectedSale && <InvoicePrinter sale={selectedSale} lang={lang} />}
    </div>
  );
}

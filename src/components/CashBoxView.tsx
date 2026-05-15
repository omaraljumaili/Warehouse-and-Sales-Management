import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Language, TranslationStrings, CashShift, CashEntry } from '../types';
import { cn } from '../lib/utils';
import { 
  Key, 
  Unlock, 
  Lock, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  DollarSign, 
  History,
  AlertCircle,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CashBoxViewProps {
  lang: Language;
  t: TranslationStrings;
}

export function CashBoxView({ lang, t }: CashBoxViewProps) {
  const [showEntryModal, setShowEntryModal] = useState<'In' | 'Out' | null>(null);
  const [activeShiftId, setActiveShiftId] = useState<number | null>(null);

  const shifts = useLiveQuery(() => db.cashShifts.toArray());
  const entries = useLiveQuery(() => db.cashEntries.toArray());
  const sales = useLiveQuery(() => db.sales.toArray());
  const settings = useLiveQuery(() => db.settings.get('current'));
  const currency = settings?.currency || 'د.ع';

  const formatCurrency = (val: number) => {
    const formatted = val.toLocaleString(undefined, { 
      minimumFractionDigits: currency === 'د.ع' ? 0 : 2,
      maximumFractionDigits: currency === 'د.ع' ? 0 : 2 
    });
    return lang === 'ar' ? `${formatted} ${currency}` : `${currency}${formatted}`;
  };

  const activeShift = shifts?.find(s => s.status === 'Open');
  const isAr = lang === 'ar';
  const tc = t.cashBox;

  const currentShiftEntries = entries?.filter(e => e.shiftId === activeShift?.id);
  const currentShiftSales = sales?.filter(s => activeShift && s.date >= activeShift.openingDate && s.paymentMethod === 'Cash');
  
  const totalSalesCash = currentShiftSales?.reduce((acc, sale) => acc + sale.amountPaid, 0) || 0;
  const totalEntriesIn = currentShiftEntries?.filter(e => e.type === 'In').reduce((acc, e) => acc + e.amount, 0) || 0;
  const totalEntriesOut = currentShiftEntries?.filter(e => e.type === 'Out').reduce((acc, e) => acc + e.amount, 0) || 0;
  
  const expectedBalance = (activeShift?.openingBalance || 0) + totalSalesCash + totalEntriesIn - totalEntriesOut;

  const handleOpenShift = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const balance = parseFloat(formData.get('balance') as string);
    
    await db.cashShifts.add({
      userId: 1, // Default user
      openingDate: Date.now(),
      openingBalance: balance,
      status: 'Open'
    });
  };

  const handleCloseShift = async (actual: number) => {
    if (activeShift) {
        await db.cashShifts.update(activeShift.id!, {
            closingDate: Date.now(),
            closingBalance: expectedBalance,
            actualClosingBalance: actual,
            status: 'Closed'
        });
    }
  };

  const handleAddEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeShift) return;
    
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string);
    const note = formData.get('note') as string;
    
    if (amount > 0 && showEntryModal) {
        await db.cashEntries.add({
            shiftId: activeShift.id!,
            type: showEntryModal,
            amount,
            date: Date.now(),
            note
        });
        setShowEntryModal(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-12">
        <h2 className="text-4xl font-black text-apple-dark-blue tracking-tighter">{tc.title}</h2>
        <div className="flex items-center gap-2 mt-2">
          {activeShift ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-apple-green rounded-full animate-pulse" />
                <p className="text-apple-green font-bold text-[11px] uppercase tracking-widest">Shift Active</p>
              </div>
          ) : (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-400 rounded-full" />
                <p className="text-red-400 font-bold text-[11px] uppercase tracking-widest">Shift Closed</p>
              </div>
          )}
        </div>
      </div>

      {!activeShift ? (
        <div className="max-w-md mx-auto bg-white rounded-[48px] border border-gray-100 shadow-2xl p-10 text-center">
            <div className="w-20 h-20 bg-apple-bg rounded-[28px] flex items-center justify-center text-apple-blue mx-auto mb-8 shadow-inner shadow-apple-blue/5">
                <Unlock size={32} />
            </div>
            <h3 className="text-2xl font-black text-apple-dark-blue mb-4">{tc.openShift}</h3>
            <p className="text-apple-gray font-medium mb-8">Set your initial drawer balance to start the working day</p>
            
            <form onSubmit={handleOpenShift} className="space-y-6">
                <div className="relative group text-right">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-apple-green group-focus-within:scale-110 transition-transform font-black text-lg">{currency}</span>
                    <input name="balance" type="number" step="0.01" required placeholder={isAr ? "رصيد الافتتاح" : "Opening Balance"} className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-14 pr-6 text-lg font-black focus:outline-none focus:ring-4 focus:ring-apple-green/5 transition-all text-center" />
                </div>
                <button type="submit" className="w-full py-5 rounded-2xl bg-apple-blue text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-apple-blue/20 hover:scale-[1.02] active:scale-95 transition-all">
                    {tc.openShift}
                </button>
            </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                {/* Live Stats */}
                <div className="grid grid-cols-2 gap-6 text-left" dir="ltr">
                    <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden group">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Cash In</p>
                        <h4 className="text-4xl font-black text-apple-green">+ {formatCurrency(totalSalesCash + totalEntriesIn)}</h4>
                        <ArrowUpRight className="absolute -right-2 -bottom-2 w-24 h-24 text-apple-green/5 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform" />
                    </div>
                    <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden group">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Cash Out</p>
                        <h4 className="text-4xl font-black text-red-500">- {formatCurrency(totalEntriesOut)}</h4>
                        <ArrowDownRight className="absolute -right-2 -bottom-2 w-24 h-24 text-red-500/5 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform" />
                    </div>
                </div>

                {/* Entry Tabs */}
                <div className="bg-white rounded-[48px] border border-gray-100 shadow-sm overflow-hidden text-right">
                    <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="text-xl font-bold text-apple-dark-blue">Daily Activity</h3>
                        <div className="flex gap-3">
                            <button onClick={() => setShowEntryModal('In')} className="px-5 py-2 rounded-xl bg-apple-green/10 text-apple-green text-[10px] font-black uppercase tracking-widest hover:bg-apple-green hover:text-white transition-all">
                                {tc.cashIn}
                            </button>
                            <button onClick={() => setShowEntryModal('Out')} className="px-5 py-2 rounded-xl bg-red-100 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">
                                {tc.cashOut}
                            </button>
                        </div>
                    </div>
                    <div className="p-8 space-y-6">
                        {currentShiftEntries?.map(entry => (
                            <div key={entry.id} className="flex items-center justify-between pb-6 border-b border-gray-50 last:border-0 last:pb-0 group">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110",
                                        entry.type === 'In' ? "bg-apple-green/10 text-apple-green" : "bg-red-50 text-red-500"
                                    )}>
                                        {entry.type === 'In' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-apple-dark-blue">{entry.note}</p>
                                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">
                                            <Clock size={12} />
                                            {new Date(entry.date).toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-left font-rubik">
                                    <p className={cn("text-xl font-black", entry.type === 'In' ? "text-apple-green" : "text-red-500")}>
                                        {entry.type === 'In' ? '+' : '-'} {formatCurrency(entry.amount)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                {/* Active Balance Card */}
                <div className="bg-apple-dark-blue p-10 rounded-[48px] text-white shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10 text-right">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">{tc.expected}</p>
                        <h3 className="text-5xl font-black tracking-tight mb-2">{formatCurrency(expectedBalance)}</h3>
                        <div className="flex items-center gap-3 bg-white/10 w-fit p-3 rounded-2xl mr-auto ml-0 border border-white/10 backdrop-blur-md">
                            <Clock className="text-white/40" size={16} />
                            <p className="text-[10px] font-bold tracking-widest uppercase">Started: {new Date(activeShift.openingDate).toLocaleTimeString()}</p>
                        </div>
                    </div>
                    <Lock className="absolute -left-8 -bottom-8 w-40 h-40 text-white/5 group-hover:scale-110 transition-transform duration-700" />
                </div>

                {/* Close Session */}
                <div className="bg-white p-10 rounded-[48px] border border-gray-100 shadow-sm text-right">
                    <h3 className="text-xl font-bold text-apple-dark-blue mb-2">{tc.closeShift}</h3>
                    <p className="text-sm text-apple-gray font-medium mb-8">Review counts and lock the drawer to end the day</p>
                    
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{tc.actual}</label>
                            <input id="actualBalance" type="number" defaultValue={expectedBalance} className="w-full bg-apple-bg border border-gray-100 rounded-2xl py-4 px-6 text-xl font-black text-apple-dark-blue focus:outline-none text-center" />
                        </div>
                        <button 
                            onClick={() => {
                                const input = document.getElementById('actualBalance') as HTMLInputElement;
                                handleCloseShift(parseFloat(input.value));
                            }}
                            className="w-full py-5 rounded-2xl bg-red-500 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            {tc.closeShift}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Entry Modal */}
      <AnimatePresence>
        {showEntryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl p-10 relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8 relative">
                <h2 className="text-2xl font-black text-apple-dark-blue">
                   {showEntryModal === 'In' ? tc.cashIn : tc.cashOut}
                </h2>
                <button onClick={() => setShowEntryModal(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <Lock className="text-gray-400" size={24} />
                </button>
              </div>

              <form onSubmit={handleAddEntry} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{tc.balance}</label>
                  <input name="amount" type="number" step="0.01" required className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-apple-blue/10 transition-all font-rubik" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{tc.entryNote}</label>
                  <input name="note" required className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-apple-blue/10 transition-all font-rubik text-right" />
                </div>
                <button type="submit" className={cn(
                    "w-full py-5 rounded-2xl text-white font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all hover:scale-[1.02]",
                    showEntryModal === 'In' ? "bg-apple-green shadow-apple-green/20" : "bg-red-500 shadow-red-500/20"
                )}>
                  Confirm Operation
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Shift History Section */}
      <div className="mt-20">
        <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-apple-dark-blue">{tc.lastShifts}</h3>
            <History className="text-gray-300" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-right">
            {shifts?.filter(s => s.status === 'Closed').slice().reverse().map(shift => (
                <div key={shift.id} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm group hover:border-apple-blue/20 transition-all">
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-10 h-10 bg-apple-bg rounded-xl flex items-center justify-center text-apple-blue">
                             <FileText size={18} />
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">#{shift.id}</p>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-right">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</span>
                            <span className="font-bold text-sm">{new Date(shift.openingDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-right">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Result</span>
                            <span className={cn(
                                "font-black text-sm px-3 py-1 rounded-full",
                                (shift.actualClosingBalance || 0) >= (shift.closingBalance || 0) ? "bg-apple-green/10 text-apple-green" : "bg-red-50 text-red-500"
                            )}>
                                {formatCurrency(shift.actualClosingBalance || 0)}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}

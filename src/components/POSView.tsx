import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, User, History, Printer, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../db';
import type { Language, InventoryItem, Customer, Sale } from '../types';
import { cn } from '../lib/utils';
import { InvoicePrinter } from './InvoicePrinter';

interface POSViewProps {
  lang: Language;
  t: any;
}

export function POSView({ lang, t }: POSViewProps) {
  const items = useLiveQuery(() => db.items.toArray());
  const customers = useLiveQuery(() => db.customers.toArray());
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [cart, setCart] = useState<{ item: InventoryItem, qty: number }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Credit' | 'Partial'>('Cash');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    const search = searchQuery.toLowerCase();
    return items.filter(i => 
      i.name.toLowerCase().includes(search) || 
      i.nameAr.toLowerCase().includes(search) || 
      i.barcode?.includes(search)
    );
  }, [items, searchQuery]);

  const addToCart = (item: InventoryItem) => {
    if (item.quantity <= 0) return;
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        if (existing.qty >= item.quantity) return prev;
        return prev.map(i => i.item.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { item, qty: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.item.id === id) {
        const newQty = Math.max(1, Math.min(i.item.quantity, i.qty + delta));
        return { ...i, qty: newQty };
      }
      return i;
    }));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(i => i.item.id !== id));
  };

  const total = useMemo(() => {
    return cart.reduce((acc, curr) => acc + (curr.item.price * curr.qty), 0);
  }, [cart]);

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    const finalAmountPaid = paymentMethod === 'Cash' || paymentMethod === 'Card' ? total : (paymentMethod === 'Credit' ? 0 : amountPaid);

    const sale: Sale = {
      customerId: selectedCustomerId || undefined,
      date: Date.now(),
      items: cart.map(i => ({
        itemId: i.item.id!,
        name: lang === 'en' ? i.item.name : i.item.nameAr,
        quantity: i.qty,
        price: i.item.price,
        total: i.item.price * i.qty
      })),
      totalAmount: total,
      amountPaid: finalAmountPaid,
      paymentMethod: paymentMethod
    };

    try {
      await db.transaction('rw', db.items, db.sales, db.customers, async () => {
        // Update Inventory
        for (const cartItem of cart) {
          const dbItem = await db.items.get(cartItem.item.id!);
          if (dbItem) {
            await db.items.update(cartItem.item.id!, {
              quantity: dbItem.quantity - cartItem.qty,
              lastUpdated: Date.now()
            });
          }
        }
        // Save Sale
        const saleId = await db.sales.add(sale);
        const savedSale = { ...sale, id: saleId as number };
        setLastSale(savedSale);

        // Update Customer stats if exists
        if (selectedCustomerId) {
          const customer = await db.customers.get(selectedCustomerId);
          if (customer) {
            await db.customers.update(selectedCustomerId, {
              totalSpent: customer.totalSpent + total,
              totalPaid: customer.totalPaid + finalAmountPaid,
              lastVisit: Date.now()
            });
          }
        }
      });
      setCart([]);
      setSelectedCustomerId(null);
      setAmountPaid(0);
      setShowPrintModal(true);
    } catch (err) {
      console.error(err);
      alert(lang === 'en' ? 'Checkout failed' : 'فشلت عملية الدفع');
    }
  };

  const handlePrint = () => {
    // Ensure styles are applied and the window has focus before printing
    window.focus();
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="flex h-full gap-6">
      {/* Search & Items Selection */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-6 relative group">
          <input
            type="text"
            placeholder={t.pos.addItem}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-2xl py-4 px-14 text-lg focus:outline-none focus:ring-4 focus:ring-apple-blue/10 transition-all shadow-sm"
          />
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-apple-blue" size={24} />
        </div>

        <div className="flex-1 bg-white/50 rounded-[32px] border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-black text-apple-dark-blue flex items-center gap-2">
              <History size={18} className="text-apple-blue" />
              {lang === 'en' ? 'Available Stock' : 'المخزون المتوفر'}
            </h3>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{filteredItems.length} {lang === 'en' ? 'Results' : 'نتائج'}</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 lg:grid-cols-3 gap-4 custom-scrollbar">
            {filteredItems.map(item => (
              <button
                key={item.id}
                disabled={item.quantity <= 0}
                onClick={() => addToCart(item)}
                className={cn(
                  "p-4 rounded-2xl border text-right transition-all flex flex-col gap-2 group relative overflow-hidden",
                  item.quantity <= 0 
                    ? "bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed" 
                    : "bg-white border-gray-100 hover:border-apple-blue hover:shadow-xl hover:shadow-apple-blue/5 hover:-translate-y-1"
                )}
              >
                <div className="flex justify-between items-start gap-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                    item.quantity <= item.minQuantity ? "bg-orange-50 text-orange-500" : "bg-blue-50 text-apple-blue"
                  )}>
                    {item.quantity} QTY
                  </span>
                  <span className="text-sm font-black text-apple-blue">{item.price.toFixed(2)}</span>
                </div>
                <div>
                  <h4 className="font-bold text-apple-dark-blue truncate">{lang === 'en' ? item.name : item.nameAr}</h4>
                  <p className="text-[10px] text-gray-400 truncate">{lang === 'en' ? item.nameAr : item.name}</p>
                </div>
                <div className="absolute inset-0 bg-apple-blue/0 group-hover:bg-apple-blue/[0.02] transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart & Checkout */}
      <div className="w-[400px] flex flex-col">
        <div className="bg-white rounded-[40px] border border-gray-200 shadow-2xl flex-1 flex flex-col overflow-hidden">
          <div className="p-8 pb-4">
            <h3 className="text-2xl font-black text-apple-dark-blue flex items-center gap-3">
              <ShoppingCart size={28} className="text-apple-blue" />
              {t.pos.title}
            </h3>
            
            <div className="mt-8 flex flex-col gap-4">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <User size={18} className="text-gray-400" />
                <select 
                  className="bg-transparent flex-1 text-sm font-bold focus:outline-none"
                  value={selectedCustomerId || ''}
                  onChange={e => setSelectedCustomerId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">{t.pos.customer} (Walk-in)</option>
                  {customers?.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-4 space-y-4 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20 border-2 border-dashed border-gray-100 rounded-3xl">
                <ShoppingCart size={48} className="mb-4" />
                <p className="text-sm font-bold px-10">{t.pos.emptySelection}</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.item.id} className="group flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-100 hover:border-apple-blue/20 transition-all shadow-sm">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-apple-dark-blue truncate">{lang === 'en' ? item.item.name : item.item.nameAr}</h4>
                    <p className="text-xs font-black text-apple-blue mt-0.5">{item.item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl">
                    <button onClick={() => updateQty(item.item.id!, -1)} className="w-7 h-7 flex items-center justify-center bg-white rounded-lg border border-gray-200 text-gray-400 hover:text-apple-blue"><Minus size={14} /></button>
                    <span className="w-8 text-center font-black text-apple-dark-blue text-sm">{item.qty}</span>
                    <button onClick={() => updateQty(item.item.id!, 1)} className="w-7 h-7 flex items-center justify-center bg-white rounded-lg border border-gray-200 text-gray-400 hover:text-apple-blue"><Plus size={14} /></button>
                  </div>
                  <button onClick={() => removeFromCart(item.item.id!)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-8 bg-gray-50 border-t border-gray-200">
            <div className="flex flex-col gap-6 mb-6">
              <div className="grid grid-cols-2 gap-2">
                {(['Cash', 'Card', 'Credit', 'Partial'] as const).map(method => (
                  <button 
                    key={method}
                    onClick={() => {
                        setPaymentMethod(method);
                        if (method === 'Partial') setAmountPaid(0);
                    }}
                    className={cn(
                      "px-3 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-center",
                      paymentMethod === method ? "bg-apple-blue text-white shadow-lg shadow-apple-blue/20" : "bg-white text-gray-400 border border-gray-100"
                    )}
                  >
                    {lang === 'en' ? method : (
                        method === 'Cash' ? 'نقداً' : 
                        method === 'Card' ? 'بطاقة' : 
                        method === 'Credit' ? 'آجل' : 'جزئي'
                    )}
                  </button>
                ))}
              </div>

              {paymentMethod === 'Partial' && (
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">{lang === 'en' ? 'Amount Paid' : 'المبلغ المدفوع'}</label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={e => setAmountPaid(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-apple-blue/20 rounded-xl py-2 px-4 text-sm font-black focus:ring-4 focus:ring-apple-blue/5 outline-none transition-all"
                  />
                </div>
              )}
              
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{t.pos.total}</p>
                <p className="text-3xl font-black text-apple-dark-blue">
                  <span className="text-sm mr-1 font-bold text-apple-blue opacity-60">$</span>
                  {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="w-full h-16 rounded-2xl bg-apple-blue text-white font-black uppercase tracking-widest flex items-center justify-center gap-4 shadow-xl shadow-apple-blue/30 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100 transition-all"
            >
              <CreditCard size={24} />
              {t.pos.checkout}
            </button>
          </div>
        </div>
      </div>
      {/* Print Modal & Printer Area */}
      <AnimatePresence>
        {showPrintModal && lastSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm print:hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-[48px] shadow-2xl p-10 text-center"
            >
              <div className="w-20 h-20 bg-green-50 rounded-[32px] flex items-center justify-center text-apple-green mx-auto mb-6">
                <Printer size={40} />
              </div>
              <h2 className="text-3xl font-black text-apple-dark-blue mb-2">{lang === 'en' ? 'Sale Successful!' : 'تم البيع بنجاح!'}</h2>
              <p className="text-apple-gray font-medium mb-8">{lang === 'en' ? 'Would you like to print the invoice now?' : 'هل ترغب في طباعة الفاتورة الآن؟'}</p>
              
              <div className="flex flex-col gap-4">
                <button 
                  onClick={handlePrint}
                  className="w-full h-14 rounded-2xl bg-apple-blue text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-apple-blue/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                >
                  <Printer size={18} />
                  {lang === 'en' ? 'Print Now' : 'اطبع الآن'}
                </button>
                <button 
                  onClick={() => setShowPrintModal(false)}
                  className="w-full h-14 rounded-2xl bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-xs hover:bg-gray-100 transition-all"
                >
                  {lang === 'en' ? 'Close' : 'إغلاق'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {lastSale && <InvoicePrinter sale={lastSale} lang={lang} />}
    </div>
  );
}

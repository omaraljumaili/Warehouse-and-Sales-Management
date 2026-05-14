import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  User, 
  History, 
  Printer, 
  X, 
  Save, 
  ListRestart,
  Percent,
  DollarSign,
  MessageSquare,
  AlertTriangle,
  Coins
} from 'lucide-react';
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
  const settings = useLiveQuery(() => db.settings.get('current'));
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [cart, setCart] = useState<{ item: InventoryItem, qty: number }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Credit' | 'Partial'>('Cash');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'Fixed' | 'Percentage'>('Fixed');
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showSuspended, setShowSuspended] = useState(false);

  const suspendedSales = useLiveQuery(() => db.suspendedSales.toArray());

  const selectedCustomer = useMemo(() => 
    customers?.find(c => c.id === selectedCustomerId),
  [customers, selectedCustomerId]);

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

  const subtotal = useMemo(() => {
    return cart.reduce((acc, curr) => acc + (curr.item.price * curr.qty), 0);
  }, [cart]);

  const total = useMemo(() => {
    const discAmount = discountType === 'Percentage' ? (subtotal * discount / 100) : discount;
    return Math.max(0, subtotal - discAmount);
  }, [subtotal, discount, discountType]);

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    const finalAmountPaid = paymentMethod === 'Cash' || paymentMethod === 'Card' ? total : (paymentMethod === 'Credit' ? 0 : amountPaid);

    const sale: Sale = {
      customerId: selectedCustomerId || undefined,
      date: Date.now(),
      items: cart.map(i => ({
        itemId: i.item.id!,
        name: (lang === 'ar' && i.item.nameAr ? i.item.nameAr : i.item.name),
        quantity: i.qty,
        price: i.item.price,
        total: i.item.price * i.qty
      })),
      totalAmount: total,
      discount: discount,
      discountType: discountType,
      amountPaid: finalAmountPaid,
      paymentMethod: paymentMethod
    };

    try {
      await db.transaction('rw', [db.items, db.sales, db.customers, db.warehouses, db.warehouseStocks], async () => {
        const mainWarehouse = await db.warehouses.where('isMain').equals(1).first();
        
        // Update Inventory
        for (const cartItem of cart) {
          const dbItem = await db.items.get(cartItem.item.id!);
          if (dbItem) {
            await db.items.update(cartItem.item.id!, {
              quantity: dbItem.quantity - cartItem.qty,
              lastUpdated: Date.now()
            });

            if (mainWarehouse) {
                const ws = await db.warehouseStocks.get([cartItem.item.id!, mainWarehouse.id!]);
                if (ws) {
                    await db.warehouseStocks.put({ ...ws, quantity: ws.quantity - cartItem.qty });
                } else {
                    // Create if missing (e.g. for existing items before this feature)
                    await db.warehouseStocks.put({ 
                      itemId: cartItem.item.id!, 
                      warehouseId: mainWarehouse.id!, 
                      quantity: dbItem.quantity - cartItem.qty 
                    });
                }
            }
          }
        }
        
        // Save Sale
        const saleId = await db.sales.add(sale);
        const savedSale = { ...sale, id: saleId as number };
        setLastSale(savedSale);

        // Update Customer stats & Loyalty
        if (selectedCustomerId) {
          const customer = await db.customers.get(selectedCustomerId);
          if (customer) {
            // Earn 1 point for every 10,000 IQD (or 10 USD)
            const pointsEarned = Math.floor(total / (currency === 'د.ع' ? 10000 : 10));
            await db.customers.update(selectedCustomerId, {
              totalSpent: customer.totalSpent + total,
              totalPaid: customer.totalPaid + finalAmountPaid,
              lastVisit: Date.now(),
              loyaltyPoints: (customer.loyaltyPoints || 0) + pointsEarned
            });
          }
        }
      });
      setCart([]);
      setSelectedCustomerId(null);
      setAmountPaid(0);
      setDiscount(0);
      setShowPrintModal(true);
    } catch (err) {
      console.error(err);
      alert(t.pos.checkoutFailed);
    }
  };

  const handleSuspend = async () => {
    if (cart.length === 0) return;
    await db.suspendedSales.add({
      date: Date.now(),
      customerId: selectedCustomerId || undefined,
      cart: cart,
      total: total,
      discount: discount,
      discountType: discountType
    });
    setCart([]);
    setSelectedCustomerId(null);
    setDiscount(0);
  };

  const resumeSale = async (s: any) => {
    setCart(s.cart);
    setSelectedCustomerId(s.customerId || null);
    setDiscount(s.discount || 0);
    setDiscountType(s.discountType || 'Fixed');
    await db.suspendedSales.delete(s.id);
    setShowSuspended(false);
  };

  const shareViaWhatsApp = () => {
    if (!lastSale) return;
    const itemsText = lastSale.items.map(i => `• ${i.name} x${i.qty} = ${formatCurrency(i.total)}`).join('\n');
    const message = `*${settings?.companyName || 'SmartFlow Order'}*\n\n` +
      `Order: #${lastSale.id}\n` +
      `Date: ${new Date(lastSale.date).toLocaleDateString()}\n\n` +
      `${itemsText}\n\n` +
      `*Total: ${formatCurrency(lastSale.totalAmount)}*\n` +
      `Method: ${lastSale.paymentMethod}\n\n` +
      `Thank you for your business!`;
    
    const encoded = encodeURIComponent(message);
    const phone = selectedCustomer?.phone?.replace(/\D/g, '');
    window.open(`https://wa.me/${phone ? phone : ''}?text=${encoded}`, '_blank');
  };

  const currency = settings?.currency || 'د.ع';

  const formatCurrency = (val: number, forceUsd = false) => {
    const isUsd = forceUsd || currency === '$';
    const formatted = val.toLocaleString(undefined, { 
      minimumFractionDigits: isUsd ? 2 : 0,
      maximumFractionDigits: isUsd ? 2 : 0 
    });
    return lang === 'ar' ? `${formatted} ${isUsd ? '$' : currency}` : `${isUsd ? '$' : currency}${formatted}`;
  };

  const handlePrint = () => {
    window.focus();
    setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.error("Print failed:", err);
      }
    }, 250);
  };

  return (
    <div className="flex flex-col xl:flex-row h-full gap-6 overflow-y-auto xl:overflow-hidden pb-10 xl:pb-0">
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
              {t.pos.availableStock}
            </h3>
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => setShowSuspended(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-apple-bg text-apple-blue text-[10px] font-black uppercase tracking-widest hover:bg-apple-blue hover:text-white transition-all relative"
                >
                    <ListRestart size={14} />
                    {lang === 'ar' ? 'الطلبات المعلقة' : 'Parked'}
                    {suspendedSales && suspendedSales.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full border-2 border-white">
                            {suspendedSales.length}
                        </span>
                    )}
                </button>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{filteredItems.length} {t.pos.results}</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-3 gap-4 custom-scrollbar">
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
                    {item.quantity} {t.pos.qty}
                  </span>
                  <span className="text-sm font-black text-apple-blue">{formatCurrency(item.price)}</span>
                </div>
                <div>
                  <h4 className="font-bold text-apple-dark-blue truncate">{(lang === 'ar' && item.nameAr) ? item.nameAr : item.name}</h4>
                  <p className="text-[10px] text-gray-400 truncate">{(lang === 'ar' && item.nameAr) ? item.name : item.nameAr}</p>
                </div>
                <div className="absolute inset-0 bg-apple-blue/0 group-hover:bg-apple-blue/[0.02] transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full xl:w-[400px] flex flex-col shrink-0">
        <div className="bg-white rounded-[40px] border border-gray-200 shadow-2xl flex-1 flex flex-col overflow-hidden min-h-[500px]">
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
                  <option value="">{t.pos.customer} ({t.pos.walkIn})</option>
                  {customers?.map(c => (
                    <option key={c.id} value={c.id}>{lang === 'ar' && c.nameAr ? c.nameAr : c.name}</option>
                  ))}
                </select>
              </div>

              {selectedCustomer && (
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase text-apple-blue">
                    <Coins size={12} />
                    {selectedCustomer.loyaltyPoints || 0} Points
                  </div>
                  {(selectedCustomer.totalSpent - selectedCustomer.totalPaid) > 0 && (
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-red-500">
                      <AlertTriangle size={12} />
                      Debt: {formatCurrency(selectedCustomer.totalSpent - selectedCustomer.totalPaid)}
                    </div>
                  )}
                </div>
              )}
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
                    <h4 className="font-bold text-sm text-apple-dark-blue truncate">{(lang === 'ar' && item.item.nameAr) ? item.item.nameAr : item.item.name}</h4>
                    <p className="text-xs font-black text-apple-blue mt-0.5">{formatCurrency(item.item.price)}</p>
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
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {discountType === 'Percentage' ? <Percent size={14} /> : <Coins size={14} />}
                    </div>
                    <input 
                      type="number"
                      value={discount || ''}
                      onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                      placeholder={t.pos.discount}
                      className="w-full bg-white border border-gray-200 rounded-xl py-2 pl-9 pr-4 text-xs font-bold focus:ring-4 focus:ring-apple-blue/5 outline-none"
                    />
                  </div>
                  <button 
                    onClick={() => setDiscountType(prev => prev === 'Fixed' ? 'Percentage' : 'Fixed')}
                    className="p-2 bg-white border border-gray-200 rounded-xl text-apple-blue"
                  >
                    {discountType === 'Fixed' ? <DollarSign size={16} /> : <Percent size={16} />}
                  </button>
                </div>
              </div>

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
                    {method === 'Cash' ? t.pos.cash : 
                     method === 'Card' ? t.pos.card : 
                     method === 'Credit' ? t.pos.credit : t.pos.partial}
                  </button>
                ))}
              </div>

              {paymentMethod === 'Partial' && (
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">{t.pos.amountPaid}</label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={e => setAmountPaid(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-apple-blue/20 rounded-xl py-2 px-4 text-sm font-black focus:ring-4 focus:ring-apple-blue/5 outline-none transition-all"
                  />
                </div>
              )}
              
              <div className="flex items-end justify-between">
                {settings?.usdExchangeRate && (
                  <div className="text-left">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Approx. USD</p>
                    <p className="text-lg font-black text-apple-blue">
                      {formatCurrency(total / settings.usdExchangeRate, true)}
                    </p>
                  </div>
                )}
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{t.pos.total}</p>
                  <p className="text-3xl font-black text-apple-dark-blue">
                    {formatCurrency(total)}
                  </p>
                </div>
              </div>
            </div>

            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="w-full h-16 rounded-2xl bg-apple-blue text-white font-black uppercase tracking-widest flex items-center justify-center gap-4 shadow-xl shadow-apple-blue/30 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100 transition-all mb-4"
            >
              <CreditCard size={24} />
              {t.pos.checkout}
            </button>

            <button 
              onClick={() => {
                if(cart.length > 0) handleSuspend();
                else setShowSuspended(true);
              }}
              className="w-full h-12 rounded-xl bg-white border border-gray-200 text-apple-gray font-black uppercase tracking-widest flex items-center justify-center gap-3 text-[10px] hover:bg-gray-50 transition-all"
            >
              {cart.length > 0 ? <Save size={16} /> : <ListRestart size={16} />}
              {cart.length > 0 ? (lang === 'ar' ? 'تعليق الطلب' : 'Park Order') : (lang === 'ar' ? 'الطلبات المعلقة' : 'Suspended List')}
            </button>
          </div>
        </div>
      </div>

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
              <h2 className="text-3xl font-black text-apple-dark-blue mb-2">{t.pos.saleSuccess}</h2>
              <p className="text-apple-gray font-medium mb-8">{t.pos.printPrompt}</p>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={handlePrint}
                  className="h-14 rounded-2xl bg-apple-blue text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-apple-blue/20 hover:scale-[1.02] active:scale-100 transition-all flex items-center justify-center gap-2"
                >
                  <Printer size={16} />
                  {t.pos.printNow}
                </button>
                <button 
                  onClick={shareViaWhatsApp}
                  className="h-14 rounded-2xl bg-green-500 text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-green-500/20 hover:scale-[1.02] active:scale-100 transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare size={16} />
                  WhatsApp
                </button>
                <button 
                  onClick={() => setShowPrintModal(false)}
                  className="col-span-2 h-14 rounded-2xl bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[10px] hover:bg-gray-100 transition-all"
                >
                  {t.pos.close}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {lastSale && <InvoicePrinter sale={lastSale} lang={lang} t={t} settings={settings} />}

      <AnimatePresence>
        {showSuspended && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl p-10"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-apple-dark-blue">{lang === 'ar' ? 'الطلبات المعلقة' : 'Parked Orders'}</h2>
                <button onClick={() => setShowSuspended(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                {suspendedSales?.map(s => (
                  <button 
                    key={s.id}
                    onClick={() => resumeSale(s)}
                    className="w-full p-6 rounded-3xl bg-gray-50 border border-gray-100 flex items-center justify-between hover:border-apple-blue/30 transition-all text-right"
                  >
                    <div>
                      <p className="font-bold text-apple-dark-blue">#{s.id} • {s.cart.length} {t.crm.itemsCount}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{new Date(s.date).toLocaleTimeString()}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-lg font-black text-apple-blue">{formatCurrency(s.total)}</p>
                      <p className="text-[10px] text-apple-green font-black uppercase tracking-widest">Resume</p>
                    </div>
                  </button>
                ))}
                {(!suspendedSales || suspendedSales.length === 0) && (
                   <div className="text-center py-20 text-gray-300">
                      <History size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No parked orders</p>
                   </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, PackagePlus, Truck, FileText, Plus, Save, Trash2 } from 'lucide-react';
import { db } from '../db';
import type { Language, InventoryItem, Supplier, Purchase } from '../types';
import { cn } from '../lib/utils';

interface PurchasesViewProps {
  lang: Language;
  t: any;
}

export function PurchasesView({ lang, t }: PurchasesViewProps) {
  const items = useLiveQuery(() => db.items.toArray());
  const suppliers = useLiveQuery(() => db.suppliers.toArray());
  const settings = useLiveQuery(() => db.settings.get('current'));
  const currency = settings?.currency || 'د.ع';

  const formatCurrency = (val: number) => {
    const formatted = val.toLocaleString(undefined, { 
      minimumFractionDigits: currency === 'د.ع' ? 0 : 2,
      maximumFractionDigits: currency === 'د.ع' ? 0 : 2 
    });
    return lang === 'ar' ? `${formatted} ${currency}` : `${currency}${formatted}`;
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [orderItems, setOrderItems] = useState<{ itemId: number, name: string, quantity: number, costPrice: number }[]>([]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    const search = searchQuery.toLowerCase();
    return items.filter(i => 
      i.name.toLowerCase().includes(search) || 
      i.nameAr.toLowerCase().includes(search) || 
      i.barcode?.includes(search)
    );
  }, [items, searchQuery]);

  const addItemToOrder = (item: InventoryItem) => {
    setOrderItems(prev => {
      const existing = prev.find(i => i.itemId === item.id);
      if (existing) return prev;
      return [...prev, { itemId: item.id!, name: (lang === 'ar' && item.nameAr ? item.nameAr : item.name), quantity: 1, costPrice: item.costPrice || (item.price * 0.6) }];
    });
  };

  const updateItem = (id: number, field: 'quantity' | 'costPrice', val: number) => {
    setOrderItems(prev => prev.map(i => i.itemId === id ? { ...i, [field]: val } : i));
  };

  const removeItem = (id: number) => {
    setOrderItems(prev => prev.filter(i => i.itemId !== id));
  };

  const total = useMemo(() => {
    return orderItems.reduce((acc, curr) => acc + (curr.costPrice * curr.quantity), 0);
  }, [orderItems]);

  const handleSavePurchase = async () => {
    if (orderItems.length === 0 || !invoiceNumber) {
      alert(tp.validationError);
      return;
    }

    const purchase: Purchase = {
      supplierId: selectedSupplierId || undefined,
      date: Date.now(),
      invoiceNumber,
      items: orderItems.map(i => ({ ...i, total: i.costPrice * i.quantity })),
      totalAmount: total,
      status: 'Received'
    };

    try {
      await db.transaction('rw', [db.items, db.purchases, db.warehouses, db.warehouseStocks], async () => {
        const mainWarehouse = await db.warehouses.where('isMain').equals(1).first();
        
        for (const orderItem of orderItems) {
          const dbItem = await db.items.get(orderItem.itemId);
          if (dbItem) {
            const newQty = dbItem.quantity + orderItem.quantity;
            await db.items.update(orderItem.itemId, {
              quantity: newQty,
              costPrice: orderItem.costPrice, // Update cost price as well if changed
              lastUpdated: Date.now()
            });

            if (mainWarehouse) {
              const ws = await db.warehouseStocks.get([orderItem.itemId, mainWarehouse.id!]);
              if (ws) {
                await db.warehouseStocks.put({ ...ws, quantity: ws.quantity + orderItem.quantity });
              } else {
                await db.warehouseStocks.put({ 
                  itemId: orderItem.itemId, 
                  warehouseId: mainWarehouse.id!, 
                  quantity: newQty 
                });
              }
            }
          }
        }
        await db.purchases.add(purchase);
      });
      setOrderItems([]);
      setInvoiceNumber('');
      setSelectedSupplierId(null);
      alert(tp.saveSuccess);
    } catch (err) {
      console.error(err);
      alert('Error saving purchase');
    }
  };

  const tp = t.purchases;

  return (
    <div className="flex flex-col xl:flex-row h-full gap-8 overflow-y-auto xl:overflow-hidden pb-10 xl:pb-0">
      {/* Search & Stock Table */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-black text-apple-dark-blue flex items-center gap-3">
              <PackagePlus size={32} className="text-apple-blue" />
              {tp.title}
            </h2>
            <p className="text-sm text-apple-gray font-medium mt-1">{tp.subtitle}</p>
          </div>
        </div>

        <div className="bg-white rounded-[40px] border border-gray-200 shadow-xl flex-1 flex flex-col overflow-hidden">
          <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row gap-4 items-center">
             <div className="relative flex-1 group">
                <input
                  type="text"
                  placeholder={tp.searchItems}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-12 text-sm focus:outline-none focus:ring-4 focus:ring-apple-blue/10 transition-all font-medium"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-apple-blue" size={18} />
             </div>
             
             <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 flex-1 md:flex-none">
                  <Truck size={18} className="text-apple-blue" />
                  <select 
                    className="bg-transparent border-none text-sm font-bold focus:outline-none min-w-[150px]"
                    value={selectedSupplierId || ''}
                    onChange={e => setSelectedSupplierId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">{t.purchases.supplier}</option>
                    {suppliers?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 flex-1 md:flex-none">
                  <FileText size={18} className="text-apple-blue" />
                  <input
                    type="text"
                    placeholder={t.purchases.invoice}
                    value={invoiceNumber}
                    onChange={e => setInvoiceNumber(e.target.value)}
                    className="bg-transparent border-none text-sm font-bold focus:outline-none w-24"
                  />
                </div>
             </div>
          </div>

          <div className="flex-1 overflow-x-auto custom-scrollbar">
            {orderItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-apple-bg rounded-full flex items-center justify-center text-gray-300 mb-4 ring-1 ring-gray-100">
                  <PackagePlus size={40} />
                </div>
                <h3 className="font-bold text-apple-dark-blue">{tp.startEntry}</h3>
                <p className="text-xs text-gray-400 mt-1">{tp.addInstruction}</p>
              </div>
            ) : (
              <div className="min-w-[600px]">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 sticky top-0 z-10">
                    <tr className="text-[10px] uppercase tracking-widest text-gray-400 font-black">
                      <th className={cn("px-8 py-4", lang === 'ar' && "text-right")}>{tp.itemCol}</th>
                      <th className={cn("px-8 py-4", lang === 'ar' && "text-right")}>{tp.costCol}</th>
                      <th className={cn("px-8 py-4", lang === 'ar' && "text-right")}>{tp.qtyCol}</th>
                      <th className={cn("px-8 py-4", lang === 'ar' && "text-right")}>{tp.totalCol}</th>
                      <th className="px-8 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orderItems.map(item => (
                      <tr key={item.itemId} className="group hover:bg-gray-50/50 transition-colors">
                        <td className={cn("px-8 py-6 font-bold text-apple-dark-blue", lang === 'ar' && "text-right")}>{item.name}</td>
                        <td className="px-8 py-6">
                          <input
                            type="number"
                            value={item.costPrice}
                            onChange={e => updateItem(item.itemId, 'costPrice', Number(e.target.value))}
                            className={cn("w-20 bg-white border border-gray-200 rounded-lg py-1.5 px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-apple-blue/20", lang === 'ar' && "text-right")}
                          />
                        </td>
                        <td className="px-8 py-6">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={e => updateItem(item.itemId, 'quantity', Number(e.target.value))}
                            className={cn("w-20 bg-white border border-gray-200 rounded-lg py-1.5 px-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-apple-blue/20", lang === 'ar' && "text-right")}
                          />
                        </td>
                        <td className={cn("px-8 py-6 font-black text-apple-blue", lang === 'ar' && "text-right")}>
                          {formatCurrency(item.costPrice * item.quantity)}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button onClick={() => removeItem(item.itemId)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="p-8 bg-apple-dark-blue flex items-center justify-between text-white">
            <div>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">{tp.grandTotal}</p>
              <p className="text-4xl font-black">{formatCurrency(total)}</p>
            </div>
            <button 
              onClick={handleSavePurchase}
              disabled={orderItems.length === 0}
              className="px-10 h-16 rounded-2xl bg-apple-blue text-white font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl shadow-black/20 hover:scale-[1.03] active:scale-95 disabled:opacity-40 transition-all"
            >
              <Save size={24} />
              {tp.addStock}
            </button>
          </div>
        </div>
      </div>

      {/* Suggested Items Sider */}
      <div className="w-full xl:w-80 flex flex-col gap-6 shrink-0">
        <div className="bg-white rounded-[32px] border border-gray-200 p-6 flex-1 flex flex-col overflow-hidden min-h-[300px]">
          <h3 className="font-black text-apple-dark-blue flex items-center gap-2 mb-6">
            <Plus size={18} className="text-apple-blue" />
            {tp.quickAdd}
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
            {filteredItems.slice(0, 15).map(item => (
              <button 
                key={item.id}
                onClick={() => addItemToOrder(item)}
                className="w-full p-4 rounded-2xl border border-gray-50 bg-gray-50/50 hover:bg-white hover:border-apple-blue hover:shadow-lg transition-all text-right group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-apple-blue shadow-sm group-hover:scale-110 transition-transform">
                    <Plus size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-apple-dark-blue text-xs truncate">{(lang === 'ar' && item.nameAr) ? item.nameAr : item.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{t.quantity}: {item.quantity}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Language, TranslationStrings, Warehouse, StockTransfer } from '../types';
import { cn } from '../lib/utils';
import { 
  Building2, 
  ArrowRightLeft, 
  Plus, 
  ChevronRight, 
  ChevronLeft,
  Calendar,
  Package,
  History,
  CheckCircle2,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WarehousesViewProps {
  lang: Language;
  t: TranslationStrings;
}

export function WarehousesView({ lang, t }: WarehousesViewProps) {
  const [activeTab, setActiveTab] = useState<'Inventory' | 'Transfers'>('Inventory');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);

  const warehouses = useLiveQuery(() => db.warehouses.toArray());
  const transfers = useLiveQuery(() => db.stockTransfers.toArray());
  const items = useLiveQuery(() => db.items.toArray());
  const warehouseStocks = useLiveQuery(() => db.warehouseStocks.toArray());
  
  const isAr = lang === 'ar';
  const tw = t.warehouses;

  const handleDeleteWarehouse = async (id: number) => {
    if (confirm(isAr ? 'هل أنت متأكد من حذف هذا المستودع؟ سيتم فقدان سجلات المخزون المرتبطة به.' : 'Are you sure you want to delete this warehouse? Associated stock records will be lost.')) {
      await db.warehouses.delete(id);
      // Also delete stocks associated with this warehouse
      await db.warehouseStocks.where('warehouseId').equals(id).delete();
      if (selectedWarehouseId === id) {
        setSelectedWarehouseId(null);
      }
    }
  };

  const currentWarehouseStocks = useMemo(() => {
    if (!warehouseStocks || !warehouses || selectedWarehouseId === null) return [];
    
    const stocks = warehouseStocks.filter(ws => ws.warehouseId === selectedWarehouseId);
    
    // Fallback for Main Warehouse: if no stock records exist but we have items,
    // it means they haven't been synced yet (old data).
    const isMain = warehouses.find(w => w.id === selectedWarehouseId)?.isMain;
    if (isMain && stocks.length === 0 && items && items.length > 0) {
      return items.map(item => ({
        itemId: item.id!,
        warehouseId: selectedWarehouseId,
        quantity: item.quantity
      }));
    }
    
    return stocks;
  }, [warehouseStocks, warehouses, selectedWarehouseId, items]);

  // Find main warehouse to select by default
  React.useEffect(() => {
    if (warehouses && warehouses.length > 0 && selectedWarehouseId === null) {
      const main = warehouses.find(w => w.isMain);
      if (main) setSelectedWarehouseId(main.id!);
    }
  }, [warehouses]);

  const handleAddWarehouse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const nameAr = formData.get('nameAr') as string;
    
    if (name) {
      await db.warehouses.add({
        name,
        nameAr,
        isMain: false
      });
      setShowAddWarehouse(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h2 className="text-4xl font-black text-apple-dark-blue tracking-tighter">{tw.title}</h2>
          <div className="flex items-center gap-2 mt-2">
            <Building2 size={16} className="text-apple-blue" />
            <p className="text-apple-gray font-bold text-[11px] uppercase tracking-widest">Multi-Warehouse Management</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
            <button 
                onClick={() => setShowTransferModal(true)}
                className="h-10 px-6 rounded-full bg-apple-green text-white text-[13px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-apple-green/20 hover:scale-[1.03] active:scale-95 transition-all"
            >
                <ArrowRightLeft size={18} />
                <span>{tw.transfer}</span>
            </button>
            <button 
                onClick={() => setShowAddWarehouse(true)}
                className="h-10 px-6 rounded-full bg-apple-blue text-white text-[13px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-apple-blue/20 hover:scale-[1.03] active:scale-95 transition-all"
            >
                <Plus size={18} />
                <span>{tw.addWarehouse}</span>
            </button>
        </div>
      </div>

      <div className="flex gap-4 mb-8 p-1 bg-white rounded-2xl border border-gray-100 w-fit">
        <button 
          onClick={() => setActiveTab('Inventory')}
          className={cn(
            "px-8 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
            activeTab === 'Inventory' ? "bg-apple-dark-blue text-white shadow-lg shadow-apple-dark-blue/20" : "text-gray-400 hover:text-apple-dark-blue"
          )}
        >
          {tw.stock}
        </button>
        <button 
          onClick={() => setActiveTab('Transfers')}
          className={cn(
            "px-8 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
            activeTab === 'Transfers' ? "bg-apple-dark-blue text-white shadow-lg shadow-apple-dark-blue/20" : "text-gray-400 hover:text-apple-dark-blue"
          )}
        >
          {tw.history}
        </button>
      </div>

      {activeTab === 'Inventory' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar List */}
            <div className="lg:col-span-1 space-y-3">
                {warehouses?.map(w => (
                    <div key={w.id} className="relative group">
                        <button 
                            onClick={() => setSelectedWarehouseId(w.id!)}
                            className={cn(
                                "w-full p-4 rounded-3xl border transition-all text-right flex items-center justify-between",
                                selectedWarehouseId === w.id 
                                    ? "bg-apple-blue border-apple-blue text-white shadow-xl shadow-apple-blue/10" 
                                    : "bg-white border-gray-100 text-apple-dark-blue hover:border-apple-blue/30"
                            )}
                        >
                            <div className="text-right">
                                <p className="font-black text-sm">{isAr ? w.nameAr : w.name}</p>
                                <p className={cn("text-[10px] font-bold uppercase tracking-widest mt-1", selectedWarehouseId === w.id ? "text-white/60" : "text-gray-400")}>
                                    {w.isMain ? tw.main : "Sub Warehouse"}
                                </p>
                            </div>
                            {isAr ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteWarehouse(w.id!); }}
                            className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 z-10"
                            title="Delete Warehouse"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Inventory List */}
            <div className="lg:col-span-3">
                <div className="bg-white rounded-[48px] border border-gray-100 shadow-sm p-8">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-bold text-apple-dark-blue">{tw.items}</h3>
                        <div className="px-4 py-1.5 bg-apple-bg rounded-xl text-[10px] font-black text-apple-blue uppercase tracking-widest">
                            {items?.length || 0} TOTAL SITES
                        </div>
                    </div>

                    <div className="space-y-4">
                        {currentWarehouseStocks.map(ws => {
                            const item = items?.find(i => i.id === ws.itemId);
                            if (!item) return null;
                            return (
                                <div key={ws.itemId} className="flex items-center justify-between p-4 rounded-3xl hover:bg-gray-50 transition-colors group">
                                    <div className="flex items-center gap-4 text-right">
                                        <div className="w-12 h-12 bg-apple-bg rounded-2xl flex items-center justify-center text-apple-blue">
                                            <Package size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-apple-dark-blue">{isAr ? item.nameAr : item.name}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{item.barcode || 'NO BARCODE'}</p>
                                        </div>
                                    </div>
                                    <div className="text-left font-rubik">
                                        <p className="text-lg font-black text-apple-blue">{ws.quantity}</p>
                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">In Stock</p>
                                    </div>
                                </div>
                            );
                        })}
                        {currentWarehouseStocks.length === 0 && (
                            <div className="text-center py-20 text-gray-300">
                                <Package size={48} className="mx-auto mb-4 opacity-20" />
                                <p className="font-bold uppercase tracking-widest text-[10px]">No items in this warehouse</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      ) : (
        <div className="bg-white rounded-[48px] border border-gray-100 shadow-sm p-8">
             <div className="space-y-4">
                {transfers?.slice().reverse().map(transfer => {
                    const fromW = warehouses?.find(w => w.id === transfer.fromWarehouseId);
                    const toW = warehouses?.find(w => w.id === transfer.toWarehouseId);
                    
                    return (
                        <div key={transfer.id} className="flex items-center justify-between p-6 rounded-3xl bg-gray-50 border border-gray-100">
                            <div className="flex items-center gap-8">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-apple-blue shadow-sm">
                                    <ArrowRightLeft size={20} />
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{tw.from}</p>
                                        <p className="font-bold text-apple-dark-blue">{fromW ? (isAr ? fromW.nameAr : fromW.name) : '???'}</p>
                                    </div>
                                    <ChevronRight className={cn("text-gray-300", isAr && "rotate-180")} size={20} />
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{tw.to}</p>
                                        <p className="font-bold text-apple-dark-blue">{toW ? (isAr ? toW.nameAr : toW.name) : '???'}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-left">
                                <div className="flex items-center gap-2 mb-1 justify-end">
                                    <Calendar size={14} className="text-gray-400" />
                                    <p className="text-sm font-bold text-apple-dark-blue">{new Date(transfer.date).toLocaleDateString()}</p>
                                </div>
                                <p className="text-[10px] text-apple-blue font-black uppercase tracking-widest">
                                    {transfer.items.length} {tw.items} • {transfer.status}
                                </p>
                            </div>
                        </div>
                    );
                })}
                {(!transfers || transfers.length === 0) && (
                    <div className="text-center py-20 text-gray-300">
                        <History size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="font-bold uppercase tracking-widest text-[10px]">No transfers recorded</p>
                    </div>
                )}
             </div>
        </div>
      )}

      {/* Add Warehouse Modal */}
      <AnimatePresence>
        {showAddWarehouse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl p-10 relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8 relative">
                <h2 className="text-2xl font-black text-apple-dark-blue">{tw.addWarehouse}</h2>
                <button onClick={() => setShowAddWarehouse(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <Plus className="rotate-45 text-gray-400" size={24} />
                </button>
              </div>

              <form onSubmit={handleAddWarehouse} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Warehouse Name (English)</label>
                  <input name="name" required className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-apple-blue/10 transition-all font-rubik" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">الاسم بالعربية</label>
                  <input name="nameAr" required className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-apple-blue/10 transition-all font-rubik text-right" />
                </div>
                <button type="submit" className="w-full py-5 rounded-2xl bg-apple-blue text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-apple-blue/20 hover:scale-[1.02] active:scale-95 transition-all">
                  Create Warehouse
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transfer Modal */}
      <AnimatePresence>
        {showTransferModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl p-10 relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8 relative">
                <h2 className="text-2xl font-black text-apple-dark-blue">{tw.transfer}</h2>
                <button onClick={() => setShowTransferModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <Plus className="rotate-45 text-gray-400" size={24} />
                </button>
              </div>

              <form 
                onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const fromId = parseInt(formData.get('fromWarehouseId') as string);
                    const toId = parseInt(formData.get('toWarehouseId') as string);
                    const itemId = parseInt(formData.get('itemId') as string);
                    const qty = parseInt(formData.get('quantity') as string);

                    if (fromId !== toId && itemId && qty > 0) {
                        await db.transaction('rw', [db.stockTransfers, db.warehouseStocks], async () => {
                            await db.stockTransfers.add({
                                fromWarehouseId: fromId,
                                toWarehouseId: toId,
                                date: Date.now(),
                                items: [{ itemId, quantity: qty }],
                                status: 'Completed'
                            });
                            
                            // Update stocks
                            const fromStock = await db.warehouseStocks.get([itemId, fromId]);
                            const toStock = await db.warehouseStocks.get([itemId, toId]);

                            if (fromStock) {
                                await db.warehouseStocks.put({ ...fromStock, quantity: fromStock.quantity - qty });
                            } else {
                                // If fromStock doesn't exist, we can't really transfer, but for safety:
                                await db.warehouseStocks.put({ itemId, warehouseId: fromId, quantity: -qty });
                            }

                            if (toStock) {
                                await db.warehouseStocks.put({ ...toStock, quantity: toStock.quantity + qty });
                            } else {
                                await db.warehouseStocks.put({ itemId, warehouseId: toId, quantity: qty });
                            }
                        });
                        setShowTransferModal(false);
                    }
                }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{tw.from}</label>
                        <select name="fromWarehouseId" className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none">
                            {warehouses?.map(w => <option key={w.id} value={w.id}>{isAr ? w.nameAr : w.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{tw.to}</label>
                        <select name="toWarehouseId" className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none">
                            {warehouses?.map(w => <option key={w.id} value={w.id}>{isAr ? w.nameAr : w.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{tw.items}</label>
                    <select name="itemId" className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none">
                        {items?.map(i => <option key={i.id} value={i.id}>{isAr ? i.nameAr : i.name}</option>)}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t.quantity}</label>
                    <input type="number" name="quantity" required className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none" />
                </div>

                <button type="submit" className="w-full py-5 rounded-2xl bg-apple-green text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-apple-green/20 hover:scale-[1.02] active:scale-95 transition-all">
                  Confirm Transfer
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

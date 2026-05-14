/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { ItemCard } from './components/ItemCard';
import { AddItemModal } from './components/AddItemModal';
import { BarcodeScanner } from './components/BarcodeScanner';
import { POSView } from './components/POSView';
import { PurchasesView } from './components/PurchasesView';
import { WarehousesView } from './components/WarehousesView';
import { CashBoxView } from './components/CashBoxView';
import { MasterDataView } from './components/MasterDataView';
import { CRMView } from './components/CRMView';
import { ReportsView } from './components/ReportsView';
import { SalesView } from './components/SalesView';
import { ExpensesView } from './components/ExpensesView';
import { SettingsView } from './components/SettingsView';
import { translations } from './translations';
import type { Language, Category, InventoryItem, View } from './types';
import { cn } from './lib/utils';
import { 
  Zap, 
  Globe, 
  Users, 
  Package, 
  Search, 
  Scan, 
  Plus, 
  TrendingDown, 
  AlertCircle, 
  LayoutGrid,
  ShoppingCart,
  Receipt,
  Truck,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  BarChart3,
  Settings,
  ShoppingBag,
  History,
  Building2,
  Lock,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [lang, setLang] = useState<Language>('ar');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'All'>('All');
  const [showArchived, setShowArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Low' | 'Out'>('All');
  const [manufacturerFilter, setManufacturerFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'price' | 'lastUpdated'>('lastUpdated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentView, setCurrentView] = useState<View>('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Sync dir attribute
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const items = useLiveQuery(() => db.items.toArray());
  const sales = useLiveQuery(() => db.sales.toArray());
  const expenses = useLiveQuery(() => db.expenses.toArray());
  const categoriesList = useLiveQuery(() => db.categories.toArray());
  const settings = useLiveQuery(() => db.settings.get('current'));
  const currency = settings?.currency || 'د.ع';
  
  const formatCurrency = (val: number) => {
    const formatted = val.toLocaleString(undefined, { 
      minimumFractionDigits: currency === 'د.ع' ? 0 : 2,
      maximumFractionDigits: currency === 'د.ع' ? 0 : 2 
    });
    return lang === 'ar' ? `${formatted} ${currency}` : `${currency}${formatted}`;
  };
  const categoriesMap = useMemo(() => {
    const map: Record<number, { name: string, nameAr: string }> = {};
    categoriesList?.forEach((c: any) => {
      if (c.id) map[c.id] = { name: c.name, nameAr: c.nameAr };
    });
    return map;
  }, [categoriesList]);

  const t = translations[lang];

  const filteredItems = useMemo(() => {
    if (!items) return [];
    let result = [...items].filter(item => {
      const search = searchQuery.toLowerCase();
      const matchesSearch = 
        item.name.toLowerCase().includes(search) ||
        item.nameAr.toLowerCase().includes(search) ||
        item.barcode?.toLowerCase().includes(search) ||
        item.manufacturer?.toLowerCase().includes(search) ||
        item.supplier?.toLowerCase().includes(search);
      
      const matchesCategory = selectedCategoryId === 'All' || item.categoryId === selectedCategoryId;
      
      const matchesStatus = 
        statusFilter === 'All' ? true :
        statusFilter === 'Low' ? (item.quantity > 0 && item.quantity <= item.minQuantity) :
        statusFilter === 'Out' ? item.quantity <= 0 : true;

      const matchesManufacturer = manufacturerFilter === 'All' || item.manufacturer === manufacturerFilter;

      const matchesArchived = showArchived ? item.archived === true : !item.archived;

      return matchesSearch && matchesCategory && matchesStatus && matchesManufacturer && matchesArchived;
    });

    // Handle sorting
    result.sort((a, b) => {
      let valA: any = a[sortBy];
      let valB: any = b[sortBy];
      
      if (sortBy === 'name' && lang === 'ar') {
        valA = a.nameAr;
        valB = b.nameAr;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [items, searchQuery, selectedCategoryId, statusFilter, manufacturerFilter, showArchived, sortBy, sortOrder, lang]);

  const stats = useMemo(() => {
    if (!items || !sales) return { total: 0, low: 0, out: 0, revenue: 0, profit: 0, totalExpenses: 0 };
    const totalItems = items.length;
    const lowStock = items.filter(i => i.quantity > 0 && i.quantity <= i.minQuantity).length;
    const outOfStock = items.filter(i => i.quantity <= 0).length;
    
    const revenue = sales.reduce((acc, curr) => acc + curr.totalAmount, 0);
    const totalExpenses = expenses?.reduce((acc, curr) => acc + curr.amount, 0) || 0;

    // Simple profit calculation if cost is available
    const grossProfit = sales.reduce((acc, curr) => {
        return acc + curr.items.reduce((sAcc, sCurr) => {
            const item = items.find(i => i.id === sCurr.itemId);
            const cost = item?.costPrice || 0;
            return sAcc + (sCurr.price - cost) * sCurr.quantity;
        }, 0);
    }, 0);

    const netProfit = grossProfit - totalExpenses;

    return { total: totalItems, low: lowStock, out: outOfStock, revenue, profit: netProfit, totalExpenses };
  }, [items, sales, expenses]);

  if (items === undefined) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-apple-bg flex-col gap-4">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-apple-blue border-t-transparent rounded-full"
        />
        <p className="text-apple-dark-blue font-bold animate-pulse text-sm uppercase tracking-widest">
          {t.loading}
        </p>
      </div>
    );
  }

  const handleUpdateQuantity = async (id: number, delta: number) => {
    const item = await db.items.get(id);
    if (item) {
      const newQty = Math.max(0, item.quantity + delta);
      await db.items.update(id, {
        quantity: newQty,
        lastUpdated: Date.now()
      });

      // Also update main warehouse stock for consistency in this simplified model
      const mainWarehouse = await db.warehouses.where('isMain').equals(1).first();
      if (mainWarehouse) {
        const ws = await db.warehouseStocks.get([id, mainWarehouse.id!]);
        if (ws) {
            await db.warehouseStocks.put({ ...ws, quantity: Math.max(0, ws.quantity + delta) });
        } else {
            await db.warehouseStocks.put({ itemId: id, warehouseId: mainWarehouse.id!, quantity: newQty });
        }
      }
    }
  };

  const handleAddItem = async (itemData: any) => {
    if (itemData.id) {
        await db.items.update(itemData.id, {
            ...itemData,
            lastUpdated: Date.now()
        });
    } else {
        const id = await db.items.add({
            ...itemData,
            lastUpdated: Date.now()
        });

        // Add to main warehouse stock
        const mainWarehouse = await db.warehouses.where('isMain').equals(1).first();
        if (mainWarehouse) {
            await db.warehouseStocks.add({
                itemId: id as number,
                warehouseId: mainWarehouse.id!,
                quantity: itemData.quantity
            });
        }
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (confirm(t.crm.confirmDelete)) {
      await db.items.delete(id);
    }
  };

  const handleArchiveItem = async (id: number, archived: boolean) => {
    await db.items.update(id, { archived });
  };

  return (
    <div className="flex h-screen overflow-hidden font-rubik text-right bg-apple-bg" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 z-50 bg-white border-gray-200 flex flex-col transition-all duration-500 shadow-2xl select-none lg:static lg:translate-x-0 lg:shadow-none",
        lang === 'ar' ? (isSidebarOpen ? "translate-x-0 right-0 border-l" : "translate-x-full right-0 border-l") : (isSidebarOpen ? "translate-x-0 left-0 border-r" : "-translate-x-full left-0 border-r"),
        "w-72 sm:w-80"
      )}>
        <div className="p-8 pb-4 h-full flex flex-col">
          <div className="flex items-center gap-4 mb-10 px-2 cursor-pointer group" onClick={() => setCurrentView('Dashboard')}>
            <div className="w-12 h-12 bg-apple-blue rounded-[14px] flex items-center justify-center text-white shadow-xl shadow-apple-blue/20 rotate-3 group-hover:rotate-0 transition-transform">
              <Zap size={28} fill="currentColor" />
            </div>
            <div>
              <h1 className="text-xl font-black text-apple-dark-blue tracking-tight leading-none">SmartFlow</h1>
              <p className="text-[10px] font-bold text-apple-blue uppercase tracking-widest mt-1 opacity-60">Inventory & Enterprise</p>
            </div>
          </div>
          
          <nav className="space-y-1 flex-1 overflow-y-auto no-scrollbar">
            <NavItem 
              icon={<LayoutGrid size={20} />} 
              label={t.sidebar.dashboard} 
              active={currentView === 'Dashboard'} 
              onClick={() => { setCurrentView('Dashboard'); setIsSidebarOpen(false); }}
            />
            <NavItem 
              icon={<ShoppingCart size={20} />} 
              label={t.sidebar.pos} 
              active={currentView === 'POS'}
              onClick={() => { setCurrentView('POS'); setIsSidebarOpen(false); }}
            />
            <NavItem 
              icon={<Package size={20} />} 
              label={t.sidebar.inventory} 
              active={currentView === 'Inventory'}
              onClick={() => { setCurrentView('Inventory'); setIsSidebarOpen(false); }}
            />
            <NavItem 
              icon={<Receipt size={20} />} 
              label={t.sidebar.purchases} 
              active={currentView === 'Purchases'} 
              onClick={() => { setCurrentView('Purchases'); setIsSidebarOpen(false); }}
            />
            <NavItem 
              icon={<Building2 size={20} />} 
              label={t.sidebar.warehouses} 
              active={currentView === 'Warehouses'} 
              onClick={() => { setCurrentView('Warehouses'); setIsSidebarOpen(false); }}
            />
            <NavItem 
              icon={<Lock size={20} />} 
              label={t.sidebar.cashBox} 
              active={currentView === 'CashBox'} 
              onClick={() => { setCurrentView('CashBox'); setIsSidebarOpen(false); }}
            />
            <div className="pt-4 pb-2">
                <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t.sidebar.management}</p>
                <NavItem 
                icon={<Users size={20} />} 
                label={t.sidebar.customers} 
                active={currentView === 'Customers'}
                onClick={() => { setCurrentView('Customers'); setIsSidebarOpen(false); }}
                />
                <NavItem 
                icon={<Truck size={20} />} 
                label={t.sidebar.suppliers} 
                active={currentView === 'Suppliers'}
                onClick={() => { setCurrentView('Suppliers'); setIsSidebarOpen(false); }}
                />
                <NavItem 
                icon={<Database size={20} />} 
                label={t.sidebar.masterData} 
                active={currentView === 'MasterData'}
                onClick={() => { setCurrentView('MasterData'); setIsSidebarOpen(false); }}
                />
                <NavItem 
                icon={<ShoppingBag size={20} />} 
                label={t.sidebar.salesHistory} 
                active={currentView === 'Sales'}
                onClick={() => { setCurrentView('Sales'); setIsSidebarOpen(false); }}
                />
                <NavItem 
                icon={<TrendingUp size={20} />} 
                label={t.expenses.title} 
                active={currentView === 'Expenses'}
                onClick={() => { setCurrentView('Expenses'); setIsSidebarOpen(false); }}
                />
                <NavItem 
                icon={<BarChart3 size={20} />} 
                label={t.sidebar.reports} 
                active={currentView === 'Reports'}
                onClick={() => { setCurrentView('Reports'); setIsSidebarOpen(false); }}
                />
            </div>
            <NavItem 
              icon={<Settings size={20} />} 
              label={t.sidebar.settings} 
              active={currentView === 'Settings'}
              onClick={() => { setCurrentView('Settings'); setIsSidebarOpen(false); }}
            />
          </nav>
          
          <div className="mt-auto space-y-4">
              <button 
                onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
                className="w-full py-3 px-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center gap-3 text-sm font-bold text-apple-dark-blue hover:shadow-lg hover:border-apple-blue/10 active:scale-95 transition-all"
              >
                <Globe size={18} className="text-apple-blue" />
                <span>{lang === 'en' ? 'العربية' : 'English'}</span>
              </button>

              <div className="flex items-center gap-3 p-3 rounded-[24px] bg-white border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-apple-blue flex items-center justify-center text-white ring-2 ring-white shadow-lg shadow-apple-blue/10">
                  OA
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-tight">Admin</p>
                  <p className="text-[13px] font-bold text-apple-dark-blue leading-tight truncate">Omar Abbood</p>
                </div>
              </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-apple-bg overflow-hidden relative flex flex-col">
        {/* Mobile Header Bar */}
        <header className="lg:hidden h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-apple-blue rounded-[10px] flex items-center justify-center text-white shadow-lg shadow-apple-blue/10">
              <Zap size={18} fill="currentColor" />
            </div>
            <h1 className="text-sm font-black text-apple-dark-blue tracking-tight">SmartFlow</h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="w-10 h-10 rounded-xl bg-apple-bg flex items-center justify-center text-apple-dark-blue"
          >
            <LayoutGrid size={20} />
          </button>
        </header>

        {/* Dynamic View Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 lg:p-12 pb-24 lg:pb-12">
            {currentView === 'Dashboard' && (
                <div className="max-w-7xl mx-auto">
                    <div className="mb-12">
                        <h2 className="text-4xl font-black text-apple-dark-blue tracking-tighter">{t.dashboard.title}</h2>
                        <p className="text-apple-gray font-medium mt-1">Snapshot of your enterprise performance</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-8 rounded-[40px] bg-white border border-gray-100 shadow-sm overflow-hidden relative group">
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t.dashboard.revenue}</p>
                                <h3 className="text-4xl font-black text-apple-dark-blue">{formatCurrency(stats.revenue)}</h3>
                                <div className="mt-4 flex items-center gap-2 text-apple-green text-xs font-bold">
                                    <ArrowUpRight size={14} />
                                    <span>+12.5% {t.dashboard.vsLastMonth}</span>
                                </div>
                            </div>
                            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-apple-blue/5 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-8 rounded-[40px] bg-white border border-gray-100 shadow-sm overflow-hidden relative group">
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t.dashboard.profit}</p>
                                <h3 className="text-4xl font-black text-apple-green">{formatCurrency(stats.profit)}</h3>
                                <div className="mt-4 flex items-center gap-2 text-apple-blue text-xs font-bold">
                                    <Package size={14} />
                                    <span>Based on Cost Pricing</span>
                                </div>
                            </div>
                            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-apple-green/5 rounded-full blur-2xl" />
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-8 rounded-[40px] bg-white border border-gray-100 shadow-sm">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t.dashboard.inventoryCount}</p>
                            <h3 className="text-4xl font-black text-apple-dark-blue">{stats.total}</h3>
                            <p className="text-xs text-apple-blue font-bold mt-4 uppercase tracking-widest">Global Stock</p>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="p-8 rounded-[40px] bg-orange-50 border border-orange-100 shadow-sm relative overflow-hidden">
                            <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-2">{t.dashboard.alerts}</p>
                            <h3 className="text-4xl font-black text-orange-600">{stats.low + stats.out}</h3>
                            <div className="mt-4 flex items-center gap-2 text-orange-500 text-xs font-bold">
                                <AlertCircle size={14} />
                                <span>Items need attention</span>
                            </div>
                            <TrendingDown className="absolute -right-4 -bottom-4 w-28 h-28 text-orange-200/30" />
                        </motion.div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-10 rounded-[48px] border border-gray-100 shadow-sm">
                            <h3 className="text-xl font-bold text-apple-dark-blue mb-8">{t.crm.recentSales}</h3>
                            <div className="space-y-6">
                                {sales?.slice(-5).reverse().map(sale => (
                                    <div key={sale.id} className="flex items-center justify-between pb-6 border-b border-gray-50 last:border-0 last:pb-0">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-apple-bg rounded-2xl flex items-center justify-center text-apple-blue font-black text-[10px]">
                                                {t.crm.inv}
                                            </div>
                                            <div>
                                                <p className="font-bold text-apple-dark-blue truncate max-w-[150px]">{new Date(sale.date).toLocaleDateString()}</p>
                                                <p className="text-[10px] text-gray-400 font-black uppercase">
                                                    {sale.paymentMethod === 'Cash' ? (lang === 'ar' ? 'نقداً' : 'Cash') : 
                                                     sale.paymentMethod === 'Card' ? (lang === 'ar' ? 'بطاقة' : 'Card') : 
                                                     (lang === 'ar' ? 'آجل' : sale.paymentMethod)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-lg text-apple-blue">{formatCurrency(sale.totalAmount)}</p>
                                            <p className="text-[10px] text-gray-400 uppercase font-black">{sale.items.length} {t.crm.itemsCount}</p>
                                        </div>
                                    </div>
                                ))}
                                {(!sales || sales.length === 0) && <p className="text-center py-10 text-gray-400 font-bold">{t.crm.noSalesRecorded}</p>}
                            </div>
                        </div>
                        <div className="bg-apple-dark-blue p-10 rounded-[48px] text-white">
                             <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-bold">{t.crm.criticalActions}</h3>
                                <AlertCircle className="text-red-400" />
                             </div>
                             <div className="space-y-4">
                                {items?.filter(i => i.quantity <= i.minQuantity).slice(0, 4).map(item => (
                                    <div key={item.id} className="p-5 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-between">
                                        <div>
                                            <p className="font-bold">{lang === 'ar' ? item.nameAr : item.name}</p>
                                            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">{t.quantity}: {item.quantity}</p>
                                        </div>
                                        <div className="flex items-center gap-2 text-red-400 text-xs font-black bg-red-400/10 px-3 py-1.5 rounded-full">
                                            <ArrowDownRight size={14} />
                                            {item.quantity === 0 ? t.crm.outOfStock : t.crm.lowStock}
                                        </div>
                                    </div>
                                ))}
                                {items?.filter(i => i.quantity <= i.minQuantity).length === 0 && <p className="text-white/40 text-sm text-center py-10">{t.crm.inventoryHealthy}</p>}
                             </div>
                        </div>
                    </div>
                </div>
            )}

            {currentView === 'Inventory' && (
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                      <div>
                        <motion.h2 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-4xl font-black text-apple-dark-blue tracking-tighter"
                        >
                          {t.inventory.title}
                        </motion.h2>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-2 h-2 bg-apple-green rounded-full animate-pulse shadow-[0_0_8px_#34C759]"></div>
                          <p className="text-apple-gray font-bold text-[11px] uppercase tracking-widest">{t.dashboard.liveSystem}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80 group">
                          <input
                            type="text"
                            placeholder={t.inventory.search}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className={cn("w-full bg-white border border-gray-200 rounded-full py-2.5 px-12 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/20 transition-all shadow-sm", lang === 'ar' ? "text-right" : "text-left")}
                          />
                          <Search className={cn("absolute top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-apple-blue transition-colors", lang === 'ar' ? "right-4" : "left-4")} size={18} />
                        </div>
                        <button 
                          onClick={() => setIsModalOpen(true)}
                          className="h-10 px-6 rounded-full bg-apple-blue text-white text-[13px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-apple-blue/20 hover:scale-[1.03] active:scale-95 transition-all"
                        >
                          <Plus size={18} />
                          <span className="hidden sm:inline">{t.addItem}</span>
                        </button>
                      </div>
                    </div>

                    {/* Stats Summary Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 text-left" dir="ltr">
                      <StatCard 
                        label={t.inventory.totalParts} 
                        value={stats.total} 
                        color="blue" 
                        icon={<Package size={20}/>} 
                        active={statusFilter === 'All'}
                        onClick={() => setStatusFilter('All')}
                      />
                      <StatCard 
                        label={t.inventory.lowStock} 
                        value={stats.low} 
                        color="orange" 
                        icon={<TrendingDown size={20}/>} 
                        active={statusFilter === 'Low'}
                        onClick={() => setStatusFilter('Low')}
                      />
                      <StatCard 
                        label={t.inventory.outOfStock} 
                        value={stats.out} 
                        color="red" 
                        icon={<AlertCircle size={20}/>} 
                        active={statusFilter === 'Out'}
                        onClick={() => setStatusFilter('Out')}
                      />
                      <StatCard 
                        label={t.dashboard.displayed} 
                        value={filteredItems.length} 
                        color="purple" 
                        icon={<LayoutGrid size={20}/>} 
                      />
                    </div>

                    {/* Filters & Sorting Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar lg:flex-wrap">
                        <button
                          onClick={() => setSelectedCategoryId('All')}
                          className={cn(
                            "px-6 py-2 rounded-full font-bold whitespace-nowrap text-[12px] tracking-wide transition-all border",
                            selectedCategoryId === 'All' 
                              ? "bg-apple-blue text-white border-apple-blue shadow-md" 
                              : "bg-white text-gray-500 border-gray-100 hover:bg-gray-50"
                          )}
                        >
                          {t.categories.all}
                        </button>
                        {categoriesList?.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => setSelectedCategoryId(cat.id!)}
                            className={cn(
                              "px-6 py-2 rounded-full font-bold whitespace-nowrap text-[12px] tracking-wide transition-all border",
                              selectedCategoryId === cat.id 
                                ? "bg-apple-blue text-white border-apple-blue shadow-md" 
                                : "bg-white text-gray-500 border-gray-100 hover:bg-gray-50"
                            )}
                          >
                            {lang === 'ar' ? cat.nameAr : cat.name}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <div 
                                onClick={() => setShowArchived(!showArchived)}
                                className={cn(
                                    "w-10 h-6 rounded-full transition-colors relative flex items-center px-1",
                                    showArchived ? "bg-apple-blue" : "bg-gray-200"
                                )}
                            >
                                <motion.div 
                                    animate={{ x: showArchived ? 16 : 0 }}
                                    className="w-4 h-4 bg-white rounded-full shadow-sm"
                                />
                            </div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                {lang === 'ar' ? 'الأرشيف' : 'Archived'}
                            </span>
                        </label>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.inventory.sortBy}</span>
                          <select 
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="px-4 py-2 rounded-xl font-bold text-[12px] border border-gray-100 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-apple-blue/10"
                          >
                            <option value="lastUpdated">{t.inventory.recentlyUpdated}</option>
                            <option value="name">{t.inventory.name}</option>
                            <option value="quantity">{t.inventory.stockQuantity}</option>
                            <option value="price">{t.inventory.price}</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Content Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      <AnimatePresence mode="popLayout">
                        {filteredItems.map(item => (
                          <ItemCard
                            key={item.id}
                            item={item}
                            lang={lang}
                            t={t}
                            onUpdateQuantity={handleUpdateQuantity}
                            onDelete={handleDeleteItem}
                            onEdit={(item) => {
                                setEditingItem(item);
                                setIsModalOpen(true);
                            }}
                            onArchive={handleArchiveItem}
                            categoriesMap={categoriesMap}
                          />
                        ))}
                      </AnimatePresence>
                    </div>

                    {filteredItems.length === 0 && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-32 text-center"
                      >
                        <div className="w-24 h-24 bg-apple-bg rounded-full flex items-center justify-center text-gray-300 mb-6 ring-1 ring-gray-100">
                          <Package size={48} />
                        </div>
                        <h3 className="text-xl font-bold text-apple-dark-blue mb-2">{t.dashboard.noItemsFound}</h3>
                        <p className="text-apple-gray text-sm max-w-[280px]">
                          {t.dashboard.noItemsAdjustSearch}
                        </p>
                      </motion.div>
                    )}
                </div>
            )}

            {currentView === 'POS' && <POSView lang={lang} t={t} />}
            {currentView === 'Purchases' && <PurchasesView lang={lang} t={t} />}
            {(currentView === 'Customers' || currentView === 'Suppliers') && <CRMView lang={lang} t={t} />}
            {currentView === 'Reports' && <ReportsView lang={lang} t={t} />}
            {currentView === 'Sales' && <SalesView lang={lang} t={t} />}
            {currentView === 'Expenses' && <ExpensesView lang={lang} t={t} />}
            {currentView === 'Warehouses' && <WarehousesView lang={lang} t={t} />}
            {currentView === 'CashBox' && <CashBoxView lang={lang} t={t} />}
            {currentView === 'MasterData' && <MasterDataView lang={lang} t={t} />}
            {currentView === 'Settings' && <SettingsView lang={lang} t={t} onLangToggle={() => setLang(l => l === 'en' ? 'ar' : 'en')} />}
        </div>
      </main>

      <AddItemModal
        isOpen={isModalOpen}
        onClose={() => {
            setIsModalOpen(false);
            setEditingItem(null);
        }}
        onAdd={handleAddItem}
        lang={lang}
        t={t}
        editingItem={editingItem}
      />

      <AnimatePresence>
        {isScannerOpen && (
          <BarcodeScanner 
            lang={lang}
            onScan={(code) => {
              setSearchQuery(code);
              setIsScannerOpen(false);
            }}
            onClose={() => setIsScannerOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all text-right relative overflow-hidden",
        active ? "bg-apple-blue text-white shadow-xl shadow-apple-blue/20" : "text-gray-500 hover:bg-gray-100"
      )}
    >
      <span className={cn("text-lg", active ? "text-white" : "text-apple-blue")}>{icon}</span>
      <span className="text-sm tracking-tight">{label}</span>
      {active && <motion.div layoutId="nav-pill" className="w-1.5 h-1.5 rounded-full bg-white ml-auto" />}
    </button>
  );
}

function StatCard({ label, value, color, icon, active, onClick }: { label: string, value: number, color: 'blue' | 'green' | 'red' | 'orange' | 'purple', icon: React.ReactNode, active?: boolean, onClick?: () => void }) {
  const colors = {
    blue: 'text-apple-blue bg-blue-50',
    green: 'text-apple-green bg-green-50',
    red: 'text-red-500 bg-red-50',
    orange: 'text-orange-400 bg-orange-50',
    purple: 'text-purple-500 bg-purple-50'
  };

  return (
    <button 
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "bg-white p-6 rounded-[32px] border transition-all shadow-sm flex items-center gap-5 text-left w-full",
        active ? "border-apple-blue ring-4 ring-apple-blue/5 scale-[1.02]" : "border-gray-100 hover:scale-[1.01] hover:border-gray-200",
        !onClick && "cursor-default"
      )}
    >
      <div className={cn("w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm", colors[color])}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest leading-none mb-2 truncate">{label}</p>
        <h3 className="text-2xl sm:text-3xl font-black text-apple-dark-blue leading-none tracking-tight truncate">{value}</h3>
      </div>
    </button>
  );
}

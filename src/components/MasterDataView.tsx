import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Language, TranslationStrings, BaseEntity } from '../types';
import { cn } from '../lib/utils';
import { 
  Tag, 
  Layers, 
  Box, 
  Plus, 
  Trash2, 
  Search,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MasterDataViewProps {
  lang: Language;
  t: TranslationStrings;
}

type Mode = 'Categories' | 'Units' | 'Brands';

export function MasterDataView({ lang, t }: MasterDataViewProps) {
  const [activeMode, setActiveMode] = useState<Mode>('Categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const categories = useLiveQuery(() => db.categories.toArray());
  const units = useLiveQuery(() => db.units.toArray());
  const brands = useLiveQuery(() => db.brands.toArray());

  const activeData: BaseEntity[] | undefined = 
    activeMode === 'Categories' ? categories : 
    activeMode === 'Units' ? units : 
    brands;

  const isAr = lang === 'ar';

  const filteredData = activeData?.filter((d: BaseEntity) => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.nameAr.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const nameAr = formData.get('nameAr') as string;
    const description = formData.get('description') as string;
    const descriptionAr = formData.get('descriptionAr') as string;

    if (name && nameAr) {
      const payload = { name, nameAr, description, descriptionAr };
      if (activeMode === 'Categories') await db.categories.add(payload);
      else if (activeMode === 'Units') await db.units.add(payload);
      else if (activeMode === 'Brands') await db.brands.add(payload);
      setShowAddModal(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm(t.crm.confirmDelete)) {
      if (activeMode === 'Categories') await db.categories.delete(id);
      else if (activeMode === 'Units') await db.units.delete(id);
      else if (activeMode === 'Brands') await db.brands.delete(id);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12" dir={isAr ? 'rtl' : 'ltr'}>
        <div>
          <h2 className="text-4xl font-black text-apple-dark-blue tracking-tighter">
            {activeMode === 'Categories' ? (isAr ? 'الأصناف' : 'Categories') : 
             activeMode === 'Units' ? (isAr ? 'الوحدات' : 'Units') : 
             (isAr ? 'العلامات التجارية' : 'Brands')}
          </h2>
          <p className="text-apple-gray font-medium mt-1">
            {isAr ? 'إدارة تصنيفات المنتجات الأساسية' : 'Manage core product classifications'}
          </p>
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="h-10 px-6 rounded-full bg-apple-blue text-white text-[13px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-apple-blue/20 hover:scale-[1.03] active:scale-95 transition-all"
        >
          <Plus size={18} />
          {isAr ? 'إضافة جديد' : 'Add New'}
        </button>
      </div>

      <div className="flex gap-4 mb-8 overflow-x-auto pb-2 scrollbar-none" dir={isAr ? 'rtl' : 'ltr'}>
        {[
          { id: 'Categories', icon: <Tag size={16} />, label: isAr ? 'الأصناف' : 'Categories' },
          { id: 'Units', icon: <Layers size={16} />, label: isAr ? 'الوحدات' : 'Units' },
          { id: 'Brands', icon: <Box size={16} />, label: isAr ? 'العلامات التجارية' : 'Brands' }
        ].map(mode => (
          <button 
            key={mode.id}
            onClick={() => setActiveMode(mode.id as Mode)}
            className={cn(
              "px-6 py-3 rounded-2xl font-bold text-sm transition-all border flex items-center gap-2 whitespace-nowrap",
              activeMode === mode.id 
                ? "bg-white border-apple-blue text-apple-blue shadow-lg shadow-apple-blue/5" 
                : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
            )}
          >
            {mode.icon}
            {mode.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-50 bg-gray-50/30">
            <div className={cn("relative group max-w-md", isAr ? "mr-0" : "ml-0")}>
                <input
                    type="text"
                    placeholder={isAr ? 'بحث...' : 'Search...'}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    dir={isAr ? 'rtl' : 'ltr'}
                    className="w-full bg-white border border-gray-200 rounded-full py-2.5 px-12 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/20 transition-all font-rubik"
                />
                <Search className={cn("absolute top-1/2 -translate-y-1/2 text-gray-400", isAr ? "right-4" : "left-4")} size={18} />
            </div>
        </div>

        <div className="divide-y divide-gray-50">
            {filteredData?.map(item => (
                <div key={item.id} className={cn("p-6 flex items-center justify-between hover:bg-gray-50 transition-colors group", isAr && "flex-row-reverse text-right")}>
                    <div className={cn("flex items-center gap-4", isAr && "flex-row-reverse")}>
                        <div className="w-10 h-10 bg-apple-bg rounded-xl flex items-center justify-center text-apple-blue shrink-0">
                            {activeMode === 'Categories' ? <Tag size={18} /> : activeMode === 'Units' ? <Layers size={18} /> : <Box size={18} />}
                        </div>
                        <div className={cn("text-left", isAr && "text-right")}>
                            <p className="font-bold text-apple-dark-blue">{isAr ? item.nameAr : item.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{isAr ? item.name : item.nameAr}</p>
                            {(isAr ? item.descriptionAr : item.description) && (
                                <p className="text-xs text-apple-gray mt-1 max-w-md">{isAr ? item.descriptionAr : item.description}</p>
                            )}
                        </div>
                    </div>
                    <button 
                        onClick={() => handleDelete(item.id!)}
                        className="p-3 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            ))}
            {(!filteredData || filteredData.length === 0) && (
                <div className="py-20 text-center text-gray-300">
                    <p className="font-bold text-sm">{isAr ? 'لم يتم العثور على سجلات' : 'No records found'}</p>
                </div>
            )}
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl p-10 my-8"
            >
              <h3 className={cn("text-2xl font-black text-apple-dark-blue mb-8", isAr && "text-right")}>
                {isAr ? 'إضافة ' : 'Add '}
                {activeMode === 'Categories' ? (isAr ? 'صنف' : 'Category') : activeMode === 'Units' ? (isAr ? 'وحدة' : 'Unit') : (isAr ? 'علامة تجارية' : 'Brand')}
              </h3>

              <form onSubmit={handleAdd} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Name (English)</label>
                    <input name="name" required className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none" />
                  </div>
                  <div className="space-y-2 text-right">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">الاسم بالعربية</label>
                    <input name="nameAr" required className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none text-right font-rubik" />
                  </div>
                </div>

                <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Description (English)</label>
                    <textarea 
                        name="description" 
                        rows={2}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none resize-none" 
                        placeholder={isAr ? "Enter description in English..." : "Enter description in English..."}
                    />
                </div>

                <div className="space-y-2 text-right">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">الوصف بالعربية</label>
                    <textarea 
                        name="descriptionAr" 
                        rows={2}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none text-right font-rubik resize-none" 
                        placeholder="أدخل الوصف بالعربية..."
                    />
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowAddModal(false)} className={cn("flex-1 py-4 font-bold text-apple-gray", isAr && "order-2")}>
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button type="submit" className={cn("flex-[2] py-4 rounded-2xl bg-apple-blue text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-apple-blue/20 transition-all active:scale-95", isAr && "order-1")}>
                    {isAr ? 'حفظ' : 'Save'}
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

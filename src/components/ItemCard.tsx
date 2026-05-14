/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Minus, 
  Trash2, 
  AlertCircle, 
  TrendingDown, 
  Package, 
  Search,
  Settings,
  Languages,
  ArrowRight,
  Edit3,
  Archive,
  ArchiveRestore
} from 'lucide-react';
import type { InventoryItem, Language, TranslationStrings } from '../types';
import { cn } from '../lib/utils';

interface ItemCardProps {
  item: InventoryItem;
  lang: Language;
  t: TranslationStrings;
  onUpdateQuantity: (id: number, delta: number) => void;
  onDelete: (id: number) => void;
  onEdit: (item: InventoryItem) => void;
  onArchive: (id: number, archived: boolean) => void;
  categoriesMap: Record<number, { name: string, nameAr: string }>;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, lang, t, onUpdateQuantity, onDelete, onEdit, onArchive, categoriesMap }) => {
  const isLowStock = item.quantity <= item.minQuantity;
  const isOutOfStock = item.quantity <= 0;
  
  const categoryName = item.categoryId ? 
    (lang === 'ar' ? categoriesMap[item.categoryId]?.nameAr : categoriesMap[item.categoryId]?.name) || '???' 
    : 'No Category';

  const settings = useLiveQuery(() => db.settings.get('current'));
  const currency = settings?.currency || 'د.ع';

  const formatCurrency = (val: number) => {
    const formatted = val.toLocaleString(undefined, { 
      minimumFractionDigits: currency === 'د.ع' ? 0 : 2,
      maximumFractionDigits: currency === 'د.ع' ? 0 : 2 
    });
    return lang === 'ar' ? `${formatted} ${currency}` : `${currency}${formatted}`;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      whileHover={{ y: -2 }}
      className="bg-white border border-gray-100 shadow-sm rounded-3xl p-5 group flex flex-col justify-between h-full"
    >
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className={cn("flex flex-col", lang === 'ar' ? "text-right" : "text-left")}>
            <span className="text-[10px] font-bold uppercase tracking-widest text-apple-gray mb-1">
              {categoryName}
            </span>
            <h3 className="text-lg font-bold text-apple-dark-blue group-hover:text-apple-blue transition-colors">
              {lang === 'en' ? item.name : item.nameAr}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <p className="text-[11px] text-apple-gray">
                {lang === 'en' ? item.nameAr : item.name}
              </p>
              {item.barcode && (
                <>
                  <span className="w-0.5 h-0.5 bg-gray-300 rounded-full" />
                  <p className="text-[9px] font-mono text-gray-400">{item.barcode}</p>
                </>
              )}
              {item.manufacturer && (
                <>
                  <span className="w-0.5 h-0.5 bg-gray-300 rounded-full" />
                  <p className="text-[10px] font-bold text-apple-blue/70">
                    {item.manufacturer}
                  </p>
                </>
              )}
            </div>
            {item.supplier && (
              <p className="text-[9px] text-gray-400 mt-0.5 italic">
                From: {item.supplier}
              </p>
            )}
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <button 
                onClick={() => onEdit(item)}
                className="p-2 rounded-xl bg-gray-50 border border-gray-100 text-gray-400 hover:text-apple-blue transition-all lg:opacity-0 lg:group-hover:opacity-100 mb-1"
            >
                <Edit3 size={16} />
            </button>
            <div className={cn(
              "px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest flex items-center gap-1",
              isOutOfStock ? "bg-red-50 text-red-600" : 
              isLowStock ? "bg-orange-50 text-orange-600" : 
              "bg-green-50 text-green-600 border border-green-100"
            )}>
            {isOutOfStock ? (
              <AlertCircle size={10} />
            ) : isLowStock ? (
              <TrendingDown size={10} />
            ) : (
              <Package size={10} />
            )}
            {isOutOfStock ? t.outOfStock : isLowStock ? t.lowStock : t.inStock}
          </div>
        </div>
      </div>
    </div>

    <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={() => onUpdateQuantity(item.id!, -1)}
            className="w-10 h-10 rounded-full border border-gray-200 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-all active:scale-90"
            aria-label="Decrease quantity"
          >
            <Minus size={16} />
          </button>
          <div className="flex flex-col items-center min-w-[2.5rem]">
            <span className={cn(
              "text-xl font-bold tracking-tight",
              isLowStock ? "text-orange-500" : "text-gray-900"
            )}>
              {item.quantity}
            </span>
            <span className="text-[8px] uppercase tracking-tighter text-apple-gray font-bold">{t.quantity}</span>
          </div>
          <button 
            onClick={() => onUpdateQuantity(item.id!, 1)}
            className="w-10 h-10 rounded-full border border-gray-200 hover:bg-green-50 hover:text-green-600 flex items-center justify-center transition-all active:scale-90"
            aria-label="Increase quantity"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <p className="text-lg font-black text-apple-dark-blue leading-none">
              {formatCurrency(item.price)}
            </p>
            {item.costPrice !== undefined && (
              <p className="text-[9px] text-gray-400 font-bold mt-1">
                Cost: {formatCurrency(item.costPrice)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
             <button 
              onClick={() => onArchive(item.id!, !item.archived)}
              className="text-gray-300 hover:text-apple-blue transition-colors"
            >
              {item.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
            </button>
            <button 
              onClick={() => onDelete(item.id!)}
              className="text-gray-300 hover:text-red-500 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

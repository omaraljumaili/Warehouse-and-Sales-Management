/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, PackagePlus, ArrowRight, ArrowLeft, Scan } from 'lucide-react';
import { db } from '../db';
import { BarcodeScanner } from './BarcodeScanner';
import type { Category, Language, TranslationStrings, InventoryItem } from '../types';
import { cn } from '../lib/utils';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: any) => void;
  lang: Language;
  t: TranslationStrings;
  editingItem?: InventoryItem | null;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({ isOpen, onClose, onAdd, lang, t, editingItem }) => {
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    category: 'Oil' as Category,
    quantity: 10,
    minQuantity: 5,
    price: 0,
    costPrice: 0,
    tags: [] as string[],
    barcode: '',
    manufacturer: '',
    supplier: ''
  });

  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setFormData({
        name: editingItem.name,
        nameAr: editingItem.nameAr,
        category: editingItem.category,
        quantity: editingItem.quantity,
        minQuantity: editingItem.minQuantity,
        price: editingItem.price,
        costPrice: editingItem.costPrice || 0,
        tags: editingItem.tags || [],
        barcode: editingItem.barcode || '',
        manufacturer: editingItem.manufacturer || '',
        supplier: editingItem.supplier || ''
      });
    } else {
      setFormData({
        name: '',
        nameAr: '',
        category: 'Oil',
        quantity: 10,
        minQuantity: 5,
        price: 0,
        costPrice: 0,
        tags: [],
        barcode: '',
        manufacturer: '',
        supplier: ''
      });
    }
  }, [editingItem, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(editingItem ? { ...editingItem, ...formData } : formData);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-md z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className="fixed inset-0 m-auto w-full max-w-2xl h-fit max-h-[90vh] overflow-y-auto bg-white border border-gray-100 rounded-[32px] z-50 p-8 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-apple-green rounded-xl flex items-center justify-center text-white shadow-lg shadow-apple-green/20">
                  <PackagePlus size={22} />
                </div>
                <h2 className="text-2xl font-bold text-apple-dark-blue">
                  {editingItem ? (lang === 'en' ? 'Edit Item' : 'تعديل قطعة') : t.addItem}
                </h2>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full hover:bg-gray-50 flex items-center justify-center transition-colors border border-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-apple-gray uppercase tracking-widest">{t.form.nameLabel}</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="premium-input"
                    placeholder="e.g. Engine Oil"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-apple-gray uppercase tracking-widest">{t.form.nameArLabel}</label>
                  <input
                    required
                    type="text"
                    dir="rtl"
                    value={formData.nameAr}
                    onChange={e => setFormData({ ...formData, nameAr: e.target.value })}
                    className="premium-input font-rubik"
                    placeholder="مثال: زيت محرك"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-apple-gray uppercase tracking-widest">{t.form.barcodeLabel}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                      className="premium-input flex-1"
                      placeholder="SKU-001..."
                    />
                    <button 
                      type="button"
                      onClick={() => setIsScanning(true)}
                      className="w-12 rounded-full bg-apple-blue/10 text-apple-blue hover:bg-apple-blue/20 transition-colors flex items-center justify-center border border-apple-blue/20"
                      title={t.form.scan}
                    >
                      <Scan size={20} />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-apple-gray uppercase tracking-widest">{t.form.categoryLabel}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Oil', 'Filter', 'Brake', 'Other'] as Category[]).map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat })}
                        className={cn(
                          "py-2 rounded-full text-[10px] font-bold border transition-all",
                          formData.category === cat 
                            ? "bg-apple-blue text-white border-apple-blue shadow-md" 
                            : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                        )}
                      >
                        {t.categories[cat]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-apple-gray uppercase tracking-widest">{t.form.manufacturerLabel}</label>
                  <input
                    type="text"
                    value={formData.manufacturer}
                    onChange={e => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="premium-input"
                    placeholder="Toyota, Mobil..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-apple-gray uppercase tracking-widest">{t.form.supplierLabel}</label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                    className="premium-input"
                    placeholder="Main Distributor..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-apple-gray uppercase tracking-widest">{t.form.quantityLabel}</label>
                  <input
                    required
                    type="number"
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    className="premium-input text-center"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-apple-gray uppercase tracking-widest">{t.form.minQuantityLabel}</label>
                  <input
                    required
                    type="number"
                    value={formData.minQuantity}
                    onChange={e => setFormData({ ...formData, minQuantity: parseInt(e.target.value) || 0 })}
                    className="premium-input text-center"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-apple-gray uppercase tracking-widest">{t.form.costPriceLabel}</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={formData.costPrice}
                    onChange={e => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                    className="premium-input text-center font-bold text-apple-blue"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-apple-gray uppercase tracking-widest">{t.form.priceLabel}</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="premium-input text-center font-bold text-apple-blue"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-6 rounded-full font-bold text-gray-500 hover:bg-gray-50 transition-colors border border-gray-200"
                >
                  {t.form.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-3 px-6 rounded-full font-bold bg-apple-blue text-white shadow-lg shadow-apple-blue/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {t.form.save}
                  {lang === 'en' ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
      
      <AnimatePresence>
        {isScanning && (
          <BarcodeScanner 
            lang={lang}
            onClose={() => setIsScanning(false)}
            onScan={async (decodedText) => {
              setIsScanning(false);
              const existingItem = await db.items.where('barcode').equals(decodedText).first();
              
              if (existingItem) {
                setFormData({
                  name: existingItem.name,
                  nameAr: existingItem.nameAr,
                  category: existingItem.category,
                  quantity: existingItem.quantity,
                  minQuantity: existingItem.minQuantity,
                  price: existingItem.price,
                  tags: existingItem.tags || [],
                  barcode: existingItem.barcode || decodedText,
                  manufacturer: existingItem.manufacturer || '',
                  supplier: existingItem.supplier || ''
                });
              } else {
                setFormData(prev => ({ ...prev, barcode: decodedText }));
              }
            }}
          />
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};

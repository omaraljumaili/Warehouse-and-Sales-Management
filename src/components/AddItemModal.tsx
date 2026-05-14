/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';
import { X, PackagePlus, ArrowRight, ArrowLeft, Scan, BrainCircuit, Camera, Loader2 } from 'lucide-react';
import { db } from '../db';
import { BarcodeScanner } from './BarcodeScanner';
import { identifyProduct } from '../lib/gemini';
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
    categoryId: 0,
    unitId: 0,
    brandId: 0,
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
  const [isAIIdentifying, setIsAIIdentifying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const categories = useLiveQuery(() => db.categories.toArray());
  const brands = useLiveQuery(() => db.brands.toArray());
  const units = useLiveQuery(() => db.units.toArray());

  useEffect(() => {
    if (editingItem) {
      setFormData({
        name: editingItem.name,
        nameAr: editingItem.nameAr,
        categoryId: editingItem.categoryId || 0,
        brandId: editingItem.brandId || 0,
        unitId: editingItem.unitId || 0,
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
        categoryId: 0,
        brandId: 0,
        unitId: 0,
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

  const handleAIScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAIIdentifying(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const result = await identifyProduct(base64, categories || []);
        if (result) {
          // Find category ID if matched by name
          let catId = 0;
          if (result.categoryName && categories) {
            const matchedCat = categories.find(c => 
              c.name.toLowerCase() === result.categoryName?.toLowerCase() || 
              c.nameAr.toLowerCase() === result.categoryName?.toLowerCase()
            );
            if (matchedCat) catId = matchedCat.id!;
          }

          setFormData(prev => ({
            ...prev,
            name: result.name || prev.name,
            nameAr: result.nameAr || prev.nameAr,
            categoryId: catId || prev.categoryId,
            price: result.estimatedPrice || prev.price,
            costPrice: result.estimatedCostPrice || prev.costPrice,
            barcode: result.barcode || prev.barcode
          }));
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("AI Error:", error);
    } finally {
      setIsAIIdentifying(false);
    }
  };

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
            className="fixed inset-x-4 bottom-4 sm:inset-0 m-auto w-auto sm:w-full max-w-2xl h-fit max-h-[95vh] sm:max-h-[90vh] overflow-y-auto bg-white border border-gray-100 rounded-[32px] z-50 p-6 sm:p-8 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-apple-green rounded-xl flex items-center justify-center text-white shadow-lg shadow-apple-green/20">
                  <PackagePlus size={22} />
                </div>
                <h2 className="text-2xl font-bold text-apple-dark-blue">
                  {editingItem ? t.form.editItem : t.addItem}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {!editingItem && (
                  <>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleAIScan} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <button
                      type="button"
                      disabled={isAIIdentifying}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-apple-blue/5 text-apple-blue font-bold text-xs border border-apple-blue/10 hover:bg-apple-blue/10 transition-all disabled:opacity-50"
                    >
                      {isAIIdentifying ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <BrainCircuit size={14} />
                      )}
                      {lang === 'ar' ? 'تعرف بالذكاء الاصطناعي' : 'AI Scan'}
                    </button>
                  </>
                )}
                <button 
                  onClick={onClose}
                  className="w-10 h-10 rounded-full hover:bg-gray-50 flex items-center justify-center transition-colors border border-gray-100"
                >
                  <X size={18} />
                </button>
              </div>
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
                    placeholder={t.form.namePlaceholder}
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
                    placeholder={t.form.nameArPlaceholder}
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
                      placeholder={t.form.barcodePlaceholder}
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
                  <select 
                    value={formData.categoryId}
                    onChange={e => setFormData({ ...formData, categoryId: parseInt(e.target.value) })}
                    className="premium-input"
                  >
                    <option value={0}>Select Category</option>
                    {categories?.map(cat => (
                      <option key={cat.id} value={cat.id}>{lang === 'ar' ? cat.nameAr : cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-apple-gray uppercase tracking-widest">Brand / العلامة التجارية</label>
                  <div className="flex gap-2">
                    <select 
                      value={formData.brandId}
                      onChange={e => setFormData({ ...formData, brandId: parseInt(e.target.value) })}
                      className="premium-input flex-1"
                    >
                      <option value={0}>Select Brand</option>
                      {brands?.map(brand => (
                        <option key={brand.id} value={brand.id}>{lang === 'ar' ? brand.nameAr : brand.name}</option>
                      ))}
                    </select>
                    <button type="button" onClick={async () => {
                      const name = prompt("Brand Name (EN)");
                      const nameAr = prompt("الاسم بالعربية");
                      if(name && nameAr) await db.brands.add({ name, nameAr });
                    }} className="px-4 rounded-xl bg-gray-50 border border-gray-100 font-black text-apple-blue">+</button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-apple-gray uppercase tracking-widest">Unit / الوحدة</label>
                  <div className="flex gap-2">
                    <select 
                      value={formData.unitId}
                      onChange={e => setFormData({ ...formData, unitId: parseInt(e.target.value) })}
                      className="premium-input flex-1"
                    >
                      <option value={0}>Select Unit</option>
                      {units?.map(unit => (
                        <option key={unit.id} value={unit.id}>{lang === 'ar' ? unit.nameAr : unit.name}</option>
                      ))}
                    </select>
                    <button type="button" onClick={async () => {
                      const name = prompt("Unit Name (EN)");
                      const nameAr = prompt("الاسم بالعربية");
                      if(name && nameAr) await db.units.add({ name, nameAr });
                    }} className="px-4 rounded-xl bg-gray-50 border border-gray-100 font-black text-apple-blue">+</button>
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
                    placeholder={t.form.manufacturerPlaceholder}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-apple-gray uppercase tracking-widest">{t.form.supplierLabel}</label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                    className="premium-input"
                    placeholder={t.form.supplierPlaceholder}
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
                  categoryId: existingItem.categoryId || 0,
                  unitId: existingItem.unitId || 0,
                  brandId: existingItem.brandId || 0,
                  quantity: existingItem.quantity,
                  minQuantity: existingItem.minQuantity,
                  price: existingItem.price,
                  costPrice: existingItem.costPrice,
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

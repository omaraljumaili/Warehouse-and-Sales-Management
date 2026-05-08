/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { TranslationStrings } from './types';

export const translations: Record<'en' | 'ar', TranslationStrings> = {
  en: {
    title: 'SmartFlow',
    inventoryTitle: 'Inventory Dashboard',
    addItem: 'New Item',
    searchPlaceholder: 'Search part name or model...',
    noItems: 'No items found in your inventory.',
    quantity: 'Stock',
    price: 'Price',
    stockStatus: 'Status',
    lowStock: 'Low Stock',
    inStock: 'In Stock',
    outOfStock: 'Out of Stock',
    pos: {
      title: 'Sales Point',
      customer: 'Customer',
      addItem: 'Scan or Select Item',
      total: 'Total',
      checkout: 'Complete Sale',
      emptySelection: 'Start adding items to sale'
    },
    purchases: {
      title: 'Purchases',
      supplier: 'Supplier',
      invoice: 'Invoice #',
      addStock: 'Receive Stock'
    },
    crm: {
      customers: 'Customers',
      suppliers: 'Suppliers',
      phone: 'Phone',
      addCustomer: 'New Customer',
      addSupplier: 'New Supplier'
    },
    categories: {
      Oil: 'Oils',
      Filter: 'Filters',
      Brake: 'Brakes',
      Other: 'Other'
    },
    form: {
      nameLabel: 'English Name',
      nameArLabel: 'Arabic Name',
      categoryLabel: 'Category',
      quantityLabel: 'Initial Quantity',
      minQuantityLabel: 'Reorder Level',
      priceLabel: 'Selling Price',
      costPriceLabel: 'Cost Price',
      barcodeLabel: 'Barcode',
      manufacturerLabel: 'Manufacturer',
      supplierLabel: 'Supplier',
      save: 'Save Item',
      cancel: 'Cancel',
      scan: 'Scan Barcode'
    }
  },
  ar: {
    title: 'سمارت فلو',
    inventoryTitle: 'لوحة التحكم بالمخزون',
    addItem: 'إضافة قطعة',
    searchPlaceholder: 'ابحث عن اسم القطعة أو الموديل...',
    noItems: 'لم يتم العثور على قطع في المخزون.',
    quantity: 'الكمية',
    price: 'السعر',
    stockStatus: 'الحالة',
    lowStock: 'مخزون منخفض',
    inStock: 'متوفر',
    outOfStock: 'نفذ المخزون',
    pos: {
      title: 'نقطة البيع',
      customer: 'العميل',
      addItem: 'امسح أو اختر قطعة',
      total: 'المجموع',
      checkout: 'إتمام البيع',
      emptySelection: 'ابدأ بإضافة قطع للبيع'
    },
    purchases: {
      title: 'المشتريات',
      supplier: 'المورد',
      invoice: 'رقم الفاتورة',
      addStock: 'توريد مخزون'
    },
    crm: {
      customers: 'العملاء',
      suppliers: 'الموردون',
      phone: 'رقم الهاتف',
      addCustomer: 'عميل جديد',
      addSupplier: 'مورد جديد'
    },
    categories: {
      Oil: 'زيوت',
      Filter: 'فلاتر',
      Brake: 'فرامل',
      Other: 'أخرى'
    },
    form: {
      nameLabel: 'الاسم بالإنكليزية',
      nameArLabel: 'الاسم بالعربية',
      categoryLabel: 'الفئة',
      quantityLabel: 'الكمية الأولية',
      minQuantityLabel: 'مستوى إعادة الطلب',
      priceLabel: 'سعر البيع',
      costPriceLabel: 'سعر التكلفة',
      barcodeLabel: 'الباركود',
      manufacturerLabel: 'الشركة المصنعة',
      supplierLabel: 'المورد',
      save: 'حفظ القطعة',
      cancel: 'إلغاء',
      scan: 'مسح الباركود'
    }
  }
};

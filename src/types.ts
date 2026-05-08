/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Category = 'Oil' | 'Filter' | 'Brake' | 'Other';

export interface InventoryItem {
  id?: number;
  name: string;
  nameAr: string;
  category: Category;
  quantity: number;
  minQuantity: number;
  price: number; // Selling Price
  costPrice: number; // Purchase Price
  lastUpdated: number;
  tags: string[];
  barcode?: string;
  manufacturer?: string;
  supplier?: string;
}

export interface Customer {
  id?: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalSpent: number;
  totalPaid: number;
  lastVisit: number;
}

export interface Supplier {
  id?: number;
  name: string;
  contactName?: string;
  phone: string;
  email?: string;
  address?: string;
}

export interface Sale {
  id?: number;
  customerId?: number;
  date: number;
  items: {
    itemId: number;
    name: string;
    quantity: number;
    price: number;
    total: number;
  }[];
  totalAmount: number;
  amountPaid: number;
  paymentMethod: 'Cash' | 'Card' | 'Credit' | 'Partial';
}

export interface Payment {
  id?: number;
  customerId: number;
  date: number;
  amount: number;
  method: 'Cash' | 'Card' | 'Transfer';
  note?: string;
}

export interface Purchase {
  id?: number;
  supplierId?: number;
  date: number;
  invoiceNumber: string;
  items: {
    itemId: number;
    name: string;
    quantity: number;
    costPrice: number;
    total: number;
  }[];
  totalAmount: number;
  status: 'Received' | 'Pending' | 'Cancelled';
}

export type View = 'Dashboard' | 'Inventory' | 'POS' | 'Purchases' | 'Sales' | 'Customers' | 'Suppliers' | 'Reports' | 'Settings';

export type Language = 'en' | 'ar';

export interface TranslationStrings {
  title: string;
  inventoryTitle: string;
  addItem: string;
  searchPlaceholder: string;
  noItems: string;
  quantity: string;
  price: string;
  stockStatus: string;
  lowStock: string;
  inStock: string;
  outOfStock: string;
  pos: {
    title: string;
    customer: string;
    addItem: string;
    total: string;
    checkout: string;
    emptySelection: string;
  };
  purchases: {
    title: string;
    supplier: string;
    invoice: string;
    addStock: string;
  };
  crm: {
    customers: string;
    suppliers: string;
    phone: string;
    addCustomer: string;
    addSupplier: string;
  };
  categories: {
    Oil: string;
    Filter: string;
    Brake: string;
    Other: string;
  };
  form: {
    nameLabel: string;
    nameArLabel: string;
    categoryLabel: string;
    quantityLabel: string;
    minQuantityLabel: string;
    priceLabel: string;
    costPriceLabel: string;
    barcodeLabel: string;
    manufacturerLabel: string;
    supplierLabel: string;
    save: string;
    cancel: string;
    scan: string;
  };
}

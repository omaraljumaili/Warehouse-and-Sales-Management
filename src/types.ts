/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */


export interface InventoryItem {
  id?: number;
  name: string;
  nameAr: string;
  categoryId?: number;
  unitId?: number;
  brandId?: number;
  quantity: number;
  minQuantity: number;
  price: number; // Selling Price
  costPrice: number; // Purchase Price
  lastUpdated: number;
  tags: string[];
  barcode?: string;
  manufacturer?: string;
  supplier?: string;
  archived?: boolean;
}

export interface BaseEntity {
  id?: number;
  name: string;
  nameAr: string;
  description?: string;
  descriptionAr?: string;
}

export interface Category extends BaseEntity {}

export interface Unit extends BaseEntity {}

export interface Brand extends BaseEntity {}

export interface Warehouse {
  id?: number;
  name: string;
  nameAr: string;
  isMain: boolean;
}

export interface StockTransfer {
  id?: number;
  fromWarehouseId: number;
  toWarehouseId: number;
  date: number;
  items: {
    itemId: number;
    quantity: number;
  }[];
  status: 'Pending' | 'Completed' | 'Cancelled';
}

export interface CashShift {
  id?: number;
  userId: number;
  openingDate: number;
  closingDate?: number;
  openingBalance: number;
  closingBalance?: number;
  actualClosingBalance?: number;
  status: 'Open' | 'Closed';
}

export interface CashEntry {
  id?: number;
  shiftId: number;
  type: 'In' | 'Out';
  amount: number;
  date: number;
  note: string;
}

export interface SuspendedSale {
  id?: number;
  date: number;
  customerId?: number;
  cart: {
    item: InventoryItem;
    qty: number;
  }[];
  total: number;
  discount?: number;
  discountType?: 'Fixed' | 'Percentage';
}

export interface WarehouseStock {
  itemId: number;
  warehouseId: number;
  quantity: number;
}

export interface AppSettings {
  id: string; // 'current'
  companyName: string;
  companyAddress: string;
  phone: string;
  taxNumber: string;
  currency: string;
  taxRate: number;
  logo?: string;
  invoiceTitle: string;
  invoiceNote: string;
  usdExchangeRate?: number;
  showUsd?: boolean;
  printFormat: 'A4' | '80mm';
}

export interface Customer {
  id?: number;
  name: string;
  nameAr?: string;
  phone: string;
  email?: string;
  address?: string;
  totalSpent: number;
  totalPaid: number;
  lastVisit: number;
  loyaltyPoints: number;
  debtLimit?: number;
}

export interface Supplier {
  id?: number;
  name: string;
  nameAr?: string;
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
  discount?: number;
  discountType?: 'Fixed' | 'Percentage';
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

export interface Expense {
  id?: number;
  category: string;
  amount: number;
  date: number;
  note: string;
  recurring: boolean;
}

export type View = 'Dashboard' | 'Inventory' | 'POS' | 'Purchases' | 'Sales' | 'Customers' | 'Suppliers' | 'Reports' | 'Settings' | 'Warehouses' | 'CashBox' | 'Users' | 'MasterData' | 'Expenses';

export type Language = 'en' | 'ar';

export interface TranslationStrings {
  title: string;
  inventoryTitle: string;
  addItem: string;
  delete: string;
  searchPlaceholder: string;
  noItems: string;
  loading: string;
  sidebar: {
    dashboard: string;
    pos: string;
    inventory: string;
    purchases: string;
    warehouses: string;
    cashBox: string;
    management: string;
    customers: string;
    suppliers: string;
    salesHistory: string;
    reports: string;
    settings: string;
    masterData: string;
    expenses: string;
  };
  dashboard: {
    title: string;
    revenue: string;
    vsLastMonth: string;
    profit: string;
    inventoryCount: string;
    alerts: string;
    liveSystem: string;
    displayed: string;
    noItemsFound: string;
    noItemsAdjustSearch: string;
  };
  inventory: {
    title: string;
    search: string;
    totalParts: string;
    lowStock: string;
    outOfStock: string;
    sortBy: string;
    recentlyUpdated: string;
    name: string;
    stockQuantity: string;
    price: string;
  };
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
    availableStock: string;
    qty: string;
    results: string;
    amountPaid: string;
    checkoutFailed: string;
    saleSuccess: string;
    printPrompt: string;
    printNow: string;
    close: string;
    cash: string;
    card: string;
    transfer: string;
    credit: string;
    partial: string;
    walkIn: string;
    discount: {
      title: string;
      direct: string;
      percentage: string;
      fixed: string;
      customerDebt: string;
      overdue: string;
      whatsapp: string;
      loyalty: string;
    };
    pointsEarned: string;
  };
  purchases: {
    title: string;
    supplier: string;
    invoice: string;
    addStock: string;
    searchItems: string;
    startEntry: string;
    addInstruction: string;
    itemCol: string;
    costCol: string;
    qtyCol: string;
    totalCol: string;
    grandTotal: string;
    quickAdd: string;
    saveSuccess: string;
    validationError: string;
    subtitle: string;
  };
  crm: {
    customers: string;
    suppliers: string;
    phone: string;
    email: string;
    address: string;
    addCustomer: string;
    addSupplier: string;
    editContact: string;
    fullName: string;
    fullNameAr: string;
    contactPerson: string;
    editPayment: string;
    recordPayment: string;
    amount: string;
    update: string;
    record: string;
    cancel: string;
    paymentHistory: string;
    recentSales: string;
    noHistory: string;
    spent: string;
    due: string;
    paymentDetails: string;
    method: string;
    date: string;
    actions: string;
    noDirectPayments: string;
    inventoryHealthy: string;
    criticalActions: string;
    inv: string;
    itemsCount: string;
    noSalesRecorded: string;
    searchContacts: string;
    confirmDelete: string;
    confirmDeletePayment: string;
    outOfStock: string;
    lowStock: string;
    noResults: string;
    noResultsSub: string;
    updateRecords: string;
    createContact: string;
    accountStatus: string;
    purchaseHistory: string;
    totalSpent: string;
    totalPaid: string;
    balanceDue: string;
  };
  reports: {
    title: string;
    subtitle: string;
    revenue: string;
    profit: string;
    salesCount: string;
    avgTicket: string;
    trend: string;
    bestSellers: string;
    days7: string;
    days30: string;
    allTime: string;
    sales: string;
  };
  salesHistory: {
    title: string;
    subtitle: string;
    search: string;
    totalAmount: string;
    noSales: string;
    reprint: string;
  };
  categories: {
    all: string;
    [key: string]: string;
  };
  form: {
    nameLabel: string;
    nameArLabel: string;
    namePlaceholder: string;
    nameArPlaceholder: string;
    categoryLabel: string;
    quantityLabel: string;
    minQuantityLabel: string;
    priceLabel: string;
    costPriceLabel: string;
    barcodeLabel: string;
    barcodePlaceholder: string;
    manufacturerLabel: string;
    manufacturerPlaceholder: string;
    supplierLabel: string;
    supplierPlaceholder: string;
    save: string;
    cancel: string;
    scan: string;
    editItem: string;
  };
  barcode: {
    scan: string;
    align: string;
  };
  settings: {
    title: string;
    subtitle: string;
    localization: string;
    switchLang: string;
    exportData: string;
    downloadJson: string;
    importBackup: string;
    uploadFile: string;
    dangerZone: string;
    dangerText: string;
    wipeDb: string;
    dbEngine: string;
    dbLatency: string;
    dbUptime: string;
    wipeConfirm: string;
    importConfirm: string;
    invalidFile: string;
    dataStorageInfo: string;
    printFormatLabel: string;
    formatA4: string;
    formatThermal: string;
  };
  invoice: {
    title: string;
    details: string;
    date: string;
    payment: string;
    customerInfo: string;
    cashCustomer: string;
    description: string;
    qty: string;
    unitPrice: string;
    total: string;
    subtotal: string;
    grandTotal: string;
    paid: string;
    balance: string;
    thanks: string;
    terms: string;
  };
  warehouses: {
    title: string;
    main: string;
    stock: string;
    transfer: string;
    from: string;
    to: string;
    items: string;
    history: string;
    addWarehouse: string;
  };
  cashBox: {
    title: string;
    shift: string;
    openShift: string;
    closeShift: string;
    balance: string;
    expected: string;
    actual: string;
    diff: string;
    cashIn: string;
    cashOut: string;
    entryNote: string;
    lastShifts: string;
    expenses?: string;
  };
  expenses: {
    title: string;
    add: string;
    amount: string;
    note: string;
    category: string;
    date: string;
    recurring: string;
    noExpenses: string;
  };
}

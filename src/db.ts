/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Dexie, { type Table } from 'dexie';
import type { 
  InventoryItem, Customer, Supplier, Sale, Purchase, Payment, 
  Warehouse, StockTransfer, Category, Brand, Unit, 
  CashShift, CashEntry, SuspendedSale, WarehouseStock, AppSettings,
  Expense
} from './types';

export class InventoryDatabase extends Dexie {
  items!: Table<InventoryItem>;
  customers!: Table<Customer>;
  suppliers!: Table<Supplier>;
  sales!: Table<Sale>;
  purchases!: Table<Purchase>;
  payments!: Table<Payment>;
  warehouses!: Table<Warehouse>;
  stockTransfers!: Table<StockTransfer>;
  categories!: Table<Category>;
  brands!: Table<Brand>;
  units!: Table<Unit>;
  cashShifts!: Table<CashShift>;
  cashEntries!: Table<CashEntry>;
  suspendedSales!: Table<SuspendedSale>;
  warehouseStocks!: Table<WarehouseStock>;
  settings!: Table<AppSettings>;
  expenses!: Table<Expense>;

  constructor() {
    super('SmartFlowDB');
    // Previous versions kept for history or direct set to latest
    this.version(7).stores({
      items: '++id, name, nameAr, categoryId, quantity, barcode, archived',
      customers: '++id, name, phone, lastVisit',
      suppliers: '++id, name, phone',
      sales: '++id, customerId, date',
      purchases: '++id, supplierId, date, invoiceNumber',
      payments: '++id, customerId, date',
      warehouses: '++id, name, isMain',
      stockTransfers: '++id, fromWarehouseId, toWarehouseId, date',
      categories: '++id, name, nameAr',
      brands: '++id, name, nameAr',
      units: '++id, name, nameAr',
      cashShifts: '++id, userId, openingDate, status',
      cashEntries: '++id, shiftId, date, type',
      suspendedSales: '++id, date',
      warehouseStocks: '[itemId+warehouseId], itemId, warehouseId',
      settings: 'id',
      expenses: '++id, date, category'
    });
  }
}

export const db = new InventoryDatabase();

// Better opening logic
db.open().catch(err => {
  console.error("Failed to open db:", err.stack || err);
  if (err.name === 'VersionError') {
    console.warn("Database version mismatch. Attempting to delete and recreate...");
    // Only in development/sandbox:
    // Dexie.delete('SmartFlowDB').then(() => window.location.reload());
  }
});

db.on('blocked', () => {
  console.warn("Database opening is blocked by another tab.");
});

// Seed data
export async function seedDatabase() {
  try {
    const itemCount = await db.items.count();
    const warehouseCount = await db.warehouses.count();
    const categoryCount = await db.categories.count();

    let mainWarehouseId: number | undefined;
    let catOil: number | undefined;
    let catFilters: number | undefined;
    let catBrakes: number | undefined;

    if (warehouseCount === 0) {
      mainWarehouseId = await db.warehouses.add({ name: 'Main Store', nameAr: 'المخزن الرئيسي', isMain: true }) as number;
      await db.warehouses.add({ name: 'Retail Outlet', nameAr: 'منفذ البيع', isMain: false });
    } else {
      const main = await db.warehouses.where('isMain').equals(1).first();
      mainWarehouseId = main?.id;
    }

    if (categoryCount === 0) {
      catOil = await db.categories.add({ name: 'Oil & Lubricants', nameAr: 'زيوت وتشحيم' }) as number;
      catFilters = await db.categories.add({ name: 'Filters', nameAr: 'فلاتر' }) as number;
      catBrakes = await db.categories.add({ name: 'Brake Systems', nameAr: 'نظام الفرامل' }) as number;
    }

    if (itemCount === 0 && mainWarehouseId && catOil && catFilters && catBrakes) {
      console.log("Seeding items...");
      
      const itemsToAdd = [
        {
          name: 'Synthetic Engine Oil 5W-30',
          nameAr: 'زيت محرك اصطناعي 5W-30',
          categoryId: catOil,
          quantity: 45,
          minQuantity: 10,
          price: 35.0,
          costPrice: 22.5,
          lastUpdated: Date.now(),
          tags: ['Engine', 'Synthetic'],
          barcode: '5012345678901',
          manufacturer: 'Mobil 1',
          supplier: 'Exxon Global'
        },
        {
          name: 'Oil Filter Premium',
          nameAr: 'فلتر زيت بريميوم',
          categoryId: catFilters,
          quantity: 120,
          minQuantity: 20,
          price: 12.5,
          costPrice: 6.5,
          lastUpdated: Date.now(),
          tags: ['Filter', 'Premium'],
          barcode: '5012345678902',
          manufacturer: 'Bosch',
          supplier: 'Bosch Auto Parts'
        },
        {
          name: 'Brake Pads Set',
          nameAr: 'مجموعة بطانات الفرامل',
          categoryId: catBrakes,
          quantity: 8,
          minQuantity: 15,
          price: 85.0,
          costPrice: 45.0,
          lastUpdated: Date.now(),
          tags: ['Brake', 'Safety'],
          barcode: '5012345678903',
          manufacturer: 'Brembo',
          supplier: 'Performance Parts Co'
        }
      ];

      for (const item of itemsToAdd) {
        const id = await db.items.add(item);
        await db.warehouseStocks.add({
          itemId: id as number,
          warehouseId: mainWarehouseId,
          quantity: item.quantity
        });
      }
    }

    const hasSettings = await db.settings.count();
    if (hasSettings === 0) {
      await db.settings.add({
        id: 'current',
        companyName: 'SmartFlow Enterprise',
        companyAddress: 'Dubai, UAE',
        phone: '+971 50 123 4567',
        taxNumber: 'TRN-100200300',
        currency: 'د.ع',
        taxRate: 5,
        printFormat: '80mm',
        usdExchangeRate: 1500,
        invoiceTitle: 'Tax Invoice',
        invoiceNote: 'Thank you for your business!'
      });
    }
  } catch (error) {
    console.error("Failed to seed database:", error);
    // If opening failed due to version mismatch, we might need to delete and recreate or handle upgrade
  }
}

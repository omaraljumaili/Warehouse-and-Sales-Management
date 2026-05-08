/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Dexie, { type Table } from 'dexie';
import type { InventoryItem, Customer, Supplier, Sale, Purchase, Payment } from './types';

export class InventoryDatabase extends Dexie {
  items!: Table<InventoryItem>;
  customers!: Table<Customer>;
  suppliers!: Table<Supplier>;
  sales!: Table<Sale>;
  purchases!: Table<Purchase>;
  payments!: Table<Payment>;

  constructor() {
    super('SmartFlowDB');
    // Version 1 definition
    this.version(1).stores({
      items: '++id, name, nameAr, category, quantity, lastUpdated'
    });
    // Version 2 definition
    this.version(2).stores({
      items: '++id, name, nameAr, category, quantity, lastUpdated, barcode, manufacturer, supplier'
    });
    // Version 3: Full POS and Sales support
    this.version(3).stores({
      items: '++id, name, nameAr, category, quantity, lastUpdated, barcode, manufacturer, supplier',
      customers: '++id, name, phone, lastVisit',
      suppliers: '++id, name, phone',
      sales: '++id, customerId, date',
      purchases: '++id, supplierId, date, invoiceNumber'
    });
    // Version 4: Payment tracking
    this.version(4).stores({
      customers: '++id, name, phone, lastVisit, totalPaid',
      sales: '++id, customerId, date, amountPaid, paymentMethod'
    }).upgrade(tx => {
       console.log("Upgrading to version 4 (Payment Tracking)...");
    });
    // Version 5: Payment records
    this.version(5).stores({
      payments: '++id, customerId, date'
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
    const count = await db.items.count();
    if (count === 0) {
      console.log("Seeding database with initial data...");
      await db.items.bulkAdd([
        {
          name: 'Synthetic Engine Oil 5W-30',
          nameAr: 'زيت محرك اصطناعي 5W-30',
          category: 'Oil',
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
          category: 'Filter',
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
          category: 'Brake',
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
      ]);
    }
  } catch (error) {
    console.error("Failed to seed database:", error);
    // If opening failed due to version mismatch, we might need to delete and recreate or handle upgrade
  }
}

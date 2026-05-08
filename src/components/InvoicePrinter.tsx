import React from 'react';
import type { Sale, Language } from '../types';

interface InvoicePrinterProps {
  sale: Sale;
  lang: Language;
}

export function InvoicePrinter({ sale, lang }: InvoicePrinterProps) {
  const isAr = lang === 'ar';
  
  return (
    <div id="invoice-print-area" className="invoice-print-only bg-white text-black font-sans w-[210mm] min-h-[297mm] mx-auto text-sm" dir={isAr ? 'rtl' : 'ltr'}>
      <style>{`
        @media screen {
          .invoice-print-only { display: none; }
        }
        @media print {
          @page { size: A4; margin: 0; }
          html, body {
            height: 100vh;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden;
          }
          body > * {
            display: none !important;
          }
          .invoice-print-only {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            padding: 2cm !important;
            background: white !important;
            z-index: 9999 !important;
          }
          .invoice-print-only * {
            visibility: visible !important;
          }
        }
      `}</style>

      <div className="flex justify-between items-start mb-12">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-apple-blue mb-2">SMARTFLOW</h1>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Enterprise Inventory & POS Solution</p>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{isAr ? 'فاتورة مبيعات' : 'Sales Invoice'}</h2>
          <p className="text-gray-500 font-medium">#{sale.id || 'DRAFT'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-12 border-y border-gray-100 py-8">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{isAr ? 'تفاصيل الفاتورة' : 'Invoice Details'}</p>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="font-bold text-gray-500">{isAr ? 'التاريخ:' : 'Date:'}</span>
              <span className="font-bold">{new Date(sale.date).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-gray-500">{isAr ? 'وسيلة الدفع:' : 'Payment:'}</span>
              <span className="font-bold">
                {sale.paymentMethod === 'Cash' ? (isAr ? 'نقداً' : 'Cash') : 
                 sale.paymentMethod === 'Card' ? (isAr ? 'بطاقة' : 'Card') : 
                 sale.paymentMethod === 'Credit' ? (isAr ? 'آجل' : 'Credit') : 
                 (isAr ? 'دفع جزئي' : 'Partial')}
              </span>
            </div>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{isAr ? 'معلومات العميل' : 'Customer Info'}</p>
          <p className="font-bold text-lg">{sale.customerId ? `Customer ID: ${sale.customerId}` : (isAr ? 'عميل نقدي' : 'Cash Customer')}</p>
        </div>
      </div>
      
      <table className="w-full mb-12">
        <thead>
          <tr className="text-left border-b-2 border-gray-900">
            <th className="py-4 font-black uppercase text-xs">{isAr ? 'البيان' : 'Description'}</th>
            <th className="py-4 font-black uppercase text-xs text-center">{isAr ? 'الكمية' : 'Qty'}</th>
            <th className="py-4 font-black uppercase text-xs text-right">{isAr ? 'سعر الوحدة' : 'Unit Price'}</th>
            <th className="py-4 font-black uppercase text-xs text-right">{isAr ? 'المجموع' : 'Total'}</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-5 font-bold text-gray-900">{item.name}</td>
              <td className="py-5 text-center font-bold">{item.quantity}</td>
              <td className="py-5 text-right font-medium">${item.price.toFixed(2)}</td>
              <td className="py-5 text-right font-black">${item.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="w-80 space-y-4">
          <div className="flex justify-between text-gray-500 font-bold">
            <span>{isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
            <span>${sale.totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-apple-blue font-black text-xl border-t border-gray-100 pt-4">
            <span>{isAr ? 'الإجمالي الكلي:' : 'Grand Total:'}</span>
            <span>${sale.totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-900 font-bold bg-gray-50 p-4 rounded-xl mt-4">
            <span>{isAr ? 'المدفوع:' : 'Total Paid:'}</span>
            <span>${sale.amountPaid.toFixed(2)}</span>
          </div>
          {(sale.totalAmount - sale.amountPaid > 0) && (
            <div className="flex justify-between text-red-600 font-black px-4">
              <span>{isAr ? 'المتبقي:' : 'Balance Due:'}</span>
              <span>${(sale.totalAmount - sale.amountPaid).toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto pt-20 text-center text-gray-400">
        <div className="border-t border-dashed border-gray-200 pt-8">
          <p className="font-bold text-gray-900 mb-1">{isAr ? 'شكراً لتعاملكم معنا!' : 'Thank you for choosing SmartFlow'}</p>
          <p className="text-[10px] uppercase tracking-widest">{isAr ? 'تطبق الشروط والأحكام' : 'Terms and conditions apply'}</p>
        </div>
      </div>
    </div>
  );
}

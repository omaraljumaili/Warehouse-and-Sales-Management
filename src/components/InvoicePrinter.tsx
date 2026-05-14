import React from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Sale, Language, TranslationStrings, AppSettings } from '../types';
import { cn } from '../lib/utils';

interface InvoicePrinterProps {
  sale: Sale;
  lang: Language;
  t: TranslationStrings;
  settings?: AppSettings | null;
}

export function InvoicePrinter({ sale, lang, t, settings: propSettings }: InvoicePrinterProps) {
  const isAr = lang === 'ar';
  const ti = t.invoice;
  const liveSettings = useLiveQuery(() => db.settings.get('current'));
  const settings = propSettings || liveSettings;
  
  if (!settings) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white print:hidden">
        <p className="font-bold text-gray-400">Loading invoice...</p>
      </div>,
      document.body
    );
  }

  const taxAmount = (sale.totalAmount * (settings.taxRate / 100));
  const subtotalBeforeTax = sale.totalAmount - taxAmount;

  return createPortal(
    <div id="smartflow-invoice-printer" className={cn("invoice-print-only bg-white text-black font-sans mx-auto text-sm", settings.printFormat === '80mm' ? 'w-[80mm] p-4 text-[12px]' : 'w-[210mm] p-12')} dir={isAr ? 'rtl' : 'ltr'}>
      <style>{`
        @media screen {
          #smartflow-invoice-printer { display: none !important; }
        }
        @media print {
          @page { 
            size: ${settings.printFormat === '80mm' ? '80mm auto' : 'A4'}; 
            margin: 0; 
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #root {
            visibility: hidden !important;
            position: absolute !important;
            left: -9999px !important;
            top: -9999px !important;
          }
          #smartflow-invoice-printer {
            visibility: visible !important;
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${settings.printFormat === '80mm' ? '80mm' : '100%'} !important;
            margin: 0 auto !important;
            padding: ${settings.printFormat === '80mm' ? '4mm' : '10mm'} !important;
            min-height: 0 !important;
          }
        }
      `}</style>

      {settings.printFormat === '80mm' ? (
        /* Thermal Receipt Layout */
        <div className="flex flex-col items-center text-center">
          <h1 className="text-xl font-black mb-1">{settings.companyName}</h1>
          <p className="text-[10px] font-bold text-gray-500 mb-1">{settings.companyAddress}</p>
          <p className="text-[10px] mb-4">{settings.phone}</p>
          
          <div className="w-full border-t border-dashed border-gray-300 py-2 mb-2">
            <p className="text-[10px] font-bold uppercase">{settings.invoiceTitle || ti.title}</p>
            <p className="text-[10px]">#{sale.id}</p>
            <p className="text-[10px]">{new Date(sale.date).toLocaleString(isAr ? 'ar-EG' : 'en-US')}</p>
          </div>

          <table className="w-full text-[11px] mb-4">
            <thead>
              <tr className="border-b border-dashed border-gray-300 font-bold">
                <th className={cn("py-1", isAr ? "text-right" : "text-left")}>{ti.description}</th>
                <th className="py-1 text-center">{ti.qty}</th>
                <th className={cn("py-1", isAr ? "text-left" : "text-right")}>{ti.total}</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, i) => (
                <tr key={i}>
                  <td className={cn("py-2", isAr ? "text-right" : "text-left")}>{item.name}</td>
                  <td className="py-2 text-center">{item.quantity}</td>
                  <td className={cn("py-2", isAr ? "text-left" : "text-right")}>{settings.currency}{item.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="w-full border-t border-dashed border-gray-300 pt-2 space-y-1">
            <div className="flex justify-between font-bold text-[10px]">
              <span>{ti.subtotal}:</span>
              <span>{settings.currency}{subtotalBeforeTax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-[12px]">
              <span>{ti.grandTotal}:</span>
              <span>{settings.currency}{sale.totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-[10px] border-t border-dotted border-gray-200 mt-1 pt-1">
              <span>{ti.paid}:</span>
              <span>{settings.currency}{sale.amountPaid.toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-6 text-[10px] italic">
            <p className="font-bold">{settings.invoiceNote || ti.thanks}</p>
            <p className="mt-1">TRN: {settings.taxNumber}</p>
          </div>
        </div>
      ) : (
        /* Original A4 Layout */
        <>
          <div className="flex justify-between items-start mb-12">
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-apple-blue mb-2 uppercase">{settings.companyName}</h1>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{settings.companyAddress}</p>
              <p className="text-[10px] text-gray-400 mt-1">{settings.phone}</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{settings.invoiceTitle || ti.title}</h2>
              <p className="text-gray-500 font-medium">#{sale.id || 'DRAFT'}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">TRN: {settings.taxNumber}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 mb-12 border-y border-gray-100 py-8">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{ti.details}</p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="font-bold text-gray-500">{ti.date}:</span>
                  <span className="font-bold">{new Date(sale.date).toLocaleString(isAr ? 'ar-EG' : 'en-US')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-gray-500">{ti.payment}:</span>
                  <span className="font-bold">
                    {sale.paymentMethod === 'Cash' ? t.pos.cash : 
                    sale.paymentMethod === 'Card' ? t.pos.card : 
                    sale.paymentMethod === 'Credit' ? t.pos.credit : 
                    t.pos.partial}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{ti.customerInfo}</p>
              <p className="font-bold text-lg">{sale.customerId ? `${t.pos.customer} ID: ${sale.customerId}` : ti.cashCustomer}</p>
            </div>
          </div>
          
          <table className="w-full mb-12">
            <thead>
              <tr className={cn(isAr ? "text-right" : "text-left", "border-b-2 border-gray-900")}>
                <th className="py-4 font-black uppercase text-xs">{ti.description}</th>
                <th className="py-4 font-black uppercase text-xs text-center">{ti.qty}</th>
                <th className={cn("py-4 font-black uppercase text-xs", isAr ? "text-left" : "text-right")}>{ti.unitPrice}</th>
                <th className={cn("py-4 font-black uppercase text-xs", isAr ? "text-left" : "text-right")}>{ti.total}</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-5 font-bold text-gray-900">{item.name}</td>
                  <td className="py-5 text-center font-bold">{item.quantity}</td>
                  <td className={cn("py-5 font-medium", isAr ? "text-left" : "text-right")}>{settings.currency}{item.price.toLocaleString()}</td>
                  <td className={cn("py-5 font-black", isAr ? "text-left" : "text-right")}>{settings.currency}{item.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-80 space-y-4">
              <div className="flex justify-between text-gray-500 font-bold">
                <span>{ti.subtotal}:</span>
                <span>{settings.currency}{subtotalBeforeTax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-500 font-bold">
                <span>{lang === 'ar' ? 'الضريبة' : 'Tax'} ({settings.taxRate}%):</span>
                <span>{settings.currency}{taxAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-apple-blue font-black text-xl border-t border-gray-100 pt-4">
                <span>{ti.grandTotal}:</span>
                <span>{settings.currency}{sale.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-900 font-bold bg-gray-50 p-4 rounded-xl mt-4">
                <span>{ti.paid}:</span>
                <span>{settings.currency}{sale.amountPaid.toLocaleString()}</span>
              </div>
              {(sale.totalAmount - sale.amountPaid > 0) && (
                <div className="flex justify-between text-red-600 font-black px-4">
                  <span>{ti.balance}:</span>
                  <span>{settings.currency}{(sale.totalAmount - sale.amountPaid).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto pt-20 text-center text-gray-400">
            <div className="border-t border-dashed border-gray-200 pt-8">
              <p className="font-bold text-gray-900 mb-1">{settings.invoiceNote || ti.thanks}</p>
              <p className="text-[10px] uppercase tracking-widest">{ti.terms}</p>
            </div>
          </div>
        </>
      )}
    </div>,
    document.body
  );
}

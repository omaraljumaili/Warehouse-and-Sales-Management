import React from 'react';
import { db } from '../db';
import { Shield, Database, Trash2, Globe, Cpu, LifeBuoy, Settings, Download, Upload } from 'lucide-react';
import type { Language } from '../types';
import { cn } from '../lib/utils';

interface SettingsViewProps {
  lang: Language;
  onLangToggle: () => void;
}

export function SettingsView({ lang, onLangToggle }: SettingsViewProps) {
  const handleWipeData = async () => {
    if (confirm(lang === 'en' ? 'CRITICAL: This will delete ALL business data permanently. Are you sure?' : 'خطر: هذا سيحذف جميع بيانات المؤسسة بشكل نهائي. هل أنت متأكد؟')) {
      try {
        await db.transaction('rw',
          [db.items, db.sales, db.purchases, db.customers, db.suppliers, db.payments],
          async () => {
            await Promise.all([
              db.items.clear(),
              db.sales.clear(),
              db.purchases.clear(),
              db.customers.clear(),
              db.suppliers.clear(),
              db.payments.clear(),
            ]);
          }
        );
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert(lang === 'en' ? 'Failed to wipe database.' : 'فشل مسح قاعدة البيانات.');
      }
    }
  };

  const handleExport = async () => {
    const data = {
      items: await db.items.toArray(),
      sales: await db.sales.toArray(),
      purchases: await db.purchases.toArray(),
      customers: await db.customers.toArray(),
      suppliers: await db.suppliers.toArray(),
      payments: await db.payments.toArray(),
      version: '1.1',
      exportDate: Date.now()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartflow_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event: ProgressEvent<FileReader>) => {
        try {
          const raw = event.target?.result;
          if (typeof raw !== 'string') throw new Error('Unreadable file');
          const data = JSON.parse(raw);

          // Schema validation: each section must be an array if present
          const sections = ['items', 'sales', 'purchases', 'customers', 'suppliers', 'payments'] as const;
          if (typeof data !== 'object' || data === null) throw new Error('Not an object');
          for (const key of sections) {
            if (data[key] !== undefined && !Array.isArray(data[key])) {
              throw new Error(`Field "${key}" must be an array`);
            }
          }

          if (confirm(lang === 'en' ? 'This will overwrite existing data. Proceed?' : 'سيقوم هذا الكتابة فوق البيانات الحالية. هل تريد الاستمرار؟')) {
             await db.transaction('rw',
               [db.items, db.sales, db.purchases, db.customers, db.suppliers, db.payments],
               async () => {
                  await Promise.all([
                    db.items.clear(),
                    db.sales.clear(),
                    db.purchases.clear(),
                    db.customers.clear(),
                    db.suppliers.clear(),
                    db.payments.clear(),
                  ]);
                  if (data.items) await db.items.bulkAdd(data.items);
                  if (data.sales) await db.sales.bulkAdd(data.sales);
                  if (data.purchases) await db.purchases.bulkAdd(data.purchases);
                  if (data.customers) await db.customers.bulkAdd(data.customers);
                  if (data.suppliers) await db.suppliers.bulkAdd(data.suppliers);
                  if (data.payments) await db.payments.bulkAdd(data.payments);
               }
             );
             window.location.reload();
          }
        } catch (err) {
          console.error(err);
          alert(lang === 'en' ? `Invalid backup file: ${(err as Error).message}` : `ملف نسخ احتياطي غير صالح: ${(err as Error).message}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black text-apple-dark-blue tracking-tighter flex items-center gap-4">
            <Settings size={40} className="text-apple-blue" strokeWidth={3} />
            {lang === 'en' ? 'System Settings' : 'إعدادات النظام'}
          </h2>
          <p className="text-apple-gray font-medium mt-1">Configure your workspace and database</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col items-center text-center group">
          <div className="w-14 h-14 bg-blue-50 rounded-[24px] flex items-center justify-center text-apple-blue mb-6">
            <Globe size={28} />
          </div>
          <h3 className="text-lg font-bold text-apple-dark-blue mb-2">{lang === 'en' ? 'Localization' : 'اللغة'}</h3>
          <button 
            onClick={onLangToggle}
            className="w-full mt-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-[10px] font-black uppercase tracking-widest text-apple-blue hover:bg-apple-blue hover:text-white transition-all"
          >
            {lang === 'en' ? 'Switch to Arabic' : 'التغيير إلى الإنجليزية'}
          </button>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col items-center text-center group">
          <div className="w-14 h-14 bg-green-50 rounded-[24px] flex items-center justify-center text-apple-green mb-6">
            <Download size={28} />
          </div>
          <h3 className="text-lg font-bold text-apple-dark-blue mb-2">{lang === 'en' ? 'Export Data' : 'تصدير البيانات'}</h3>
          <button 
            onClick={handleExport}
            className="w-full mt-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-[10px] font-black uppercase tracking-widest text-apple-green hover:bg-apple-green hover:text-white transition-all"
          >
            {lang === 'en' ? 'Download JSON' : 'تحميل JSON'}
          </button>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col items-center text-center group">
          <div className="w-14 h-14 bg-purple-50 rounded-[24px] flex items-center justify-center text-apple-purple mb-6">
            <Upload size={28} />
          </div>
          <h3 className="text-lg font-bold text-apple-dark-blue mb-2">{lang === 'en' ? 'Import Backup' : 'استيراد نسخة'}</h3>
          <button 
            onClick={handleImport}
            className="w-full mt-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-[10px] font-black uppercase tracking-widest text-apple-purple hover:bg-apple-purple hover:text-white transition-all"
          >
             {lang === 'en' ? 'Upload File' : 'رفع ملف'}
          </button>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[48px] border border-red-100 shadow-sm flex flex-col items-center text-center group bg-gradient-to-br from-white to-red-50/30">
          <div className="w-16 h-16 bg-red-50 rounded-[28px] flex items-center justify-center text-red-500 mb-6 group-hover:scale-110 transition-transform">
            <Shield size={32} />
          </div>
          <h3 className="text-xl font-bold text-apple-dark-blue mb-2">{lang === 'en' ? 'Danger Zone' : 'منطقة الخطر'}</h3>
          <p className="text-xs text-gray-400 font-medium mb-8">Permanently wipe all local database records. Use with caution.</p>
          <button 
            onClick={handleWipeData}
            className="w-full max-w-xs h-14 rounded-2xl bg-red-500 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-red-500/20 hover:scale-[1.03] active:scale-95 transition-all"
          >
            {lang === 'en' ? 'Wipe Entire Database' : 'مسح قاعدة البيانات بالكامل'}
          </button>
      </div>

      <div className="bg-apple-dark-blue p-12 rounded-[56px] text-white flex flex-col md:flex-row items-center gap-10">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
             <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <Database size={20} className="text-apple-blue" />
             </div>
             <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Database Engine</p>
          </div>
          <h3 className="text-3xl font-black mb-4">Dexie-DB Local Storage v4.0</h3>
          <p className="text-white/60 font-medium leading-relaxed max-w-sm">
            Your data is stored locally in your browser using high-performance IndexedDB technology. 
            No cloud subscription required. Complete offline privacy.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
           <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center text-center min-w-[120px]">
              <Cpu size={24} className="text-apple-green mb-3" />
              <p className="text-xl font-black">24.5ms</p>
              <p className="text-[9px] text-white/40 font-black uppercase mt-1">Latency</p>
           </div>
           <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center text-center min-w-[120px]">
              <LifeBuoy size={24} className="text-apple-purple mb-3" />
              <p className="text-xl font-black">100%</p>
              <p className="text-[9px] text-white/40 font-black uppercase mt-1">Uptime</p>
           </div>
        </div>
      </div>
    </div>
  );
}


import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Shield, Database, Trash2, Globe, Cpu, LifeBuoy, Settings, Download, Upload, Building2, Receipt, Save } from 'lucide-react';
import type { Language, AppSettings } from '../types';
import { cn } from '../lib/utils';

interface SettingsViewProps {
  lang: Language;
  t: any;
  onLangToggle: () => void;
}

export function SettingsView({ lang, t, onLangToggle }: SettingsViewProps) {
  const ts = t.settings;
  const settings = useLiveQuery(() => db.settings.get('current'));
  const [formData, setFormData] = useState<AppSettings | null>(null);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      await db.settings.put(formData);
      alert(lang === 'ar' ? 'تم حفظ الإعدادات' : 'Settings saved');
    }
  };
  const handleWipeData = async () => {
    if (confirm(ts.wipeConfirm)) {
      await db.items.clear();
      await db.sales.clear();
      await db.purchases.clear();
      await db.customers.clear();
      await db.suppliers.clear();
      window.location.reload();
    }
  };

  const handleExport = async () => {
    const data = {
      items: await db.items.toArray(),
      sales: await db.sales.toArray(),
      purchases: await db.purchases.toArray(),
      customers: await db.customers.toArray(),
      suppliers: await db.suppliers.toArray(),
      version: '1.0',
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
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (event: any) => {
        try {
          const data = JSON.parse(event.target.result);
          if (confirm(ts.importConfirm)) {
             await db.transaction('rw', [db.items, db.sales, db.purchases, db.customers, db.suppliers], async () => {
                await Promise.all([
                  db.items.clear(),
                  db.sales.clear(),
                  db.purchases.clear(),
                  db.customers.clear(),
                  db.suppliers.clear()
                ]);
                if (data.items) await db.items.bulkAdd(data.items);
                if (data.sales) await db.sales.bulkAdd(data.sales);
                if (data.purchases) await db.purchases.bulkAdd(data.purchases);
                if (data.customers) await db.customers.bulkAdd(data.customers);
                if (data.suppliers) await db.suppliers.bulkAdd(data.suppliers);
             });
             window.location.reload();
          }
        } catch (err) {
          alert(ts.invalidFile);
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
            {ts.title}
          </h2>
          <p className="text-apple-gray font-medium mt-1">{ts.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col items-center text-center group">
          <div className="w-14 h-14 bg-blue-50 rounded-[24px] flex items-center justify-center text-apple-blue mb-6">
            <Globe size={28} />
          </div>
          <h3 className="text-lg font-bold text-apple-dark-blue mb-2">{ts.localization}</h3>
          <button 
            type="button"
            onClick={onLangToggle}
            className="w-full mt-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-[10px] font-black uppercase tracking-widest text-apple-blue hover:bg-apple-blue hover:text-white transition-all"
          >
            {ts.switchLang}
          </button>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col items-center text-center group">
          <div className="w-14 h-14 bg-green-50 rounded-[24px] flex items-center justify-center text-apple-green mb-6">
            <Download size={28} />
          </div>
          <h3 className="text-lg font-bold text-apple-dark-blue mb-2">{ts.exportData}</h3>
          <button 
            type="button"
            onClick={() => handleExport()}
            className="w-full mt-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-[10px] font-black uppercase tracking-widest text-apple-green hover:bg-apple-green hover:text-white transition-all"
          >
            {ts.downloadJson}
          </button>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col items-center text-center group">
          <div className="w-14 h-14 bg-purple-50 rounded-[24px] flex items-center justify-center text-apple-purple mb-6">
            <Upload size={28} />
          </div>
          <h3 className="text-lg font-bold text-apple-dark-blue mb-2">{ts.importBackup}</h3>
          <button 
            type="button"
            onClick={() => handleImport()}
            className="w-full mt-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-[10px] font-black uppercase tracking-widest text-apple-purple hover:bg-apple-purple hover:text-white transition-all"
          >
             {ts.uploadFile}
          </button>
        </div>
      </div>

      {formData && (
        <form onSubmit={handleSaveSettings} className="space-y-8">
            <div className="bg-white p-10 rounded-[48px] border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-apple-blue/10 rounded-2xl flex items-center justify-center text-apple-blue">
                        <Building2 size={24} />
                    </div>
                    <h3 className="text-2xl font-black text-apple-dark-blue">{lang === 'ar' ? 'بيانات المؤسسة' : 'Company Info'}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                            {lang === 'ar' ? 'اسم المؤسسة' : 'Company Name'}
                        </label>
                        <input 
                            value={formData.companyName} 
                            onChange={e => setFormData({...formData, companyName: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none" 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                            {lang === 'ar' ? 'العنوان' : 'Address'}
                        </label>
                        <input 
                            value={formData.companyAddress} 
                            onChange={e => setFormData({...formData, companyAddress: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none" 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                            {lang === 'ar' ? 'رقم الهاتف' : 'Phone'}
                        </label>
                        <input 
                            value={formData.phone} 
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none" 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                            {lang === 'ar' ? 'الرقم الضريبي' : 'Tax Number'}
                        </label>
                        <input 
                            value={formData.taxNumber} 
                            onChange={e => setFormData({...formData, taxNumber: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none" 
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white p-10 rounded-[48px] border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-apple-purple/10 rounded-2xl flex items-center justify-center text-apple-purple">
                        <Receipt size={24} />
                    </div>
                    <h3 className="text-2xl font-black text-apple-dark-blue">{lang === 'ar' ? 'إعدادات الفاتورة' : 'Invoice Settings'}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                            {lang === 'ar' ? 'عنوان الفاتورة' : 'Invoice Title'}
                        </label>
                        <input 
                            value={formData.invoiceTitle} 
                            onChange={e => setFormData({...formData, invoiceTitle: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none" 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                            {ts.printFormatLabel}
                        </label>
                        <select 
                            value={formData.printFormat}
                            onChange={e => setFormData({...formData, printFormat: e.target.value as any})}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none appearance-none"
                        >
                            <option value="A4">{ts.formatA4}</option>
                            <option value="80mm">{ts.formatThermal}</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                            {lang === 'ar' ? 'العملة' : 'Currency'}
                        </label>
                        <input 
                            value={formData.currency} 
                            onChange={e => setFormData({...formData, currency: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none" 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                            {lang === 'ar' ? 'نسبة الضريبة (%)' : 'Tax Rate (%)'}
                        </label>
                        <input 
                            type="number"
                            value={formData.taxRate} 
                            onChange={e => setFormData({...formData, taxRate: parseFloat(e.target.value) || 0})}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none" 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                            {lang === 'ar' ? 'سعر صرف الدولار (للدينار الواحد)' : 'USD Exchange Rate (1 USD = ?)'}
                        </label>
                        <input 
                            type="number"
                            value={formData.usdExchangeRate || ''} 
                            onChange={e => setFormData({...formData, usdExchangeRate: parseFloat(e.target.value) || 0})}
                            placeholder="e.g. 1500"
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none" 
                        />
                    </div>
                </div>
                <div className="mt-6 space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                        {lang === 'ar' ? 'ملاحظة الفاتورة' : 'Invoice Note'}
                    </label>
                    <textarea 
                        value={formData.invoiceNote} 
                        onChange={e => setFormData({...formData, invoiceNote: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none h-24 resize-none" 
                    />
                </div>

                <div className="mt-8 flex justify-end">
                    <button 
                        type="submit"
                        className="h-14 px-10 rounded-2xl bg-apple-blue text-white font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-apple-blue/20 hover:scale-[1.03] active:scale-95 transition-all"
                    >
                        <Save size={20} />
                        {lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </form>
      )}

      <div className="bg-white p-10 rounded-[48px] border border-red-100 shadow-sm flex flex-col items-center text-center group bg-gradient-to-br from-white to-red-50/30">
          <div className="w-16 h-16 bg-red-50 rounded-[28px] flex items-center justify-center text-red-500 mb-6 group-hover:scale-110 transition-transform">
            <Shield size={32} />
          </div>
          <h3 className="text-xl font-bold text-apple-dark-blue mb-2">{ts.dangerZone}</h3>
          <p className="text-xs text-gray-400 font-medium mb-8">{ts.dangerText}</p>
          <button 
            onClick={handleWipeData}
            className="w-full max-w-xs h-14 rounded-2xl bg-red-500 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-red-500/20 hover:scale-[1.03] active:scale-95 transition-all"
          >
            {ts.wipeDb}
          </button>
      </div>

      <div className="bg-apple-dark-blue p-12 rounded-[56px] text-white flex flex-col md:flex-row items-center gap-10">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
             <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <Database size={20} className="text-apple-blue" />
             </div>
             <p className="text-[10px] font-black uppercase tracking-widest text-white/40">{ts.dbEngine}</p>
          </div>
          <h3 className="text-3xl font-black mb-4">Dexie-DB Local Storage v4.0</h3>
          <p className="text-white/60 font-medium leading-relaxed max-w-sm">
            {ts.dataStorageInfo}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
           <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center text-center min-w-[120px]">
              <Cpu size={24} className="text-apple-green mb-3" />
              <p className="text-xl font-black">24.5ms</p>
              <p className="text-[9px] text-white/40 font-black uppercase mt-1">{ts.dbLatency}</p>
           </div>
           <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center text-center min-w-[120px]">
              <LifeBuoy size={24} className="text-apple-purple mb-3" />
              <p className="text-xl font-black">100%</p>
              <p className="text-[9px] text-white/40 font-black uppercase mt-1">{ts.dbUptime}</p>
           </div>
        </div>
      </div>
    </div>
  );
}


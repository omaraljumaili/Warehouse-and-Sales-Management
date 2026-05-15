import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../db';
import { 
  Plus, 
  Search, 
  Trash2, 
  Calendar, 
  DollarSign, 
  Tag, 
  FileText,
  AlertCircle,
  X,
  CreditCard,
  Building2,
  Lightbulb,
  Users2,
  Coffee,
  Briefcase
} from 'lucide-react';
import type { Language, Expense } from '../types';
import { cn } from '../lib/utils';

interface Props {
  lang: Language;
}

export const ExpensesView: React.FC<Props> = ({ lang }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState<Omit<Expense, 'id'>>({
    category: '',
    amount: 0,
    date: Date.now(),
    note: '',
    recurring: false
  });

  const categories = [
    { id: 'Rent', en: 'Rent', ar: 'إيجار', icon: Building2 },
    { id: 'Salaries', en: 'Salaries', ar: 'رواتب', icon: Users2 },
    { id: 'Utilities', en: 'Utilities', ar: 'كهرباء وماء', icon: Lightbulb },
    { id: 'Marketing', en: 'Marketing', ar: 'تسويق', icon: Briefcase },
    { id: 'Supplies', en: 'Supplies', ar: 'قرطاسية ومواد', icon: Tag },
    { id: 'Others', en: 'Others', ar: 'أخرى', icon: Coffee },
  ];

  const expenses = useLiveQuery(() => 
    db.expenses.reverse().toArray(),
  []);

  const filteredExpenses = expenses?.filter(e => 
    e.category.toLowerCase().includes(search.toLowerCase()) ||
    e.note.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.expenses.add(formData);
    setFormData({
      category: '',
      amount: 0,
      date: Date.now(),
      note: '',
      recurring: false
    });
    setIsModalOpen(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm(lang === 'ar' ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete this expense?')) {
      await db.expenses.delete(id);
    }
  };

  const totalExpenses = filteredExpenses?.reduce((acc, curr) => acc + curr.amount, 0) || 0;

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-apple-dark-blue tracking-tight">
            {lang === 'ar' ? 'المصروفات' : 'Expenses'}
          </h1>
          <p className="text-gray-400 font-bold mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-apple-blue" />
            {lang === 'ar' ? 'تتبع مصاريف التشغيل وصافي الربح' : 'Track operational costs and net profit'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-apple-blue transition-colors" size={18} />
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'ar' ? 'بحث في المصروفات...' : 'Search expenses...'}
              className="pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-3xl w-72 focus:outline-none focus:ring-4 focus:ring-apple-blue/10 transition-all font-bold text-sm shadow-sm"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-3 px-8 py-4 bg-apple-blue text-white rounded-3xl font-black text-sm hover:scale-[1.03] active:scale-95 transition-all shadow-xl shadow-apple-blue/20 uppercase tracking-widest"
          >
            <Plus size={20} />
            {lang === 'ar' ? 'إضافة مصروف' : 'Add Expense'}
          </button>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[48px] border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-10">
          <h3 className="text-xl font-bold text-apple-dark-blue">
            {lang === 'ar' ? 'سجل المصروفات' : 'Expense Log'}
          </h3>
          <div className="px-6 py-3 bg-red-50 text-red-500 rounded-2xl font-black text-sm">
            {lang === 'ar' ? 'إجمالي المصروفات: ' : 'Total: '}
            {totalExpenses.toLocaleString()}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-50">
                <th className="pb-6 text-left px-4">{lang === 'ar' ? 'التصنيف' : 'Category'}</th>
                <th className="pb-6 text-left px-4">{lang === 'ar' ? 'التفاصيل' : 'Note'}</th>
                <th className="pb-6 text-left px-4">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                <th className="pb-6 text-right px-4">{lang === 'ar' ? 'المبلغ' : 'Amount'}</th>
                <th className="pb-6 text-center px-4 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredExpenses?.map((expense) => {
                const catInfo = categories.find(c => c.id === expense.category);
                const Icon = catInfo?.icon || CreditCard;
                return (
                  <tr key={expense.id} className="group hover:bg-gray-50 transition-colors">
                    <td className="py-6 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-white transition-colors">
                          <Icon size={18} />
                        </div>
                        <span className="font-bold text-apple-dark-blue">
                          {lang === 'ar' ? catInfo?.ar : catInfo?.en}
                        </span>
                      </div>
                    </td>
                    <td className="py-6 px-4">
                      <p className="text-sm text-gray-500 font-medium max-w-xs truncate">
                        {expense.note || '-'}
                      </p>
                    </td>
                    <td className="py-6 px-4">
                      <div className="flex items-center gap-2 text-gray-400 font-bold text-xs">
                        <Calendar size={14} />
                        {new Date(expense.date).toLocaleDateString(lang === 'ar' ? 'ar-IQ' : 'en-US')}
                      </div>
                    </td>
                    <td className="py-6 px-4 text-right">
                      <span className="font-black text-apple-dark-blue tracking-tight">
                        {expense.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-6 px-4 text-center">
                      <button 
                        onClick={() => handleDelete(expense.id!)}
                        className="w-10 h-10 rounded-xl hover:bg-red-50 text-gray-300 hover:text-red-500 flex items-center justify-center transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(!filteredExpenses || filteredExpenses.length === 0) && (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-200">
                <FileText size={40} />
              </div>
              <p className="text-gray-400 font-bold">
                {lang === 'ar' ? 'لا توجد مصروفات مسجلة' : 'No expenses recorded yet'}
              </p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 sm:p-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-apple-dark-blue/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[48px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-apple-blue/10 rounded-2xl flex items-center justify-center text-apple-blue italic">
                    <DollarSign size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-apple-dark-blue tracking-tight">
                    {lang === 'ar' ? 'إضافة مصروف جديد' : 'New Expense'}
                  </h2>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 rounded-full hover:bg-gray-50 flex items-center justify-center transition-colors border border-gray-100"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">
                      {lang === 'ar' ? 'التصنيف' : 'Category'}
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, category: cat.id })}
                          className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all",
                            formData.category === cat.id 
                              ? "bg-apple-blue border-apple-blue text-white shadow-lg shadow-apple-blue/20" 
                              : "bg-white border-gray-100 text-gray-500 hover:border-apple-blue/30"
                          )}
                        >
                          <cat.icon size={20} />
                          <span className="text-[10px] font-black uppercase">
                            {lang === 'ar' ? cat.ar : cat.en}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">
                      {lang === 'ar' ? 'المبلغ' : 'Amount'}
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                      <input 
                        type="number"
                        required
                        value={formData.amount || ''}
                        onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                        placeholder="0.00"
                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-apple-blue/10 transition-all font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">
                      {lang === 'ar' ? 'ملاحظات' : 'Notes'}
                    </label>
                    <textarea 
                      value={formData.note}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                      rows={3}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-apple-blue/10 transition-all font-bold text-sm"
                      placeholder="..."
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-8 py-4 bg-gray-50 text-gray-400 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-100 transition-all"
                  >
                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] px-8 py-4 bg-apple-blue text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-apple-blue/20"
                  >
                    {lang === 'ar' ? 'حفظ المصروف' : 'Save Expense'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

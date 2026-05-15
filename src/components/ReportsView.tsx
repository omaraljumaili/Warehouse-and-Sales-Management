import React, { useMemo, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  ShoppingBag, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  BrainCircuit, 
  MessageSquare, 
  Send, 
  Loader2,
  Sparkles,
  Zap,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getInventoryInsights, getAIReportAssistantResponse, InventoryInsight } from '../lib/gemini';
import type { Language } from '../types';
import { cn } from '../lib/utils';

interface ReportsViewProps {
  lang: Language;
  t: any;
}

export function ReportsView({ lang, t }: ReportsViewProps) {
  const sales = useLiveQuery(() => db.sales.toArray());
  const items = useLiveQuery(() => db.items.toArray());
  const expenses = useLiveQuery(() => db.expenses.toArray());
  const settings = useLiveQuery(() => db.settings.get('current'));
  const currency = settings?.currency || 'د.ع';
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');
  
  // AI State
  const [aiInsights, setAiInsights] = useState<InventoryInsight[]>([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [assistantQuery, setAssistantQuery] = useState('');
  const [assistantResponse, setAssistantResponse] = useState<string | null>(null);
  const [isAssistantLoading, setIsAssistantLoading] = useState(false);

  const formatCurrency = (val: number) => {
    const formatted = val.toLocaleString(undefined, { 
      minimumFractionDigits: currency === 'د.ع' ? 0 : 2,
      maximumFractionDigits: currency === 'د.ع' ? 0 : 2 
    });
    return lang === 'ar' ? `${formatted} ${currency}` : `${currency}${formatted}`;
  };

  const stats = useMemo(() => {
    if (!sales || !items) return { revenue: 0, profit: 0, netProfit: 0, totalExpenses: 0, salesCount: 0, avgTicket: 0 };
    
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const filterMs = timeRange === '7d' ? 7 * dayMs : timeRange === '30d' ? 30 * dayMs : Infinity;
    
    const filteredSales = sales.filter(s => (now - s.date) <= filterMs);
    const filteredExpenses = expenses?.filter(e => (now - e.date) <= filterMs) || [];
    
    const totalRevenue = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
    const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

    const grossProfit = filteredSales.reduce((acc, s) => {
        return acc + s.items.reduce((sAcc, sCurr) => {
            const item = items.find(i => i.id === sCurr.itemId);
            const cost = item?.costPrice || 0;
            return sAcc + (sCurr.price - cost) * sCurr.quantity;
        }, 0);
    }, 0);

    const netProfit = grossProfit - totalExpenses;

    return {
      revenue: totalRevenue,
      profit: grossProfit,
      netProfit,
      totalExpenses,
      salesCount: filteredSales.length,
      avgTicket: filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0
    };
  }, [sales, items, expenses, timeRange]);

  const chartData = useMemo(() => {
    if (!sales) return [];
    // Last 7 days daily revenue
    const days = 7;
    const data = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'short' });
      
      const daySales = sales.filter(s => {
        const sDate = new Date(s.date);
        return sDate.getDate() === d.getDate() && sDate.getMonth() === d.getMonth();
      });
      
      data.push({
        name: dateStr,
        revenue: daySales.reduce((acc, s) => acc + s.totalAmount, 0)
      });
    }
    return data;
  }, [sales]);

  const bestSellers = useMemo(() => {
    if (!sales || !items) return [];
    const map = new Map<number, { name: string, qty: number, revenue: number }>();
    
    sales.forEach(s => {
      s.items.forEach(si => {
        const existing = map.get(si.itemId);
        if (existing) {
          existing.qty += si.quantity;
          existing.revenue += si.total;
        } else {
          map.set(si.itemId, { name: si.name, qty: si.quantity, revenue: si.total });
        }
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [sales, items]);

  const tr = t.reports;

  const handleGenerateInsights = async () => {
    if (!items || !sales) return;
    setIsGeneratingInsights(true);
    try {
      const insights = await getInventoryInsights(items, sales);
      setAiInsights(insights);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handleAssistantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistantQuery.trim()) return;

    setIsAssistantLoading(true);
    setAssistantResponse(null);
    try {
      const summaryData = {
        stats,
        categories: bestSellers,
        trend: chartData,
        lang
      };
      const response = await getAIReportAssistantResponse(assistantQuery, summaryData);
      setAssistantResponse(response);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAssistantLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black text-apple-dark-blue tracking-tighter">
            {tr.title}
          </h2>
          <p className="text-apple-gray font-medium mt-1">{tr.subtitle}</p>
        </div>
        
        <div className="flex p-1 bg-white rounded-2xl border border-gray-100 shadow-sm">
          {(['7d', '30d', 'all'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                timeRange === range ? "bg-apple-blue text-white shadow-lg shadow-apple-blue/20" : "text-gray-400 hover:bg-gray-50"
              )}
            >
              {range === '7d' ? tr.days7 : 
               range === '30d' ? tr.days30 : 
               tr.allTime}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <ReportCard label={tr.revenue} value={formatCurrency(stats.revenue)} icon={<DollarSign size={20}/>} color="blue" />
        <ReportCard label={tr.profit} value={formatCurrency(stats.profit)} icon={<TrendingUp size={20}/>} color="green" />
        <ReportCard label={lang === 'ar' ? 'المصاريف' : 'Expenses'} value={formatCurrency(stats.totalExpenses)} icon={<ArrowDownRight size={20}/>} color="red" />
        <ReportCard label={lang === 'ar' ? 'صافي الربح' : 'Net Profit'} value={formatCurrency(stats.netProfit)} icon={<Zap size={20}/>} color="blue" />
        <ReportCard label={tr.salesCount} value={stats.salesCount} icon={<ShoppingBag size={20}/>} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-10 rounded-[48px] border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold text-apple-dark-blue mb-8">{tr.trend}</h3>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F2F7" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#8E8E93', fontSize: 12, fontWeight: 700 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#8E8E93', fontSize: 12, fontWeight: 700 }}
                    tickFormatter={(val) => lang === 'ar' ? `${val} ${currency}` : `${currency}${val}`}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: '#F2F2F7' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="revenue" fill="#007AFF" radius={[8, 8, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Insights Section */}
          <div className="bg-gradient-to-br from-apple-dark-blue to-blue-900 p-10 rounded-[48px] text-white shadow-2xl relative overflow-hidden">
             <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-apple-blue backdrop-blur-md">
                      <BrainCircuit size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">AI Inventory Analysis</h3>
                      <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Smart Forecasting assistant</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleGenerateInsights}
                    disabled={isGeneratingInsights}
                    className="px-6 py-3 rounded-full bg-apple-blue font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:scale-[1.03] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isGeneratingInsights ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {lang === 'ar' ? 'توليد التحليلات' : 'Generate Insights'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatePresence>
                    {aiInsights.length > 0 ? (
                      aiInsights.map((insight, idx) => (
                        <motion.div 
                          key={idx}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="bg-white/5 border border-white/10 backdrop-blur-md p-6 rounded-3xl group hover:bg-white/10 transition-all"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="font-bold text-lg">{insight.itemName}</h4>
                            <span className={cn(
                              "text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest",
                              insight.riskLevel === 'Critical' ? "bg-red-500/20 text-red-300" :
                              insight.riskLevel === 'High' ? "bg-orange-500/20 text-orange-300" :
                              "bg-apple-blue/20 text-blue-300"
                            )}>
                              {insight.riskLevel} Risk
                            </span>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-white/40" />
                              <p className="text-sm font-bold">Expires in approx. <span className="text-apple-blue">{insight.predictionDays} days</span></p>
                            </div>
                            <div className="flex items-start gap-2">
                              <Info size={14} className="text-white/40 mt-0.5 shrink-0" />
                              <p className="text-[11px] text-white/60 leading-relaxed italic">{insight.recommendation}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    ) : !isGeneratingInsights && (
                       <div className="col-span-2 text-center py-10 opacity-30">
                          <p className="text-sm font-bold uppercase tracking-widest">Click generate to start AI analysis</p>
                       </div>
                    )}
                  </AnimatePresence>
                </div>
             </div>
             <Sparkles className="absolute -right-10 -bottom-10 w-64 h-64 text-white/5 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-10 rounded-[48px] border border-gray-100 shadow-sm flex flex-col">
            <h3 className="text-xl font-bold text-apple-dark-blue mb-8">{tr.bestSellers}</h3>
            <div className="space-y-6">
              {bestSellers.map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shadow-sm", 
                    colors[i % colors.length])}>
                    #{i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-apple-dark-blue truncate">{item.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] font-black text-apple-blue uppercase">{item.qty} {tr.sales}</p>
                      <span className="w-1 h-1 rounded-full bg-gray-200" />
                      <p className="text-[10px] font-bold text-apple-green text-right">{formatCurrency(item.revenue)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {bestSellers.length === 0 && <p className="text-center py-20 text-gray-400 font-bold">{t.crm.noHistory}</p>}
            </div>
          </div>

          {/* AI Assistant Chat Box */}
          <div className="bg-white p-10 rounded-[48px] border border-gray-100 shadow-sm flex flex-col h-[500px]">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-apple-blue/10 rounded-2xl flex items-center justify-center text-apple-blue">
                  <MessageSquare size={20} />
                </div>
                <h3 className="text-xl font-bold text-apple-dark-blue">Smart assistant</h3>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar mb-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-3xl rounded-tr-none text-xs text-apple-dark-blue font-medium leading-relaxed">
                {lang === 'ar' ? 'أهلاً بك! أنا مساعدك الذكي. يمكنك سؤالي عن أداء المبيعات، المنتجات الأكثر ربحية، أو أي تحليل ترغب به.' : 'Welcome! I am your AI assistant. You can ask me about sales performance, most profitable products, or any analysis you need.'}
              </div>
              
              {assistantResponse && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-apple-blue/5 border border-apple-blue/10 p-5 rounded-3xl rounded-tl-none text-xs text-apple-dark-blue font-medium leading-relaxed whitespace-pre-wrap"
                >
                  {assistantResponse}
                </motion.div>
              )}

              {isAssistantLoading && (
                <div className="flex justify-center py-4">
                  <Loader2 className="text-apple-blue animate-spin" size={20} />
                </div>
              )}
            </div>

            <form onSubmit={handleAssistantSubmit} className="relative">
              <input 
                type="text" 
                value={assistantQuery}
                onChange={e => setAssistantQuery(e.target.value)}
                placeholder={lang === 'ar' ? 'اسأل المساعد...' : 'Ask the assistant...'}
                className="w-full bg-gray-50 border border-gray-100 rounded-full py-4 px-6 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/20 transition-all font-medium"
              />
              <button 
                type="submit"
                disabled={isAssistantLoading || !assistantQuery.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-apple-blue text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-apple-blue/20"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

const colors = [
  'bg-blue-50 text-apple-blue',
  'bg-green-50 text-apple-green',
  'bg-orange-50 text-orange-500',
  'bg-purple-50 text-apple-purple',
  'bg-red-50 text-red-500'
];

function ReportCard({ label, value, icon, color }: { label: string, value: string | number, icon: React.ReactNode, color: string }) {
    const colorClasses = {
      blue: 'bg-blue-50 text-apple-blue',
      green: 'bg-green-50 text-apple-green',
      purple: 'bg-purple-50 text-apple-purple',
      orange: 'bg-orange-50 text-orange-500',
      red: 'bg-red-50 text-red-500',
    } as any;

    return (
      <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col gap-6">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", colorClasses[color])}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
          <h3 className="text-3xl font-black text-apple-dark-blue">{value}</h3>
        </div>
      </div>
    );
}

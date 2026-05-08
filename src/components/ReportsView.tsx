import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendingUp, DollarSign, Package, ShoppingBag, ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react';
import type { Language } from '../types';
import { cn } from '../lib/utils';

interface ReportsViewProps {
  lang: Language;
}

export function ReportsView({ lang }: ReportsViewProps) {
  const sales = useLiveQuery(() => db.sales.toArray());
  const items = useLiveQuery(() => db.items.toArray());
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');

  const stats = useMemo(() => {
    if (!sales || !items) return { revenue: 0, profit: 0, salesCount: 0, avgTicket: 0 };
    
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const filterMs = timeRange === '7d' ? 7 * dayMs : timeRange === '30d' ? 30 * dayMs : Infinity;
    
    const filteredSales = sales.filter(s => (now - s.date) <= filterMs);
    
    const totalRevenue = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
    const totalProfit = filteredSales.reduce((acc, s) => {
        return acc + s.items.reduce((sAcc, sCurr) => {
            const item = items.find(i => i.id === sCurr.itemId);
            const cost = item?.costPrice || 0;
            return sAcc + (sCurr.price - cost) * sCurr.quantity;
        }, 0);
    }, 0);

    return {
      revenue: totalRevenue,
      profit: totalProfit,
      salesCount: filteredSales.length,
      avgTicket: filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0
    };
  }, [sales, items, timeRange]);

  const chartData = useMemo(() => {
    if (!sales) return [];
    // Last 7 days daily revenue
    const days = 7;
    const data = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toLocaleDateString(undefined, { weekday: 'short' });
      
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

  const COLORS = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF3B30'];

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black text-apple-dark-blue tracking-tighter">
            {lang === 'en' ? 'Performance Insights' : 'تحليلات الأداء'}
          </h2>
          <p className="text-apple-gray font-medium mt-1">Deep dive into your sales and revenue data</p>
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
              {range === '7d' ? (lang === 'en' ? '7 Days' : '٧ أيام') : 
               range === '30d' ? (lang === 'en' ? '30 Days' : '٣٠ يوم') : 
               (lang === 'en' ? 'All Time' : 'الكل')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ReportCard label={lang === 'en' ? 'Period Revenue' : 'إيرادات الفترة'} value={`$${stats.revenue.toLocaleString()}`} icon={<DollarSign size={20}/>} color="blue" />
        <ReportCard label={lang === 'en' ? 'Estimated Profit' : 'الربح المتوقع'} value={`$${stats.profit.toLocaleString()}`} icon={<TrendingUp size={20}/>} color="green" />
        <ReportCard label={lang === 'en' ? 'Sales Count' : 'عدد المبيعات'} value={stats.salesCount} icon={<ShoppingBag size={20}/>} color="purple" />
        <ReportCard label={lang === 'en' ? 'Avg. Ticket' : 'متوسط الفاتورة'} value={`$${stats.avgTicket.toFixed(2)}`} icon={<Calendar size={20}/>} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[48px] border border-gray-100 shadow-sm">
          <h3 className="text-xl font-bold text-apple-dark-blue mb-8">{lang === 'en' ? 'Daily Revenue Trend' : 'اتجاه الإيرادات اليومي'}</h3>
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
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip 
                  cursor={{ fill: '#F2F2F7' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', fontWeight: 'bold' }}
                />
                <Bar dataKey="revenue" fill="#007AFF" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[48px] border border-gray-100 shadow-sm flex flex-col h-full">
          <h3 className="text-xl font-bold text-apple-dark-blue mb-8">{lang === 'en' ? 'Best Sellers' : 'الأكثر مبيعاً'}</h3>
          <div className="flex-1 space-y-6">
            {bestSellers.map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shadow-sm", 
                  colors[i % colors.length])}>
                  #{i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-apple-dark-blue truncate">{item.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] font-black text-apple-blue uppercase">{item.qty} Sales</p>
                    <span className="w-1 h-1 rounded-full bg-gray-200" />
                    <p className="text-[10px] font-bold text-apple-green text-right">${item.revenue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
            {bestSellers.length === 0 && <p className="text-center py-20 text-gray-400 font-bold">No sales data found</p>}
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

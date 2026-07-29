import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { BarChart3, TrendingUp, Filter, MessageSquare, DollarSign } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { fetchAnalytics } from '../services/api';

export interface AnalyticsDataPoint {
  time: string;
  totalMessages: number;
  filteredNoise: number;
  aiResponses: number;
  costSavings: number;
}

const defaultAnalyticsData: AnalyticsDataPoint[] = [
  { time: '18:00', totalMessages: 120, filteredNoise: 104, aiResponses: 16, costSavings: 2.10 },
  { time: '18:15', totalMessages: 280, filteredNoise: 245, aiResponses: 35, costSavings: 4.80 },
  { time: '18:30', totalMessages: 450, filteredNoise: 390, aiResponses: 60, costSavings: 7.90 },
  { time: '18:45', totalMessages: 680, filteredNoise: 595, aiResponses: 85, costSavings: 11.50 },
  { time: '19:00', totalMessages: 920, filteredNoise: 805, aiResponses: 115, costSavings: 15.80 },
  { time: '19:15', totalMessages: 1150, filteredNoise: 1005, aiResponses: 145, costSavings: 19.60 },
  { time: '19:30', totalMessages: 1420, filteredNoise: 1240, aiResponses: 180, costSavings: 24.30 },
  { time: '19:45', totalMessages: 1750, filteredNoise: 1530, aiResponses: 220, costSavings: 30.10 },
  { time: '20:00', totalMessages: 2100, filteredNoise: 1835, aiResponses: 265, costSavings: 36.40 },
  { time: '20:15', totalMessages: 2480, filteredNoise: 2165, aiResponses: 315, costSavings: 42.80 },
];

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsDataPoint[]>(defaultAnalyticsData);
  const [stats, setStats] = useState({
    totalMessages: '12,480',
    filteredNoise: '10,912',
    dropRate: '87.4%',
    aiResponses: '1,568',
    costSaved: '$42.80',
    tokensSaved: '~218k tokens saved',
  });

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const res = await fetchAnalytics();
        if (res) {
          if (Array.isArray(res.timeline) && res.timeline.length > 0) {
            setData(res.timeline);
          }
          if (res.summary) {
            setStats((prev) => ({
              ...prev,
              ...res.summary,
            }));
          }
        }
      } catch (err) {
        console.warn('API fetchAnalytics failed, using default analytics data:', err);
      }
    };
    loadAnalytics();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
          <BarChart3 className="w-6 h-6 text-purple-400" />
          <span>Stream Analytics Overview</span>
        </h2>
        <p className="text-sm text-slate-400">Track chat message volume, LLM responses, and intent filter token savings.</p>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <GlassCard>
          <div className="flex items-center space-x-3 mb-2">
            <MessageSquare className="w-5 h-5 text-cyan-400" />
            <span className="text-xs text-slate-400">Total Chat Messages</span>
          </div>
          <div className="text-2xl font-bold text-slate-100">{stats.totalMessages}</div>
          <div className="text-[10px] text-emerald-400 flex items-center space-x-1 mt-1">
            <TrendingUp className="w-3 h-3" />
            <span>+14% from last stream</span>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center space-x-3 mb-2">
            <Filter className="w-5 h-5 text-amber-400" />
            <span className="text-xs text-slate-400">Filtered Noise Messages</span>
          </div>
          <div className="text-2xl font-bold text-slate-100">{stats.filteredNoise}</div>
          <div className="text-[10px] text-slate-500 mt-1">{stats.dropRate} drop rate</div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center space-x-3 mb-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            <span className="text-xs text-slate-400">AI Bot Responses</span>
          </div>
          <div className="text-2xl font-bold text-slate-100">{stats.aiResponses}</div>
          <div className="text-[10px] text-purple-400 mt-1">100% relevant context</div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center space-x-3 mb-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <span className="text-xs text-slate-400">Est. API Cost Saved</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{stats.costSaved}</div>
          <div className="text-[10px] text-slate-500 mt-1">{stats.tokensSaved}</div>
        </GlassCard>
      </div>

      {/* Main Stream Volume Chart */}
      <GlassCard className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-semibold text-slate-200">Stream Message Volume & AI Responses</h3>
            <p className="text-xs text-slate-400">Real-time chat rate vs intent filter drop rate and bot triggers</p>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorNoise" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  color: '#f8fafc',
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
              <Area
                type="monotone"
                dataKey="totalMessages"
                name="Total Chat Messages"
                stroke="#a855f7"
                fillOpacity={1}
                fill="url(#colorTotal)"
              />
              <Area
                type="monotone"
                dataKey="filteredNoise"
                name="Noise Filtered Count"
                stroke="#f59e0b"
                fillOpacity={1}
                fill="url(#colorNoise)"
              />
              <Area
                type="monotone"
                dataKey="aiResponses"
                name="AI Responses"
                stroke="#06b6d4"
                fillOpacity={1}
                fill="url(#colorAi)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Token Cost Savings Timeline Chart */}
      <GlassCard className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-semibold text-slate-200">Token Cost Savings Timeline ($)</h3>
            <p className="text-xs text-slate-400">Cumulative OpenRouter API cost saved by pre-filtering non-actionable chat messages</p>
          </div>
        </div>

        <div className="h-60 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `$${val}`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  color: '#f8fafc',
                }}
                formatter={(val: any) => [`$${val}`, 'API Cost Saved']}
              />
              <Bar dataKey="costSavings" name="Cost Savings ($)" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    </div>
  );
};

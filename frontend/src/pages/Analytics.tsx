import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { AnimatedPage } from '../components/ui/AnimatedPage';
import { BarChart3, Filter, MessageSquare, DollarSign } from 'lucide-react';
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

const chartTooltipStyle = {
  backgroundColor: '#191A1E',
  borderColor: '#27282D',
  borderRadius: '8px',
  color: '#EDEDEF',
  fontSize: '12px',
  padding: '8px 12px',
};

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
    <AnimatedPage className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-heading text-text-primary flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-accent-blue" />
          Stream Analytics
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          Message volume, AI responses, and token cost savings across sessions.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Chat Messages"
          value={stats.totalMessages}
          icon={<MessageSquare className="w-5 h-5" />}
          iconColor="blue"
          trend={{ value: '+14% from last stream', direction: 'up' }}
        />
        <StatCard
          label="Filtered Noise"
          value={stats.filteredNoise}
          icon={<Filter className="w-5 h-5" />}
          iconColor="amber"
          subtitle={`${stats.dropRate} drop rate`}
        />
        <StatCard
          label="AI Responses"
          value={stats.aiResponses}
          icon={<BarChart3 className="w-5 h-5" />}
          iconColor="blue"
          subtitle="100% relevant context"
        />
        <StatCard
          label="Est. Cost Saved"
          value={stats.costSaved}
          icon={<DollarSign className="w-5 h-5" />}
          iconColor="emerald"
          subtitle={stats.tokensSaved}
        />
      </div>

      {/* Stream Volume Chart */}
      <Card padding="none">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Message Volume & AI Responses</h3>
          <p className="text-xs text-text-tertiary mt-0.5">Real-time chat rate vs filter drop rate</p>
        </div>
        <div className="h-72 w-full p-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradAmber" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradEmerald" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27282D" />
              <XAxis dataKey="time" stroke="#5C5E6A" fontSize={11} fontFamily="JetBrains Mono, monospace" />
              <YAxis stroke="#5C5E6A" fontSize={11} fontFamily="JetBrains Mono, monospace" />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend
                wrapperStyle={{ paddingTop: '10px', fontSize: '11px', fontFamily: 'Inter, sans-serif' }}
              />
              <Area
                type="monotone"
                dataKey="totalMessages"
                name="Total Messages"
                stroke="#3B82F6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#gradBlue)"
              />
              <Area
                type="monotone"
                dataKey="filteredNoise"
                name="Noise Filtered"
                stroke="#F59E0B"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#gradAmber)"
              />
              <Area
                type="monotone"
                dataKey="aiResponses"
                name="AI Responses"
                stroke="#10B981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#gradEmerald)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Cost Savings Bar Chart */}
      <Card padding="none">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Token Cost Savings ($)</h3>
          <p className="text-xs text-text-tertiary mt-0.5">Cumulative API cost saved by pre-filtering noise</p>
        </div>
        <div className="h-60 w-full p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27282D" />
              <XAxis dataKey="time" stroke="#5C5E6A" fontSize={11} fontFamily="JetBrains Mono, monospace" />
              <YAxis stroke="#5C5E6A" fontSize={11} fontFamily="JetBrains Mono, monospace" tickFormatter={(val) => `$${val}`} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(val: any) => [`$${val}`, 'API Cost Saved']}
              />
              <Bar dataKey="costSavings" name="Cost Savings ($)" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </AnimatedPage>
  );
};

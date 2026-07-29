import React, { useState, useEffect } from 'react';
import { StatCard } from '../components/ui/StatCard';
import { AnimatedPage } from '../components/ui/AnimatedPage';
import { BarChart3, Filter, MessageSquare, Coins } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { fetchAnalytics } from '../services/api';

export const AnalyticsPage: React.FC = () => {
  const [points, setPoints] = useState<{ time: string; totalMessages: number; filteredNoise: number; aiResponses: number }[]>([]);
  const [stats, setStats] = useState({
    totalMessages: '0',
    filteredNoise: '0',
    dropRate: '0%',
    aiResponses: '0',
    tokensSaved: '0',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchAnalytics();
        setStats({
          totalMessages: String(res.total_messages ?? 0),
          filteredNoise: String(res.filtered_messages ?? 0),
          dropRate: `${res.filter_rate_percentage ?? 0}%`,
          aiResponses: String(res.ai_responses_sent ?? 0),
          tokensSaved: String(res.estimated_tokens_saved ?? 0),
        });
        const series = (res.points || []).map((p: any) => ({
          time: p.timestamp,
          totalMessages: p.message_count,
          filteredNoise: p.filtered_count,
          aiResponses: p.ai_response_count,
        }));
        setPoints(series);
        setError(null);
      } catch (e: any) {
        setError(e?.message || 'Failed to load analytics');
      }
    };
    load();
  }, []);

  return (
    <AnimatedPage className="space-y-6">
      <div>
        <h2 className="text-heading text-text-primary flex items-center gap-2 font-display">
          <BarChart3 className="w-5 h-5 text-accent-emerald" />
          Analytics
        </h2>
        <p className="text-sm text-text-secondary mt-1">Live metrics from your workspace — no demo filler.</p>
      </div>
      {error && <p className="text-accent-rose text-sm">{error}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Messages" value={stats.totalMessages} icon={<MessageSquare className="w-4 h-4" />} />
        <StatCard label="Filtered" value={stats.filteredNoise} icon={<Filter className="w-4 h-4" />} />
        <StatCard label="Filter rate" value={stats.dropRate} icon={<Filter className="w-4 h-4" />} />
        <StatCard label="AI replies" value={stats.aiResponses} icon={<BarChart3 className="w-4 h-4" />} />
        <StatCard label="Tokens saved" value={stats.tokensSaved} icon={<Coins className="w-4 h-4" />} />
      </div>

      <div className="h-72 bg-surface-1 border border-border rounded-lg p-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points}>
            <defs>
              <linearGradient id="msgFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3ecf8e" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#3ecf8e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#24322c" strokeDasharray="3 3" />
            <XAxis dataKey="time" stroke="#8B8D98" fontSize={11} />
            <YAxis stroke="#8B8D98" fontSize={11} />
            <Tooltip contentStyle={{ background: '#13201b', borderColor: '#2a3d34', borderRadius: 8 }} />
            <Area type="monotone" dataKey="totalMessages" stroke="#3ecf8e" fill="url(#msgFill)" name="Messages" />
            <Area type="monotone" dataKey="aiResponses" stroke="#f0c75e" fill="transparent" name="AI" />
            <Area type="monotone" dataKey="filteredNoise" stroke="#7aa2ff" fill="transparent" name="Filtered" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </AnimatedPage>
  );
};

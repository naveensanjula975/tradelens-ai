'use client';

import React, { useState } from 'react';
import { useDecisionHistory } from '@/hooks/use-api';
import { PageShell } from '@/components/layout/page-shell';
import { PageHeader, CommodityFilter, StatusBadge, LoadingRows } from '@/components/ui/shared';
import { DecisionHistoryEntry } from '@/types/domain';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend, ReferenceLine,
} from 'recharts';
import { History, TrendingUp } from 'lucide-react';

function permissionType(p: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (p === 'Allowed') return 'success';
  if (p === 'Review Required') return 'warning';
  if (p === 'Blocked') return 'danger';
  if (p === 'Limited') return 'info';
  return 'neutral';
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="text-xs rounded-lg p-3 border shadow-xl" style={{ background: '#0d1117', borderColor: 'var(--border)' }}>
      <p className="text-gray-400 mb-2 font-mono text-[10px]">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-gray-300">{p.name}:</span>
          <span className="font-bold text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function DecisionHistoryPage() {
  const [commodity, setCommodity] = useState('Copper');
  const { data: history, loading } = useDecisionHistory(commodity, 30);

  const chartData = [...history].reverse().map(h => ({
    date: formatDate(h.created_at),
    'Evidence Score': h.evidence_score,
    'Risk Score': h.risk_score,
    permission: h.permission,
  }));

  const blocked = history.filter(h => h.permission === 'Blocked').length;
  const allowed = history.filter(h => h.permission === 'Allowed').length;
  const avgRisk = history.length
    ? Math.round(history.reduce((s, h) => s + h.risk_score, 0) / history.length)
    : 0;

  return (
    <PageShell>
      <PageHeader
        title="Decision History"
        subtitle="Historical permission outcomes and score trends — latest 30 evaluations"
      >
        <CommodityFilter value={commodity} onChange={setCommodity} />
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mx-6 mb-5">
        {[
          { label: 'Allowed', value: allowed, color: 'text-emerald-400' },
          { label: 'Blocked', value: blocked, color: blocked > 0 ? 'text-red-400' : 'text-gray-400' },
          { label: 'Avg Risk Score', value: `${avgRisk}/100`, color: avgRisk >= 70 ? 'text-red-400' : avgRisk >= 50 ? 'text-amber-400' : 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl border text-center" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">{s.label}</p>
            <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Score Trend Chart */}
      <div className="mx-6 mb-5 p-5 rounded-2xl border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          <h4 className="text-[10px] uppercase font-bold tracking-widest text-gray-500">
            Evidence & Risk Score Trend (Last {history.length} Evaluations)
          </h4>
        </div>

        {loading ? (
          <div className="h-52 flex items-center justify-center">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
            </div>
          </div>
        ) : history.length === 0 ? (
          <div className="h-52 flex flex-col items-center justify-center text-center">
            <History className="w-8 h-8 text-gray-600 mb-2" />
            <p className="text-sm text-gray-500">No decision history yet.</p>
            <p className="text-xs text-gray-600 mt-1">Run a dashboard refresh or use <code className="text-blue-400">POST /api/snapshots/run</code> to generate history.</p>
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                <XAxis dataKey="date" stroke="#4b5563" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} stroke="#4b5563" tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
                <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.4} />
                <Line
                  type="monotone" dataKey="Evidence Score"
                  stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone" dataKey="Risk Score"
                  stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="text-[10px] text-gray-600 mt-2">Red dashed line = 70 risk threshold (Review Required trigger). Snapshots are created via the Settings page or by calling <code className="text-blue-400">POST /api/snapshots/run</code>.</p>
      </div>

      {/* History Table */}
      <div className="mx-6 mb-6 rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b" style={{ background: 'rgba(0,0,0,0.4)', borderColor: 'var(--border)' }}>
                {['Timestamp', 'Commodity', 'Market State', 'Permission', 'Evidence', 'Risk'].map(col => (
                  <th key={col} className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-gray-500 whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            {loading ? (
              <LoadingRows cols={6} />
            ) : history.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                    No history records found for {commodity}.
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {history.map(h => (
                  <tr key={h.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-gray-500 font-mono text-[10px] whitespace-nowrap">{formatDate(h.created_at)}</td>
                    <td className="px-4 py-3 font-bold text-white">{h.commodity}</td>
                    <td className="px-4 py-3 text-gray-400">{h.market_state}</td>
                    <td className="px-4 py-3">
                      <StatusBadge label={h.permission} type={permissionType(h.permission)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${h.evidence_score}%` }} />
                        </div>
                        <span className="text-blue-400 font-bold">{h.evidence_score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                          <div
                            className={`h-full rounded-full ${h.risk_score >= 70 ? 'bg-red-500' : h.risk_score >= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${h.risk_score}%` }}
                          />
                        </div>
                        <span className={`font-bold ${h.risk_score >= 70 ? 'text-red-400' : h.risk_score >= 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {h.risk_score}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
      </div>
    </PageShell>
  );
}

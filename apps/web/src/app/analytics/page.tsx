'use client';

import React from 'react';
import { usePortfolioAnalytics } from '@/hooks/use-api';
import { PageShell } from '@/components/layout/page-shell';
import { PageHeader, StatusBadge, LoadingRows, ActionButton } from '@/components/ui/shared';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend, ReferenceLine, Cell,
} from 'recharts';
import { PieChart, Pie, Cell as PieCell } from 'recharts';
import { BarChart3, ShieldAlert, Package, Layers, RefreshCw, ExternalLink } from 'lucide-react';
import Link from 'next/link';

function permissionType(p: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (p === 'Allowed') return 'success';
  if (p === 'Review Required') return 'warning';
  if (p === 'Blocked') return 'danger';
  if (p === 'Limited') return 'info';
  return 'neutral';
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="text-xs rounded-lg p-3 border shadow-xl" style={{ background: '#0d1117', borderColor: 'var(--border)' }}>
      <p className="text-gray-400 mb-2 font-bold">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.fill || p.color }} />
          <span className="text-gray-300">{p.name}:</span>
          <span className="font-bold text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const { data, loading, refresh } = usePortfolioAnalytics();

  const riskChartData = data?.commodities.map(c => ({
    name: c.commodity,
    'Risk Score': c.risk_score,
    'Evidence Score': c.evidence_score,
  })) ?? [];

  const invChartData = data?.commodities.map(c => ({
    name: c.commodity,
    'Coverage %': c.inventory_coverage_pct,
  })) ?? [];

  const statusPieData = data ? [
    { name: 'Allowed', value: data.permission_status_counts.Allowed || 0, color: '#10b981' },
    { name: 'Review Required', value: data.permission_status_counts['Review Required'] || 0, color: '#f59e0b' },
    { name: 'Limited', value: data.permission_status_counts.Limited || 0, color: '#eab308' },
    { name: 'Blocked', value: data.permission_status_counts.Blocked || 0, color: '#ef4444' },
  ].filter(d => d.value > 0) : [];

  const cols = [
    'Commodity', 'Permission Status', 'Market State', 'Risk Score',
    'Evidence Score', 'Net Qty (MT)', 'MtM Value ($M)', 'Inv Coverage',
    'Logistics', 'High Alerts', ''
  ];

  return (
    <PageShell>
      <PageHeader
        title="Portfolio & Cross-Commodity Analytics"
        subtitle="Aggregated exposure, risk score comparison, and inventory coverage across all commodities"
      >
        <ActionButton variant="ghost" onClick={refresh} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </ActionButton>
      </PageHeader>

      {/* Overview Stats Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mx-6 mb-5">
        <div className="p-4 rounded-xl border text-center" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Total Portfolio Exposure</p>
          <p className="text-xl font-black text-white">
            ${((data?.total_portfolio_exposure_usd ?? 0) / 1_000_000).toFixed(2)}M
          </p>
        </div>
        <div className="p-4 rounded-xl border text-center" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Credit Line Utilization</p>
          <p className={`text-xl font-black ${(data?.overall_credit_utilization_pct ?? 0) >= 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {data?.overall_credit_utilization_pct ?? 0}%
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            ${((data?.total_current_exposure_usd ?? 0) / 1_000_000).toFixed(1)}M / ${((data?.total_credit_limit_usd ?? 0) / 1_000_000).toFixed(1)}M
          </p>
        </div>
        <div className="p-4 rounded-xl border text-center" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Highest Risk Commodity</p>
          <p className="text-xl font-black text-red-400">
            {data?.highest_risk_commodity ?? '—'}
          </p>
        </div>
        <div className="p-4 rounded-xl border text-center" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Blocked Commodities</p>
          <p className={`text-xl font-black ${(data?.permission_status_counts?.Blocked ?? 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {data?.permission_status_counts?.Blocked ?? 0}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mx-6 mb-5">

        {/* Risk & Evidence Score Bar Chart */}
        <div className="p-5 rounded-2xl border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <h4 className="text-[10px] uppercase font-bold tracking-widest text-gray-400">
              Cross-Commodity Risk vs Evidence Scores
            </h4>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskChartData} margin={{ top: 5, right: 10, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                <XAxis dataKey="name" stroke="#4b5563" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} stroke="#4b5563" tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
                <Bar dataKey="Risk Score" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Evidence Score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory Coverage Chart */}
        <div className="p-5 rounded-2xl border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-emerald-400" />
            <h4 className="text-[10px] uppercase font-bold tracking-widest text-gray-400">
              Inventory Coverage % vs Minimum Threshold
            </h4>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={invChartData} margin={{ top: 5, right: 10, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                <XAxis dataKey="name" stroke="#4b5563" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 150]} stroke="#4b5563" tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={100} stroke="#10b981" strokeDasharray="4 4" label={{ value: '100% Min Target', fill: '#10b981', fontSize: 10 }} />
                <Bar dataKey="Coverage %" radius={[4, 4, 0, 0]}>
                  {invChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry['Coverage %'] < 100 ? '#ef4444' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Cross-Commodity Portfolio Matrix Table */}
      <div className="mx-6 mb-6 rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <div className="p-4 border-b flex items-center justify-between" style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'var(--border)' }}>
          <h4 className="text-[10px] uppercase font-bold tracking-widest text-gray-400">
            Cross-Commodity Executive Portfolio Matrix
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b" style={{ background: 'rgba(0,0,0,0.4)', borderColor: 'var(--border)' }}>
                {cols.map(col => (
                  <th key={col} className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-gray-500 whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            {loading || !data ? (
              <LoadingRows cols={cols.length} />
            ) : (
              <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {data.commodities.map(c => (
                  <tr key={c.commodity} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-bold text-white">{c.commodity}</td>
                    <td className="px-4 py-3">
                      <StatusBadge label={c.permission} type={permissionType(c.permission)} />
                    </td>
                    <td className="px-4 py-3 text-gray-400">{c.market_state}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${c.risk_score >= 70 ? 'text-red-400' : c.risk_score >= 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {c.risk_score}/100
                      </span>
                    </td>
                    <td className="px-4 py-3 text-blue-400 font-bold">{c.evidence_score}/100</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">{c.net_quantity_mt.toLocaleString()} MT</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">${(c.mtm_value_usd / 1_000_000).toFixed(2)}M</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${c.inventory_coverage_pct < 100 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {c.inventory_coverage_pct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {c.in_transit_shipments} in-transit {c.delayed_shipments > 0 && <span className="text-amber-400 font-bold">({c.delayed_shipments} delayed)</span>}
                    </td>
                    <td className="px-4 py-3">
                      {c.high_alerts > 0 ? (
                        <span className="text-red-400 font-bold">{c.high_alerts} critical</span>
                      ) : (
                        <span className="text-gray-500">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard`} className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                        View <ExternalLink className="w-3 h-3" />
                      </Link>
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

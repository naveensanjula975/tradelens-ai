'use client';

import React, { useState } from 'react';
import { useAlerts } from '@/hooks/use-api';
import { PageShell } from '@/components/layout/page-shell';
import { PageHeader, CommodityFilter } from '@/components/ui/shared';
import { AlertList } from '@/components/dashboard/alert-list';
import { RefreshCw, ShieldAlert, AlertTriangle, Info } from 'lucide-react';

export default function AlertsPage() {
  const [commodity, setCommodity] = useState('Copper');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const { data: alerts, loading, refresh } = useAlerts(commodity || undefined);

  const filteredAlerts = categoryFilter === 'all'
    ? alerts
    : alerts.filter(a => a.category?.toLowerCase() === categoryFilter.toLowerCase());

  const high = alerts.filter(a => a.severity === 'high').length;
  const medium = alerts.filter(a => a.severity === 'medium').length;
  const low = alerts.filter(a => a.severity === 'low').length;

  const categories = [
    { key: 'all', label: 'All Categories' },
    { key: 'logistics', label: 'Logistics' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'credit', label: 'Credit' },
    { key: 'concentration', label: 'Concentration' },
    { key: 'margin', label: 'Margin' },
    { key: 'market_data', label: 'Market Data' },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Risk Alerts"
        subtitle="Deterministic rule-engine findings — updated on every data refresh"
      >
        <CommodityFilter value={commodity} onChange={setCommodity} />
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all"
          style={{ background: 'var(--card)', borderColor: 'var(--border)', color: '#d1d5db' }}
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </PageHeader>

      {/* Severity summary strip */}
      <div className="grid grid-cols-3 gap-4 mx-6 mb-5">
        {[
          { label: 'High Severity', count: high, icon: ShieldAlert, color: 'text-red-400', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
          { label: 'Medium Severity', count: medium, icon: AlertTriangle, color: 'text-amber-400', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
          { label: 'Low / Info', count: low, icon: Info, color: 'text-blue-400', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
        ].map(({ label, count, icon: Icon, color, bg, border }) => (
          <div key={label} className="p-4 rounded-xl flex items-center gap-4"
            style={{ background: bg, border: `1px solid ${border}` }}>
            <Icon className={`w-6 h-6 ${color} shrink-0`} />
            <div>
              <p className={`text-2xl font-black ${color}`}>{count}</p>
              <p className="text-[10px] uppercase tracking-widest text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 mx-6 mb-4 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => setCategoryFilter(cat.key)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              categoryFilter === cat.key
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-gray-400 hover:text-white border hover:bg-white/5'
            }`}
            style={categoryFilter !== cat.key ? { borderColor: 'var(--border)' } : {}}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Full alert list */}
      <div className="mx-6 mb-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
            </div>
          </div>
        ) : (
          <AlertList alerts={filteredAlerts} />
        )}
      </div>


      {/* Info footer */}
      <div className="mx-6 mb-6 p-4 rounded-xl text-xs text-gray-500 border"
        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border)' }}>
        <strong className="text-gray-400">How alerts are generated:</strong> TradeLens AI evaluates deterministic rules against shipment delays, inventory levels, counterparty credit utilization, position concentrations, and margin positions. Alerts are regenerated fresh every time the dashboard is refreshed — no alerts are stored between sessions beyond the database evaluation pass.
      </div>
    </PageShell>
  );
}

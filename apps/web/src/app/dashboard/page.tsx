'use client';

import React, { useState } from 'react';
import { useDashboard } from '@/hooks/use-api';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { TopNav } from '@/components/layout/top-nav';
import { DecisionCard } from '@/components/dashboard/decision-card';
import { MetricScoreCard } from '@/components/dashboard/score-card';
import { AIBriefCard } from '@/components/dashboard/ai-brief-card';
import { AlertList } from '@/components/dashboard/alert-list';
import { ExposureChart } from '@/components/dashboard/exposure-chart';
import { CSVUploadModal } from '@/components/uploads/csv-upload';
import { InventoryStatusBar } from '@/components/dashboard/inventory-status-bar';
import { Layers, Truck, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [commodity, setCommodity] = useState('Copper');
  const { data, loading, refresh } = useDashboard(commodity);

  const alertCount = data?.alerts?.filter((a) => a.severity === 'high').length ?? 0;

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <TopNav
          selectedCommodity={commodity}
          onCommodityChange={(c) => setCommodity(c)}
          onRefresh={refresh}
          isRefreshing={loading}
          alertCount={alertCount}
        />

        {loading || !data ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="relative w-12 h-12 mx-auto">
                <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
              </div>
              <p className="text-sm text-gray-400 font-medium">Evaluating Risk Engine…</p>
            </div>
          </div>
        ) : (
          <main className="p-6 space-y-5 overflow-y-auto flex-1">

            {/* ── Row 1: Decision + Scores ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <DecisionCard decision={data.decision} />
              <MetricScoreCard title="Evidence Score" score={data.decision.evidence_score} type="evidence" />
              <MetricScoreCard title="Risk Score" score={data.decision.risk_score} type="risk" />
            </div>

            {/* ── Row 2: AI Brief ── */}
            <AIBriefCard brief={data.ai_brief} />

            {/* ── Row 3: Alerts + Exposure ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Active Risk Alerts</h4>
                  <Link href="/alerts" className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                    View all <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <AlertList alerts={data.alerts} />
              </div>
              <ExposureChart counterparties={data.counterparties} />
            </div>

            {/* ── Row 4: Inventory Status ── */}
            <InventoryStatusBar inventory={data.inventory} />

            {/* ── Row 5: Data Import + Quick Tables ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <CSVUploadModal onSuccess={refresh} />

              {/* Positions Quick View */}
              <div className="p-5 rounded-2xl border flex flex-col gap-3" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-400" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Open Positions</span>
                  </div>
                  <Link href="/positions" className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                    All <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <div className="space-y-2">
                  {data.positions.slice(0, 4).map((p) => (
                    <div key={p.id} className="flex justify-between items-center text-xs p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                      <div>
                        <div className="font-bold text-white">{p.instrument}</div>
                        <div className="text-[10px] text-gray-500">{p.counterparty || 'Exchange'}</div>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${p.direction.toLowerCase() === 'long' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {p.direction}
                        </span>
                        <div className="text-[10px] text-gray-400 mt-0.5">{p.quantity} {p.unit}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipments Quick View */}
              <div className="p-5 rounded-2xl border flex flex-col gap-3" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-amber-400" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Shipments</span>
                  </div>
                  <Link href="/shipments" className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                    All <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <div className="space-y-2">
                  {data.shipments.slice(0, 4).map((s) => (
                    <div key={s.id} className="flex justify-between items-center text-xs p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                      <div>
                        <div className="font-bold text-white">{s.origin} → {s.destination}</div>
                        <div className="text-[10px] text-gray-500">ETA: {s.expected_arrival}</div>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${s.status === 'Delayed' ? 'bg-red-500/10 text-red-400' : s.status === 'In Transit' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          {s.status}
                        </span>
                        {s.delay_days > 0 && (
                          <div className="text-[10px] text-amber-400 mt-0.5">+{s.delay_days}d delay</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}

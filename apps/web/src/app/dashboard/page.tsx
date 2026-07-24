'use client';

import React, { useEffect, useState } from 'react';
import { fetchDashboard } from '@/lib/api-client';
import { DashboardData } from '@/types/domain';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { TopNav } from '@/components/layout/top-nav';
import { DecisionCard } from '@/components/dashboard/decision-card';
import { MetricScoreCard } from '@/components/dashboard/score-card';
import { AIBriefCard } from '@/components/dashboard/ai-brief-card';
import { AlertList } from '@/components/dashboard/alert-list';
import { ExposureChart } from '@/components/dashboard/exposure-chart';
import { CSVUploadModal } from '@/components/uploads/csv-upload';
import { Package, Truck, Layers, Users } from 'lucide-react';

export default function DashboardPage() {
  const [commodity, setCommodity] = useState('Copper');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async (comm: string) => {
    setLoading(true);
    const res = await fetchDashboard(comm);
    setData(res);
    setLoading(false);
  };

  useEffect(() => {
    loadData(commodity);
  }, [commodity]);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <TopNav
          selectedCommodity={commodity}
          onCommodityChange={(c) => setCommodity(c)}
          onRefresh={() => loadData(commodity)}
        />

        {loading || !data ? (
          <div className="p-8 flex items-center justify-center min-h-[500px]">
            <div className="text-gray-400 text-sm font-semibold animate-pulse">Evaluating Operational & Risk Engine...</div>
          </div>
        ) : (
          <main className="p-6 space-y-6 overflow-y-auto">
            {/* Top 3 Header Cards: Decision, Risk Score, Evidence Score */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <DecisionCard decision={data.decision} />
              <MetricScoreCard title="Evidence Score" score={data.decision.evidence_score} type="evidence" />
              <MetricScoreCard title="Risk Score" score={data.decision.risk_score} type="risk" />
            </div>

            {/* AI Summary Brief */}
            <AIBriefCard brief={data.ai_brief} />

            {/* Main Operational Split: Alerts & Exposure */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs uppercase font-bold tracking-wider text-gray-400 mb-3">Rule-Based Active Alerts</h4>
                <AlertList alerts={data.alerts} />
              </div>
              <ExposureChart counterparties={data.counterparties} />
            </div>

            {/* Data Upload & Quick Table Summaries */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <CSVUploadModal onSuccess={() => loadData(commodity)} />

              {/* Positions Quick View */}
              <div className="p-6 rounded-2xl bg-card border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="w-4 h-4 text-blue-400" />
                  <h4 className="text-xs uppercase font-bold tracking-wider text-gray-400">Open Positions</h4>
                </div>
                <div className="space-y-2">
                  {data.positions.map((p) => (
                    <div key={p.id} className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-gray-900/60 border border-gray-800">
                      <div>
                        <div className="font-bold text-white">{p.instrument} ({p.direction})</div>
                        <div className="text-[10px] text-gray-400">{p.counterparty || 'Exchange'}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-200">{p.quantity} {p.unit}</div>
                        <div className="text-[10px] text-emerald-400">${p.market_price} / unit</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipments Quick View */}
              <div className="p-6 rounded-2xl bg-card border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Truck className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs uppercase font-bold tracking-wider text-gray-400">Shipments Status</h4>
                </div>
                <div className="space-y-2">
                  {data.shipments.map((s) => (
                    <div key={s.id} className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-gray-900/60 border border-gray-800">
                      <div>
                        <div className="font-bold text-white">{s.origin} → {s.destination}</div>
                        <div className="text-[10px] text-gray-400">ETA: {s.expected_arrival}</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${s.delay_days > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {s.status} ({s.delay_days}d delay)
                        </div>
                        <div className="text-[10px] text-gray-400">{s.quantity} {s.unit}</div>
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

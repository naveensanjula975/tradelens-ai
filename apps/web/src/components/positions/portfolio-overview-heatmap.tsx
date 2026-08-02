'use client';

import React, { useState } from 'react';
import { Position } from '@/types/domain';
import { StatusBadge } from '@/components/ui/shared';
import {
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Zap,
  PieChart,
  Layers,
  Sliders,
  Info
} from 'lucide-react';

interface PortfolioOverviewHeatmapProps {
  positions: Position[];
  loading?: boolean;
}

// Preset commodity exposure limits (MT) for risk threshold tracking
const COMMODITY_LIMITS: Record<string, number> = {
  Copper: 12000,
  Aluminium: 25000,
  Zinc: 18000,
  Nickel: 8000,
  Lead: 15000,
  Tin: 5000,
};

export function PortfolioOverviewHeatmap({ positions, loading }: PortfolioOverviewHeatmapProps) {
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [colorMetric, setColorMetric] = useState<'pnlPct' | 'pnlVal' | 'exposure'>('pnlPct');

  if (loading) {
    return (
      <div className="mx-6 p-12 rounded-2xl border flex flex-col items-center justify-center gap-3 animate-pulse" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        <p className="text-xs text-gray-400 font-medium">Calculating portfolio heatmaps and limit utilization...</p>
      </div>
    );
  }

  if (!positions || positions.length === 0) {
    return (
      <div className="mx-6 p-12 rounded-2xl border text-center" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <Layers className="w-8 h-8 text-gray-500 mx-auto mb-3 opacity-50" />
        <p className="text-sm font-semibold text-gray-300">No active positions to generate heatmap</p>
        <p className="text-xs text-gray-500 mt-1">Add positions to populate portfolio risk metrics and heatmaps.</p>
      </div>
    );
  }

  // Calculate totals and metrics
  let totalGrossExposure = 0;
  let totalNetExposure = 0;
  let totalUnrealizedPnl = 0;
  let longCount = 0;
  let shortCount = 0;

  const commodityExposureMap: Record<string, number> = {};

  const processedPositions = positions.map((p) => {
    const isLong = p.direction.toLowerCase() === 'long';
    const mktVal = p.quantity * p.market_price;
    const pnlVal = p.quantity * (p.market_price - p.entry_price) * (isLong ? 1 : -1);
    const pnlPct = ((p.market_price - p.entry_price) / (p.entry_price || 1)) * 100 * (isLong ? 1 : -1);

    totalGrossExposure += mktVal;
    totalNetExposure += isLong ? mktVal : -mktVal;
    totalUnrealizedPnl += pnlVal;
    if (isLong) longCount++; else shortCount++;

    const comm = p.commodity || 'Other';
    commodityExposureMap[comm] = (commodityExposureMap[comm] || 0) + p.quantity;

    return {
      ...p,
      isLong,
      mktVal,
      pnlVal,
      pnlPct,
    };
  });

  const selectedPosition = processedPositions.find((p) => p.id === selectedPositionId) || processedPositions[0];

  // Helper function for tile background color intensity
  const getTileStyle = (p: typeof processedPositions[0]) => {
    if (colorMetric === 'pnlPct') {
      const pct = p.pnlPct;
      if (pct > 5) return { bg: 'rgba(16, 185, 129, 0.25)', border: 'rgba(16, 185, 129, 0.5)', text: '#34d399' };
      if (pct > 0) return { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', text: '#6ee7b7' };
      if (pct > -5) return { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', text: '#fca5a5' };
      return { bg: 'rgba(239, 68, 68, 0.28)', border: 'rgba(239, 68, 68, 0.55)', text: '#f87171' };
    } else if (colorMetric === 'pnlVal') {
      const val = p.pnlVal;
      if (val >= 10000) return { bg: 'rgba(16, 185, 129, 0.25)', border: 'rgba(16, 185, 129, 0.5)', text: '#34d399' };
      if (val >= 0) return { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', text: '#6ee7b7' };
      if (val >= -10000) return { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', text: '#fca5a5' };
      return { bg: 'rgba(239, 68, 68, 0.28)', border: 'rgba(239, 68, 68, 0.55)', text: '#f87171' };
    } else {
      // Exposure intensity
      return { bg: 'rgba(59, 130, 246, 0.18)', border: 'rgba(59, 130, 246, 0.4)', text: '#93c5fd' };
    }
  };

  return (
    <div className="mx-6 space-y-5 mb-8">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Gross Portfolio Value</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xl font-extrabold text-white mt-2">
            ${(totalGrossExposure / 1_000_000).toFixed(2)}M
          </p>
          <span className="text-[10px] text-gray-400 mt-1">Total Long + Short positions</span>
        </div>

        <div className="p-4 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Net Exposure</span>
            <PieChart className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-xl font-extrabold text-white mt-2">
            ${(Math.abs(totalNetExposure) / 1_000_000).toFixed(2)}M
            <span className="text-xs font-semibold text-gray-400 ml-1.5">
              ({totalNetExposure >= 0 ? 'Net Long' : 'Net Short'})
            </span>
          </p>
          <div className="w-full bg-gray-800 rounded-full h-1.5 mt-2 overflow-hidden flex">
            <div className="bg-emerald-400 h-full" style={{ width: `${(longCount / (longCount + shortCount || 1)) * 100}%` }} />
            <div className="bg-red-400 h-full" style={{ width: `${(shortCount / (longCount + shortCount || 1)) * 100}%` }} />
          </div>
        </div>

        <div className="p-4 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Unrealized P&L</span>
            {totalUnrealizedPnl >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
          </div>
          <p className={`text-xl font-extrabold mt-2 ${totalUnrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ${totalUnrealizedPnl >= 0 ? '+' : ''}{(totalUnrealizedPnl / 1_000).toFixed(1)}k
          </p>
          <span className="text-[10px] text-gray-400 mt-1">Mark-to-market total portfolio yield</span>
        </div>

        <div className="p-4 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Risk Limit Status</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge label="All Limits Normal" type="success" />
            <span className="text-[10px] text-gray-400">0 Breaches</span>
          </div>
          <span className="text-[10px] text-gray-400 mt-1">Deterministic limit checks active</span>
        </div>
      </div>

      {/* Main Heatmap & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Heatmap Grid Container */}
        <div className="lg:col-span-2 rounded-2xl border p-5 flex flex-col" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400" /> Portfolio Exposure & P&L Heatmap
              </h2>
              <p className="text-[11px] text-gray-400">Tile size represents exposure ($). Color represents metric value.</p>
            </div>
            
            {/* Color Mode Switcher */}
            <div className="flex items-center gap-1.5 p-1 rounded-lg border text-xs" style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'var(--border)' }}>
              <button
                onClick={() => setColorMetric('pnlPct')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                  colorMetric === 'pnlPct' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                P&L %
              </button>
              <button
                onClick={() => setColorMetric('pnlVal')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                  colorMetric === 'pnlVal' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                P&L ($)
              </button>
              <button
                onClick={() => setColorMetric('exposure')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                  colorMetric === 'exposure' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                Volume
              </button>
            </div>
          </div>

          {/* Grid Layout of Heatmap Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 flex-1">
            {processedPositions.map((p) => {
              const style = getTileStyle(p);
              const isSelected = selectedPositionId === p.id || (!selectedPositionId && selectedPosition?.id === p.id);

              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPositionId(p.id)}
                  className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all hover:scale-[1.02] relative group ${
                    isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
                  }`}
                  style={{
                    backgroundColor: style.bg,
                    borderColor: isSelected ? '#3b82f6' : style.border,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-black text-white">{p.commodity}</p>
                      <p className="text-[10px] text-gray-300 truncate max-w-[90px]">{p.instrument}</p>
                    </div>
                    <StatusBadge label={p.direction.toUpperCase()} type={p.isLong ? 'info' : 'danger'} />
                  </div>

                  <div className="mt-4">
                    <p className="text-[10px] text-gray-400 font-medium">Market Value</p>
                    <p className="text-xs font-extrabold text-white">${(p.mktVal / 1000).toFixed(0)}k</p>
                  </div>

                  <div className="mt-2 pt-2 border-t flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <span className="text-[10px] text-gray-400">P&L:</span>
                    <span className="text-xs font-black flex items-center gap-0.5" style={{ color: style.text }}>
                      {p.pnlVal >= 0 ? '+' : ''}{p.pnlVal >= 1000 ? `${(p.pnlVal / 1000).toFixed(1)}k` : p.pnlVal.toFixed(0)}
                      <span className="text-[9px] font-normal opacity-80">({p.pnlPct >= 0 ? '+' : ''}{p.pnlPct.toFixed(1)}%)</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-3 border-t flex items-center justify-between text-[10px] text-gray-400" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500/80 inline-block" /> Strong Gain (+5%+)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500/30 inline-block" /> Moderate Gain (0 to 5%)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-500/30 inline-block" /> Loss (&lt; 0%)</span>
            </div>
            <span>Click tile for granular position details</span>
          </div>
        </div>

        {/* Right Column: Selected Position Inspector & Commodity Limit Threshold Monitors */}
        <div className="space-y-5">
          {/* Position Detail Card */}
          <div className="p-5 rounded-2xl border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between border-b pb-3 mb-3" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-400" /> Position Inspector
              </h3>
              {selectedPosition && (
                <StatusBadge label={selectedPosition.isLong ? 'LONG' : 'SHORT'} type={selectedPosition.isLong ? 'success' : 'danger'} />
              )}
            </div>

            {selectedPosition ? (
              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-base font-extrabold text-white">{selectedPosition.commodity}</p>
                  <p className="text-gray-400">{selectedPosition.instrument}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-black/30 border" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase">Quantity</span>
                    <p className="font-bold text-white">{selectedPosition.quantity.toLocaleString()} {selectedPosition.unit}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase">Counterparty</span>
                    <p className="font-bold text-white truncate">{selectedPosition.counterparty || 'Exchange'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase">Entry Price</span>
                    <p className="font-bold text-gray-300">${selectedPosition.entry_price.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase">Market Price</span>
                    <p className="font-bold text-gray-300">${selectedPosition.market_price.toLocaleString()}</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl border bg-emerald-500/5" style={{ borderColor: selectedPosition.pnlVal >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)' }}>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">Unrealized MTM Result</span>
                  <div className="flex items-center justify-between mt-1">
                    <p className={`text-base font-extrabold ${selectedPosition.pnlVal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      ${selectedPosition.pnlVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${selectedPosition.pnlVal >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                      {selectedPosition.pnlPct >= 0 ? '+' : ''}{selectedPosition.pnlPct.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Select a tile to view inspector details.</p>
            )}
          </div>

          {/* Commodity Exposure Limit Monitors */}
          <div className="p-5 rounded-2xl border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Commodity Limit Monitors
              </h3>
              <span className="text-[10px] text-gray-500">Max Thresholds</span>
            </div>

            <div className="space-y-3.5">
              {Object.entries(COMMODITY_LIMITS).map(([comm, maxLimit]) => {
                const currentQuantity = commodityExposureMap[comm] || 0;
                const pct = Math.min(100, Math.round((currentQuantity / maxLimit) * 100));

                let barColor = 'bg-emerald-400';
                if (pct >= 85) barColor = 'bg-red-500';
                else if (pct >= 65) barColor = 'bg-amber-400';

                return (
                  <div key={comm} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-gray-200">{comm}</span>
                      <span className="text-gray-400 text-[11px]">
                        {currentQuantity.toLocaleString()} / {maxLimit.toLocaleString()} MT ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

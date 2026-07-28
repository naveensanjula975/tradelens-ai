'use client';

import React, { useState, useEffect } from 'react';
import { evaluateSimulation } from '@/lib/api-client';
import { PageShell } from '@/components/layout/page-shell';
import { PageHeader, CommodityFilter, StatusBadge } from '@/components/ui/shared';
import { SimulationResult } from '@/types/domain';
import { Sliders, RefreshCw, AlertTriangle, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';

function permissionType(p: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (p === 'Allowed') return 'success';
  if (p === 'Review Required') return 'warning';
  if (p === 'Blocked') return 'danger';
  if (p === 'Limited') return 'info';
  return 'neutral';
}

export default function SimulationPage() {
  const [commodity, setCommodity] = useState('Copper');
  const [priceShift, setPriceShift] = useState(0);
  const [inventoryShift, setInventoryShift] = useState(0);
  const [delayDays, setDelayDays] = useState(0);
  const [exposureShift, setExposureShift] = useState(0);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await evaluateSimulation({
        commodity,
        price_shift_pct: priceShift,
        inventory_shift_pct: inventoryShift,
        added_shipment_delay_days: delayDays,
        counterparty_exposure_shift_pct: exposureShift,
      });
      setResult(data);
    } catch {
      setError('Failed to evaluate scenario simulation. Ensure backend API is online.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [commodity]);

  const resetSliders = () => {
    setPriceShift(0);
    setInventoryShift(0);
    setDelayDays(0);
    setExposureShift(0);
  };

  return (
    <PageShell>
      <PageHeader
        title="Scenario Simulator"
        subtitle="What-If stress testing — simulate market price shifts, inventory drops, shipment delays, and credit shocks"
      >
        <CommodityFilter value={commodity} onChange={setCommodity} />
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mx-6 mb-6">

        {/* ── Left Column: Stress Test Controls ── */}
        <div className="lg:col-span-5 space-y-5">
          <div className="p-5 rounded-2xl border flex flex-col gap-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs uppercase font-bold tracking-widest text-gray-300">Stress Test Parameters</h3>
              </div>
              <button
                onClick={resetSliders}
                className="text-[10px] text-gray-400 hover:text-white transition-colors"
              >
                Reset Sliders
              </button>
            </div>

            {/* Slider 1: Market Price Shift */}
            <SliderControl
              label="Market Price Shift (%)"
              value={priceShift}
              onChange={setPriceShift}
              min={-30}
              max={30}
              step={1}
              unit="%"
              desc="Simulate spot/futures price shocks on open position margins."
              color={priceShift < 0 ? 'text-red-400' : priceShift > 0 ? 'text-emerald-400' : 'text-gray-300'}
            />

            {/* Slider 2: Inventory Shift */}
            <SliderControl
              label="Inventory Quantity Shift (%)"
              value={inventoryShift}
              onChange={setInventoryShift}
              min={-50}
              max={50}
              step={5}
              unit="%"
              desc="Simulate warehouse stock drawdowns or unexpected receipts."
              color={inventoryShift < 0 ? 'text-amber-400' : inventoryShift > 0 ? 'text-emerald-400' : 'text-gray-300'}
            />

            {/* Slider 3: Added Shipment Delay */}
            <SliderControl
              label="Added Shipment Delay (Days)"
              value={delayDays}
              onChange={setDelayDays}
              min={0}
              max={14}
              step={1}
              unit=" days"
              desc="Simulate port congestion, customs clearance, or vessel delays."
              color={delayDays > 0 ? 'text-amber-400' : 'text-gray-300'}
            />

            {/* Slider 4: Counterparty Exposure Shift */}
            <SliderControl
              label="Counterparty Credit Exposure Shift (%)"
              value={exposureShift}
              onChange={setExposureShift}
              min={-30}
              max={50}
              step={5}
              unit="%"
              desc="Simulate credit line drawdowns or credit rating downgrades."
              color={exposureShift > 0 ? 'text-red-400' : exposureShift < 0 ? 'text-emerald-400' : 'text-gray-300'}
            />

            <button
              onClick={runSimulation}
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all bg-blue-600 hover:bg-blue-500 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Evaluating Simulation…' : 'Run Scenario Simulation'}
            </button>
          </div>
        </div>

        {/* ── Right Column: Baseline vs Simulated Results ── */}
        <div className="lg:col-span-7 space-y-5">
          {error && (
            <div className="p-4 rounded-xl text-xs text-red-400 bg-red-500/10 border border-red-500/20 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!result && !loading ? (
            <div className="p-12 rounded-2xl border text-center text-gray-500 text-xs" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              Adjust sliders on the left and click "Run Scenario Simulation" to evaluate what-if stress tests.
            </div>
          ) : result && (
            <>
              {/* Permission Change Banner */}
              {result.delta.permission_changed && (
                <div className="p-4 rounded-xl border bg-red-500/10 border-red-500/30 text-red-200 flex items-center gap-3">
                  <ShieldAlert className="w-6 h-6 text-red-400 shrink-0" />
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-red-400">Permission Status Changed</h4>
                    <p className="text-xs text-gray-300">
                      Stress testing shifts status from <strong className="text-white">{result.baseline.permission}</strong> to <strong className="font-black text-red-400">{result.simulated.permission}</strong>!
                    </p>
                  </div>
                </div>
              )}

              {/* Side-by-Side Comparison Cards */}
              <div className="grid grid-cols-2 gap-4">

                {/* Baseline Card */}
                <div className="p-5 rounded-2xl border flex flex-col justify-between space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Current Baseline</span>
                      <StatusBadge label={result.baseline.permission} type={permissionType(result.baseline.permission)} />
                    </div>
                    <p className="text-xs font-bold text-gray-300 mb-3">{result.baseline.market_state}</p>
                  </div>
                  <div className="space-y-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Risk Score:</span>
                      <span className="font-bold text-white">{result.baseline.risk_score} / 100</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Evidence Score:</span>
                      <span className="font-bold text-blue-400">{result.baseline.evidence_score} / 100</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Total Findings:</span>
                      <span className="font-bold text-gray-300">{result.baseline.findings_count}</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Stress Card */}
                <div className="p-5 rounded-2xl border flex flex-col justify-between space-y-4 relative overflow-hidden"
                  style={{ background: 'rgba(30, 45, 69, 0.4)', borderColor: result.delta.permission_changed ? '#ef4444' : 'var(--border)' }}>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-blue-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Simulated Stress
                      </span>
                      <StatusBadge label={result.simulated.permission} type={permissionType(result.simulated.permission)} />
                    </div>
                    <p className="text-xs font-bold text-white mb-3">{result.simulated.market_state}</p>
                  </div>
                  <div className="space-y-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Risk Score:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">{result.simulated.risk_score} / 100</span>
                        {result.delta.risk_score_change !== 0 && (
                          <span className={`text-[10px] font-bold ${result.delta.risk_score_change > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            ({result.delta.risk_score_change > 0 ? `+${result.delta.risk_score_change}` : result.delta.risk_score_change})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Evidence Score:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-blue-400">{result.simulated.evidence_score} / 100</span>
                        {result.delta.evidence_score_change !== 0 && (
                          <span className={`text-[10px] font-bold ${result.delta.evidence_score_change < 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            ({result.delta.evidence_score_change > 0 ? `+${result.delta.evidence_score_change}` : result.delta.evidence_score_change})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Total Findings:</span>
                      <span className="font-bold text-gray-300">{result.simulated.findings_count}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Newly Triggered Risk Findings */}
              {result.delta.new_findings.length > 0 && (
                <div className="p-5 rounded-2xl border space-y-3" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                  <h4 className="text-[10px] uppercase font-bold tracking-widest text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Newly Triggered Risk Findings ({result.delta.new_findings.length})
                  </h4>
                  <div className="space-y-2">
                    {result.delta.new_findings.map((f, idx) => (
                      <div key={idx} className="p-3 rounded-xl border flex items-start justify-between text-xs" style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'var(--border)' }}>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${f.severity === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                              {f.severity}
                            </span>
                            <span className="font-bold text-white">{f.rule.replace(/_/g, ' ')}</span>
                          </div>
                          <p className="text-gray-300 text-xs">{f.message}</p>
                          {f.action && <p className="text-[11px] text-gray-500 mt-1">Action: {f.action}</p>}
                        </div>
                        <span className="font-bold text-red-400 text-xs shrink-0 ml-3">+{f.score} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </PageShell>
  );
}

function SliderControl({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  desc,
  color,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  desc: string;
  color: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-300">{label}</label>
        <span className={`text-xs font-bold ${color}`}>
          {value > 0 ? `+${value}` : value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full accent-blue-500 bg-gray-800 rounded-lg h-1.5 cursor-pointer"
      />
      <p className="text-[10px] text-gray-500">{desc}</p>
    </div>
  );
}

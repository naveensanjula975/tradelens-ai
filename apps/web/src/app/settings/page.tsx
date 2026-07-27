'use client';

import React, { useState } from 'react';
import { PageShell } from '@/components/layout/page-shell';
import { PageHeader } from '@/components/ui/shared';
import { exportBrief } from '@/lib/api-client';
import {
  Server, Cpu, ShieldAlert, Download, CheckCircle, Database, RefreshCw
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function SettingsPage() {
  const [healthStatus, setHealthStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [commodity, setCommodity] = useState('Copper');
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<string | null>(null);

  const checkHealth = async () => {
    setHealthStatus('checking');
    try {
      const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
      setHealthStatus(res.ok ? 'ok' : 'error');
    } catch {
      setHealthStatus('error');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setExportResult(null);
    try {
      const data = await exportBrief(commodity);
      const blob = new Blob([data.content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tradelens-brief-${commodity.toLowerCase()}-${new Date().toISOString().split('T')[0]}.md`;
      a.click();
      URL.revokeObjectURL(url);
      setExportResult('Brief exported successfully.');
    } catch {
      setExportResult('Export failed — ensure the backend is running.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Engine Configuration"
        subtitle="System settings, API connectivity, and export tools"
      />

      <div className="mx-6 mb-6 space-y-5 max-w-2xl">

        {/* API Status */}
        <Section title="Backend API" icon={Server}>
          <ConfigRow label="Endpoint" value={API_BASE} />
          <ConfigRow label="API Version" value="0.1.0" />
          <div className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
            <span className="text-xs text-gray-400">Health Check</span>
            <div className="flex items-center gap-3">
              {healthStatus === 'ok' && <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Healthy</span>}
              {healthStatus === 'error' && <span className="text-xs text-red-400">Unreachable</span>}
              <button
                onClick={checkHealth}
                disabled={healthStatus === 'checking'}
                className="text-xs font-semibold px-3 py-1 rounded-lg border transition-all"
                style={{ background: 'var(--background)', borderColor: 'var(--border)', color: '#9ca3af' }}
              >
                <RefreshCw className={`w-3 h-3 inline mr-1 ${healthStatus === 'checking' ? 'animate-spin' : ''}`} />
                {healthStatus === 'checking' ? 'Checking…' : 'Ping'}
              </button>
            </div>
          </div>
        </Section>

        {/* AI Engine */}
        <Section title="AI Explanation Engine" icon={Cpu}>
          <ConfigRow label="Model" value="OpenAI gpt-4o" />
          <ConfigRow label="Fallback" value="Deterministic template generator (no API key needed)" />
          <ConfigRow label="Temperature" value="0.2 (low — factual summaries)" />
          <ConfigRow label="Output format" value="JSON schema (structured)" />
          <div className="mt-2 p-3 rounded-lg text-xs text-gray-500" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
            Set <code className="text-blue-400">OPENAI_API_KEY</code> in <code className="text-blue-400">apps/api/.env</code> to enable GPT-4o summaries. Without it, the built-in deterministic fallback runs automatically.
          </div>
        </Section>

        {/* Risk Engine */}
        <Section title="Risk Engine Rules" icon={ShieldAlert}>
          {[
            { rule: 'Shipment Delay', trigger: '≥5 days delay → HIGH · ≥2 days → MEDIUM' },
            { rule: 'Inventory Below Minimum', trigger: '>30% deficit → HIGH · any deficit → MEDIUM' },
            { rule: 'Counterparty Limit', trigger: '≥90% utilization → HIGH · ≥80% → MEDIUM' },
            { rule: 'Position Limit Exceeded', trigger: 'Total long > max_position_quantity → HIGH' },
            { rule: 'High Concentration', trigger: 'Single counterparty >60% of volume → MEDIUM' },
            { rule: 'Negative PnL Margin', trigger: 'Any position with negative unrealized margin → MEDIUM' },
          ].map(({ rule, trigger }) => (
            <div key={rule} className="flex items-start justify-between py-2.5 border-b gap-4" style={{ borderColor: 'var(--border)' }}>
              <span className="text-xs font-semibold text-gray-300 shrink-0">{rule}</span>
              <span className="text-[10px] text-gray-500 text-right">{trigger}</span>
            </div>
          ))}
        </Section>

        {/* Database */}
        <Section title="Database" icon={Database}>
          <ConfigRow label="Type" value="SQLite (default) / PostgreSQL (production)" />
          <ConfigRow label="URL" value="sqlite:///../../data/tradelens.db" />
          <ConfigRow label="Migrations" value="SQLAlchemy create_all on startup" />
        </Section>

        {/* Export */}
        <Section title="Export Trading Brief" icon={Download}>
          <div className="flex items-center gap-3 pt-1 pb-3">
            <select
              value={commodity}
              onChange={e => setCommodity(e.target.value)}
              className="text-xs text-white rounded-lg px-3 py-2 border focus:outline-none"
              style={{ background: 'var(--background)', borderColor: 'var(--border)' }}
            >
              {['Copper','Aluminium','Zinc','Nickel'].map(c => <option key={c}>{c}</option>)}
            </select>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg transition-all bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting ? 'Exporting…' : 'Download Markdown Brief'}
            </button>
          </div>
          {exportResult && (
            <p className={`text-xs ${exportResult.includes('failed') ? 'text-red-400' : 'text-emerald-400'}`}>
              {exportResult}
            </p>
          )}
          <p className="text-[10px] text-gray-600 mt-1">
            Downloads the current AI-generated daily brief as a <code>.md</code> file, including risk scores, alerts, and recommended actions.
          </p>
        </Section>

        {/* Disclaimer */}
        <div className="p-4 rounded-xl text-xs text-gray-600 border" style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.01)' }}>
          <strong className="text-gray-500">Disclaimer:</strong> TradeLens AI is a research and decision-support tool. It does not provide financial advice, execute trades, or replace formal risk-management controls. All decisions remain with the responsible human operator.
        </div>
      </div>
    </PageShell>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b" style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'var(--border)' }}>
        <Icon className="w-4 h-4 text-blue-400" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">{title}</h3>
      </div>
      <div className="px-5 py-2">{children}</div>
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-xs text-gray-300 font-medium text-right ml-4 font-mono">{value}</span>
    </div>
  );
}

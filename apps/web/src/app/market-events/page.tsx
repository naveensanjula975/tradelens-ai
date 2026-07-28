'use client';

import React, { useState } from 'react';
import { useMarketEvents } from '@/hooks/use-api';
import { deleteMarketEvent, createMarketEvent } from '@/lib/api-client';
import { PageShell } from '@/components/layout/page-shell';
import {
  PageHeader, TableContainer, Thead, LoadingRows, EmptyRow,
  ActionButton, CommodityFilter, StatusBadge,
} from '@/components/ui/shared';
import { MarketEvent } from '@/types/domain';
import { Plus, Trash2, Zap, TrendingUp, TrendingDown, Minus, X } from 'lucide-react';

function getImpactType(level: string): 'danger' | 'warning' | 'info' {
  if (level === 'High') return 'danger';
  if (level === 'Medium') return 'warning';
  return 'info';
}

function getImpactIcon(level: string) {
  if (level === 'High') return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  if (level === 'Medium') return <Minus className="w-3.5 h-3.5 text-amber-400" />;
  return <TrendingUp className="w-3.5 h-3.5 text-blue-400" />;
}

const BLANK: Omit<MarketEvent, 'id'> = {
  commodity: 'Copper',
  title: '',
  impact_level: 'Medium',
  description: '',
  source: '',
  date: new Date().toISOString().split('T')[0],
};

export default function MarketEventsPage() {
  const [commodity, setCommodity] = useState('Copper');
  const { data: events, loading, refresh } = useMarketEvents(commodity || undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<Omit<MarketEvent, 'id'>>({ ...BLANK, commodity });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const high = events.filter(e => e.impact_level === 'High').length;
  const medium = events.filter(e => e.impact_level === 'Medium').length;

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this market event?')) return;
    setDeletingId(id);
    try {
      await deleteMarketEvent(id);
      refresh();
    } catch {
      alert('Failed to delete event.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenForm = () => {
    setForm({ ...BLANK, commodity });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.source.trim()) {
      setFormError('Title, description, and source are required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await createMarketEvent(form);
      setFormOpen(false);
      refresh();
    } catch {
      setFormError('Failed to save market event.');
    } finally {
      setSaving(false);
    }
  };

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const cols = ['Date', 'Commodity', 'Title', 'Impact', 'Description', 'Source', ''];

  return (
    <PageShell>
      <PageHeader
        title="Market Events"
        subtitle="Manually logged price-relevant events, sanctions, supply shocks, and macro signals"
      >
        <CommodityFilter value={commodity} onChange={setCommodity} />
        <ActionButton variant="primary" onClick={handleOpenForm}>
          <Plus className="w-3.5 h-3.5" /> Log Event
        </ActionButton>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mx-6 mb-5">
        {[
          { label: 'Total Events', value: events.length, color: 'text-gray-200' },
          { label: 'High Impact', value: high, color: high > 0 ? 'text-red-400' : 'text-gray-400' },
          { label: 'Medium Impact', value: medium, color: medium > 0 ? 'text-amber-400' : 'text-gray-400' },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl border text-center" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">{s.label}</p>
            <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <TableContainer>
        <Thead columns={cols} />
        {loading ? (
          <LoadingRows cols={cols.length} />
        ) : events.length === 0 ? (
          <EmptyRow message="No market events logged. Use 'Log Event' to record a market development." cols={cols.length} />
        ) : (
          <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {events.map(ev => (
              <tr key={ev.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap font-mono text-[11px]">{ev.date}</td>
                <td className="px-4 py-3 font-bold text-white">{ev.commodity}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {getImpactIcon(ev.impact_level)}
                    <span className="font-semibold text-gray-200 text-xs">{ev.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge label={ev.impact_level} type={getImpactType(ev.impact_level)} />
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">{ev.description}</td>
                <td className="px-4 py-3">
                  <span className="text-[10px] text-blue-400 font-semibold">{ev.source}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ActionButton size="xs" variant="danger" onClick={() => handleDelete(ev.id)} disabled={deletingId === ev.id}>
                      <Trash2 className="w-3 h-3" />
                    </ActionButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        )}
      </TableContainer>

      {/* Log Event Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl border shadow-2xl" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h2 className="font-bold text-white">Log Market Event</h2>
              </div>
              <button onClick={() => setFormOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Commodity" required>
                  <select value={form.commodity} onChange={e => set('commodity', e.target.value)} className={inputCls}>
                    {['Copper', 'Aluminium', 'Zinc', 'Nickel'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Impact Level" required>
                  <select value={form.impact_level} onChange={e => set('impact_level', e.target.value)} className={inputCls}>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </Field>
              </div>
              <Field label="Title" required>
                <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Chilean Port Strike Disrupts Copper Exports" className={inputCls} required />
              </Field>
              <Field label="Description" required>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the event and its expected impact on supply/demand or pricing…" className={`${inputCls} resize-none h-20`} required />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Source" required>
                  <input value={form.source} onChange={e => set('source', e.target.value)} placeholder="e.g. Reuters, Bloomberg" className={inputCls} required />
                </Field>
                <Field label="Event Date" required>
                  <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} required />
                </Field>
              </div>
              {formError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">{formError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <ActionButton type="button" variant="ghost" onClick={() => setFormOpen(false)}>Cancel</ActionButton>
                <ActionButton type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Log Event'}
                </ActionButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500">
        {label}{required && <span className="text-blue-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full text-xs text-white rounded-lg px-3 py-2 border focus:outline-none placeholder-gray-600';

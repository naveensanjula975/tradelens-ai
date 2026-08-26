'use client';

import React, { useState } from 'react';
import { useWatchlist } from '@/hooks/use-api';
import {
  createWatchlistEntry,
  deleteWatchlistEntry,
  updateWatchlistEntry,
  evaluateWatchlist,
} from '@/lib/api-client';
import { PageShell } from '@/components/layout/page-shell';
import {
  PageHeader,
  TableContainer,
  Thead,
  LoadingRows,
  EmptyRow,
  ActionButton,
  CommodityFilter,
  StatusBadge,
} from '@/components/ui/shared';
import { PriceWatchlistEntry } from '@/types/domain';
import {
  Bell,
  BellRing,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  RefreshCw,
  X,
  Edit2,
  CheckCircle,
  Clock,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function DirectionBadge({ direction }: { direction: 'above' | 'below' }) {
  const isAbove = direction === 'above';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
        isAbove
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'bg-red-500/10 text-red-400 border border-red-500/20'
      }`}
    >
      {isAbove ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {direction}
    </span>
  );
}

function TriggerStatus({ entry }: { entry: PriceWatchlistEntry }) {
  if (entry.is_triggered) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <BellRing className="w-3 h-3" />
        Triggered
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-gray-700/50 text-gray-400 border border-gray-600/30">
      <Clock className="w-3 h-3" />
      Watching
    </span>
  );
}

// ── Blank form state ──────────────────────────────────────────────────────────

type FormState = {
  commodity: string;
  instrument: string;
  label: string;
  direction: 'above' | 'below';
  threshold_price: string;
  note: string;
};

function makeBlank(commodity: string): FormState {
  return {
    commodity,
    instrument: 'LME Future',
    label: '',
    direction: 'above',
    threshold_price: '',
    note: '',
  };
}

// ── Input helpers ─────────────────────────────────────────────────────────────

const inputCls =
  'w-full text-xs text-white rounded-lg px-3 py-2 border focus:outline-none placeholder-gray-600 bg-transparent';

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500">
        {label}
        {required && <span className="text-amber-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WatchlistPage() {
  const [commodity, setCommodity] = useState('Copper');
  const { data: entries, loading, refresh } = useWatchlist(commodity || undefined);

  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PriceWatchlistEntry | null>(null);
  const [form, setForm] = useState<FormState>(makeBlank('Copper'));
  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const triggered = entries.filter((e) => e.is_triggered);
  const watching = entries.filter((e) => !e.is_triggered);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleOpenCreate = () => {
    setEditingEntry(null);
    setForm(makeBlank(commodity));
    setFormError(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (entry: PriceWatchlistEntry) => {
    setEditingEntry(entry);
    setForm({
      commodity: entry.commodity,
      instrument: entry.instrument,
      label: entry.label,
      direction: entry.direction,
      threshold_price: String(entry.threshold_price),
      note: entry.note ?? '',
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const threshold = parseFloat(form.threshold_price);
    if (!form.label.trim() || !form.instrument.trim() || isNaN(threshold) || threshold <= 0) {
      setFormError('Label, instrument, and a positive threshold price are required.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        commodity: form.commodity,
        instrument: form.instrument,
        label: form.label.trim(),
        direction: form.direction,
        threshold_price: threshold,
        note: form.note.trim() || undefined,
      };

      if (editingEntry) {
        await updateWatchlistEntry(editingEntry.id, payload);
      } else {
        await createWatchlistEntry(payload);
      }

      setFormOpen(false);
      refresh();
    } catch {
      setFormError('Failed to save watchlist entry.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this watchlist entry?')) return;
    setDeletingId(id);
    try {
      await deleteWatchlistEntry(id);
      refresh();
    } catch {
      alert('Failed to remove entry.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      await evaluateWatchlist(commodity || undefined);
      refresh();
    } catch {
      alert('Evaluation failed.');
    } finally {
      setEvaluating(false);
    }
  };

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const cols = ['Label', 'Instrument', 'Direction', 'Threshold', 'Live Price', 'Status', 'Note', ''];

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <PageShell>
      <PageHeader
        title="Price Watchlist"
        subtitle="Monitor live commodity prices against custom alert thresholds. Triggers fire automatically when thresholds are crossed."
      >
        <CommodityFilter value={commodity} onChange={setCommodity} />
        <ActionButton variant="ghost" onClick={handleEvaluate} disabled={evaluating}>
          <RefreshCw className={`w-3.5 h-3.5 ${evaluating ? 'animate-spin' : ''}`} />
          Evaluate
        </ActionButton>
        <ActionButton variant="primary" onClick={handleOpenCreate}>
          <Plus className="w-3.5 h-3.5" />
          Add Alert
        </ActionButton>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mx-6 mb-5">
        {[
          { label: 'Total Alerts', value: entries.length, color: 'text-gray-200' },
          {
            label: 'Triggered',
            value: triggered.length,
            color: triggered.length > 0 ? 'text-amber-400' : 'text-gray-400',
          },
          {
            label: 'Watching',
            value: watching.length,
            color: watching.length > 0 ? 'text-blue-400' : 'text-gray-400',
          },
        ].map((s) => (
          <div
            key={s.label}
            className="p-4 rounded-xl border text-center"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">{s.label}</p>
            <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Triggered banner */}
      {triggered.length > 0 && (
        <div className="mx-6 mb-5 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 flex items-center gap-3">
          <BellRing className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300">
            <span className="font-bold">{triggered.length}</span>{' '}
            {triggered.length === 1 ? 'alert has' : 'alerts have'} triggered —
            live prices have crossed your defined thresholds.
          </p>
        </div>
      )}

      {/* Table */}
      <TableContainer>
        <Thead columns={cols} />
        {loading ? (
          <LoadingRows cols={cols.length} />
        ) : entries.length === 0 ? (
          <EmptyRow
            message="No price alerts configured. Use 'Add Alert' to set a threshold."
            cols={cols.length}
          />
        ) : (
          <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className={`transition-colors group ${
                  entry.is_triggered
                    ? 'bg-amber-500/[0.04] hover:bg-amber-500/[0.07]'
                    : 'hover:bg-white/[0.02]'
                }`}
              >
                {/* Label */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {entry.is_triggered ? (
                      <BellRing className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Bell className="w-3.5 h-3.5 text-gray-500" />
                    )}
                    <span className="font-semibold text-gray-200 text-xs">{entry.label}</span>
                  </div>
                </td>

                {/* Instrument */}
                <td className="px-4 py-3 text-xs text-gray-400">{entry.instrument}</td>

                {/* Direction */}
                <td className="px-4 py-3">
                  <DirectionBadge direction={entry.direction} />
                </td>

                {/* Threshold */}
                <td className="px-4 py-3 font-mono text-xs text-gray-200">
                  ${entry.threshold_price.toLocaleString()}
                </td>

                {/* Live Price */}
                <td className="px-4 py-3 font-mono text-xs">
                  {entry.current_price != null ? (
                    <span
                      className={
                        entry.is_triggered ? 'text-amber-300 font-bold' : 'text-gray-300'
                      }
                    >
                      ${entry.current_price.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-gray-600 italic">No data</span>
                  )}
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <TriggerStatus entry={entry} />
                </td>

                {/* Note */}
                <td className="px-4 py-3 text-gray-500 text-[11px] max-w-[180px] truncate">
                  {entry.note || '—'}
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5">
                    <ActionButton size="xs" variant="ghost" onClick={() => handleOpenEdit(entry)}>
                      <Edit2 className="w-3 h-3" />
                    </ActionButton>
                    <ActionButton
                      size="xs"
                      variant="danger"
                      onClick={() => handleDelete(entry.id)}
                      disabled={deletingId === entry.id}
                    >
                      <Trash2 className="w-3 h-3" />
                    </ActionButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        )}
      </TableContainer>

      {/* Add / Edit Modal */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border shadow-2xl"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <h2 className="font-bold text-white">
                  {editingEntry ? 'Edit Alert' : 'New Price Alert'}
                </h2>
              </div>
              <button
                onClick={() => setFormOpen(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Commodity" required>
                  <select
                    value={form.commodity}
                    onChange={(e) => set('commodity', e.target.value)}
                    className={inputCls}
                    style={{ borderColor: 'var(--border)' }}
                  >
                    {['Copper', 'Aluminium', 'Zinc', 'Nickel'].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Instrument" required>
                  <select
                    value={form.instrument}
                    onChange={(e) => set('instrument', e.target.value)}
                    className={inputCls}
                    style={{ borderColor: 'var(--border)' }}
                  >
                    {['LME Future', 'LME Spot', 'Physical', 'OTC Forward'].map((i) => (
                      <option key={i}>{i}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Alert Label" required>
                <input
                  value={form.label}
                  onChange={(e) => set('label', e.target.value)}
                  placeholder="e.g. Copper breakout above 10,000"
                  className={inputCls}
                  style={{ borderColor: 'var(--border)' }}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Direction" required>
                  <select
                    value={form.direction}
                    onChange={(e) => set('direction', e.target.value as 'above' | 'below')}
                    className={inputCls}
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <option value="above">Above threshold</option>
                    <option value="below">Below threshold</option>
                  </select>
                </Field>
                <Field label="Threshold Price (USD)" required>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.threshold_price}
                    onChange={(e) => set('threshold_price', e.target.value)}
                    placeholder="e.g. 10000"
                    className={inputCls}
                    style={{ borderColor: 'var(--border)' }}
                  />
                </Field>
              </div>

              <Field label="Note (optional)">
                <input
                  value={form.note}
                  onChange={(e) => set('note', e.target.value)}
                  placeholder="e.g. Watch for supply shock breakout"
                  className={inputCls}
                  style={{ borderColor: 'var(--border)' }}
                />
              </Field>

              {formError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <ActionButton type="button" variant="ghost" onClick={() => setFormOpen(false)}>
                  Cancel
                </ActionButton>
                <ActionButton type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Saving…' : editingEntry ? 'Update Alert' : 'Add Alert'}
                </ActionButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}

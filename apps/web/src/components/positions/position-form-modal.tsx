'use client';

import React, { useState } from 'react';
import { createPosition, updatePosition } from '@/lib/api-client';
import { Position } from '@/types/domain';
import { X } from 'lucide-react';
import { ActionButton } from '@/components/ui/shared';

interface PositionFormModalProps {
  existing: Position | null;
  defaultCommodity: string;
  onClose: (saved: boolean) => void;
}

const BLANK: Omit<Position, 'id'> = {
  commodity: 'Copper',
  instrument: '',
  direction: 'Long',
  quantity: 0,
  unit: 'MT',
  entry_price: 0,
  market_price: 0,
  currency: 'USD',
  counterparty: '',
};

export function PositionFormModal({ existing, defaultCommodity, onClose }: PositionFormModalProps) {
  const [form, setForm] = useState<Omit<Position, 'id'>>(
    existing
      ? { commodity: existing.commodity, instrument: existing.instrument, direction: existing.direction, quantity: existing.quantity, unit: existing.unit, entry_price: existing.entry_price, market_price: existing.market_price, currency: existing.currency, counterparty: existing.counterparty ?? '' }
      : { ...BLANK, commodity: defaultCommodity }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = { ...form, counterparty: form.counterparty || undefined };
      if (existing) {
        await updatePosition(existing.id, payload);
      } else {
        await createPosition(payload);
      }
      onClose(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-bold text-white">{existing ? 'Edit Position' : 'Add Position'}</h2>
          <button onClick={() => onClose(false)} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Commodity" required>
              <select value={form.commodity} onChange={e => set('commodity', e.target.value)} className={inputCls}>
                {['Copper','Aluminium','Zinc','Nickel'].map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Instrument" required>
              <input value={form.instrument} onChange={e => set('instrument', e.target.value)} placeholder="e.g. LME Future" className={inputCls} required />
            </Field>
            <Field label="Direction" required>
              <select value={form.direction} onChange={e => set('direction', e.target.value)} className={inputCls}>
                <option>Long</option>
                <option>Short</option>
              </select>
            </Field>
            <Field label="Unit" required>
              <input value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="MT" className={inputCls} required />
            </Field>
            <Field label="Quantity" required>
              <input type="number" min="0.01" step="any" value={form.quantity || ''} onChange={e => set('quantity', parseFloat(e.target.value) || 0)} className={inputCls} required />
            </Field>
            <Field label="Currency">
              <select value={form.currency} onChange={e => set('currency', e.target.value)} className={inputCls}>
                {['USD','EUR','GBP','JPY'].map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Entry Price" required>
              <input type="number" min="0.01" step="any" value={form.entry_price || ''} onChange={e => set('entry_price', parseFloat(e.target.value) || 0)} className={inputCls} required />
            </Field>
            <Field label="Market Price" required>
              <input type="number" min="0.01" step="any" value={form.market_price || ''} onChange={e => set('market_price', parseFloat(e.target.value) || 0)} className={inputCls} required />
            </Field>
          </div>
          <Field label="Counterparty">
            <input value={form.counterparty ?? ''} onChange={e => set('counterparty', e.target.value)} placeholder="Optional — leave blank for exchange-traded" className={inputCls} />
          </Field>

          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <ActionButton type="button" variant="ghost" onClick={() => onClose(false)}>Cancel</ActionButton>
            <ActionButton type="submit" variant="primary" disabled={loading}>
              {loading ? 'Saving…' : existing ? 'Update Position' : 'Create Position'}
            </ActionButton>
          </div>
        </form>
      </div>
    </div>
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

const inputCls = 'w-full text-xs text-white rounded-lg px-3 py-2 border focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-600';
// inject inline style via className won't work for CSS variables, so we set it via style on the parent

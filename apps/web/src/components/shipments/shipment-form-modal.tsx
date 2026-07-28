'use client';

import React, { useState } from 'react';
import { createShipment, updateShipment } from '@/lib/api-client';
import { Shipment } from '@/types/domain';
import { X } from 'lucide-react';
import { ActionButton } from '@/components/ui/shared';

interface ShipmentFormModalProps {
  existing: Shipment | null;
  defaultCommodity: string;
  onClose: (saved: boolean) => void;
}

type FormData = Omit<Shipment, 'id'>;

const BLANK: FormData = {
  commodity: 'Copper',
  origin: '',
  destination: '',
  quantity: 0,
  unit: 'MT',
  expected_arrival: '',
  status: 'In Transit',
  delay_days: 0,
};

const STATUSES = ['In Transit', 'Loading', 'Delayed', 'Delivered', 'Cancelled'];

export function ShipmentFormModal({ existing, defaultCommodity, onClose }: ShipmentFormModalProps) {
  const [form, setForm] = useState<FormData>(
    existing
      ? { ...existing }
      : { ...BLANK, commodity: defaultCommodity }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof FormData, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (existing) {
        await updateShipment(existing.id, form);
      } else {
        await createShipment(form);
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
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-bold text-white">{existing ? 'Edit Shipment' : 'Add Shipment'}</h2>
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
            <Field label="Unit">
              <input value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="MT" className={inputCls} />
            </Field>
            <Field label="Origin" required>
              <input value={form.origin} onChange={e => set('origin', e.target.value)} placeholder="e.g. Chile" className={inputCls} required />
            </Field>
            <Field label="Destination" required>
              <input value={form.destination} onChange={e => set('destination', e.target.value)} placeholder="e.g. Singapore" className={inputCls} required />
            </Field>
            <Field label="Quantity" required>
              <input type="number" min="0.01" step="any" value={form.quantity || ''} onChange={e => set('quantity', parseFloat(e.target.value) || 0)} className={inputCls} required />
            </Field>
            <Field label="Expected Arrival (YYYY-MM-DD)" required>
              <input type="date" value={form.expected_arrival} onChange={e => set('expected_arrival', e.target.value)} className={inputCls} required />
            </Field>
            <Field label="Status" required>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Delay (days)">
              <input type="number" min="0" step="1" value={form.delay_days} onChange={e => set('delay_days', parseInt(e.target.value) || 0)} className={inputCls} />
            </Field>
          </div>

          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <ActionButton type="button" variant="ghost" onClick={() => onClose(false)}>Cancel</ActionButton>
            <ActionButton type="submit" variant="primary" disabled={loading}>
              {loading ? 'Saving…' : existing ? 'Update Shipment' : 'Create Shipment'}
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

const inputCls = 'w-full text-xs text-white rounded-lg px-3 py-2 border focus:outline-none placeholder-gray-600';

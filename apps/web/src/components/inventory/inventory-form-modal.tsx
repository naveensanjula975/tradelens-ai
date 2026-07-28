'use client';

import React, { useState } from 'react';
import { createInventory, updateInventory } from '@/lib/api-client';
import { Inventory } from '@/types/domain';
import { X } from 'lucide-react';
import { ActionButton } from '@/components/ui/shared';

interface InventoryFormModalProps {
  existing: Inventory | null;
  defaultCommodity: string;
  onClose: (saved: boolean) => void;
}

type FormData = Omit<Inventory, 'id'>;

const BLANK: FormData = {
  commodity: 'Copper',
  location: '',
  quantity: 0,
  unit: 'MT',
  minimum_required: 0,
  available_quantity: 0,
};

export function InventoryFormModal({ existing, defaultCommodity, onClose }: InventoryFormModalProps) {
  const [form, setForm] = useState<FormData>(
    existing
      ? { commodity: existing.commodity, location: existing.location, quantity: existing.quantity, unit: existing.unit, minimum_required: existing.minimum_required, available_quantity: existing.available_quantity }
      : { ...BLANK, commodity: defaultCommodity }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof FormData, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.available_quantity > form.quantity) {
      setError('Available quantity cannot exceed total quantity.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (existing) {
        await updateInventory(existing.id, form);
      } else {
        await createInventory(form);
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
          <h2 className="font-bold text-white">{existing ? 'Edit Inventory Record' : 'Add Inventory Record'}</h2>
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
            <Field label="Unit" required>
              <input value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="MT" className={inputCls} required />
            </Field>
          </div>

          <Field label="Location / Warehouse" required>
            <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Rotterdam Vault" className={inputCls} required />
          </Field>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Total Quantity" required>
              <input type="number" min="0" step="any" value={form.quantity || ''} onChange={e => set('quantity', parseFloat(e.target.value) || 0)} className={inputCls} required />
            </Field>
            <Field label="Available" required>
              <input type="number" min="0" step="any" value={form.available_quantity || ''} onChange={e => set('available_quantity', parseFloat(e.target.value) || 0)} className={inputCls} required />
            </Field>
            <Field label="Min Required" required>
              <input type="number" min="0" step="any" value={form.minimum_required || ''} onChange={e => set('minimum_required', parseFloat(e.target.value) || 0)} className={inputCls} required />
            </Field>
          </div>

          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <ActionButton type="button" variant="ghost" onClick={() => onClose(false)}>Cancel</ActionButton>
            <ActionButton type="submit" variant="primary" disabled={loading}>
              {loading ? 'Saving…' : existing ? 'Update Record' : 'Create Record'}
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

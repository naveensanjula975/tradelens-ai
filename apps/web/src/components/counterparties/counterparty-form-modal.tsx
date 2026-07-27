'use client';

import React, { useState } from 'react';
import { createCounterparty, updateCounterparty } from '@/lib/api-client';
import { Counterparty } from '@/types/domain';
import { X } from 'lucide-react';
import { ActionButton } from '@/components/ui/shared';

interface CounterpartyFormModalProps {
  existing: Counterparty | null;
  onClose: (saved: boolean) => void;
}

type FormData = Omit<Counterparty, 'id'>;

const BLANK: FormData = { name: '', credit_limit: 0, current_exposure: 0, risk_rating: 'BBB' };

const RATINGS = ['AAA','AA+','AA','AA-','A+','A','A-','BBB+','BBB','BBB-','BB+','BB','BB-','B+','B','B-','CCC','CC','C','D'];

export function CounterpartyFormModal({ existing, onClose }: CounterpartyFormModalProps) {
  const [form, setForm] = useState<FormData>(
    existing
      ? { name: existing.name, credit_limit: existing.credit_limit, current_exposure: existing.current_exposure, risk_rating: existing.risk_rating }
      : { ...BLANK }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof FormData, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.current_exposure > form.credit_limit) {
      setError('Current exposure cannot exceed the credit limit.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (existing) {
        await updateCounterparty(existing.id, form);
      } else {
        await createCounterparty(form);
      }
      onClose(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const util = form.credit_limit > 0 ? Math.round((form.current_exposure / form.credit_limit) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-bold text-white">{existing ? 'Edit Counterparty' : 'Add Counterparty'}</h2>
          <button onClick={() => onClose(false)} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Field label="Counterparty Name" required>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Global Metals Ltd" className={inputCls} required />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Risk Rating" required>
              <select value={form.risk_rating} onChange={e => set('risk_rating', e.target.value)} className={inputCls}>
                {RATINGS.map(r => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Credit Limit (USD)" required>
              <input type="number" min="1" step="1000" value={form.credit_limit || ''} onChange={e => set('credit_limit', parseFloat(e.target.value) || 0)} className={inputCls} required />
            </Field>
          </div>

          <Field label="Current Exposure (USD)" required>
            <input type="number" min="0" step="1000" value={form.current_exposure || ''} onChange={e => set('current_exposure', parseFloat(e.target.value) || 0)} className={inputCls} required />
          </Field>

          {/* Live utilization preview */}
          {form.credit_limit > 0 && (
            <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest">Utilization Preview</span>
                <span className={`text-xs font-bold ${util >= 90 ? 'text-red-400' : util >= 80 ? 'text-amber-400' : 'text-emerald-400'}`}>{util}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <div
                  className={`h-full rounded-full transition-all duration-300 ${util >= 90 ? 'bg-red-500' : util >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(util, 100)}%` }}
                />
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <ActionButton type="button" variant="ghost" onClick={() => onClose(false)}>Cancel</ActionButton>
            <ActionButton type="submit" variant="primary" disabled={loading}>
              {loading ? 'Saving…' : existing ? 'Update' : 'Create Counterparty'}
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

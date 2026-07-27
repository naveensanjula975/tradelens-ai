'use client';

import React, { useState } from 'react';
import { useCounterparties } from '@/hooks/use-api';
import { deleteCounterparty } from '@/lib/api-client';
import { PageShell } from '@/components/layout/page-shell';
import {
  PageHeader, TableContainer, Thead, LoadingRows, EmptyRow,
  ActionButton, StatusBadge,
} from '@/components/ui/shared';
import { CounterpartyFormModal } from '@/components/counterparties/counterparty-form-modal';
import { Counterparty } from '@/types/domain';
import { Plus, Trash2, Pencil } from 'lucide-react';

function getRatingType(rating: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (rating.startsWith('A')) return 'success';
  if (rating.startsWith('B') && !rating.includes('-')) return 'info';
  if (rating.startsWith('BB')) return 'warning';
  return 'danger';
}

export default function CounterpartiesPage() {
  const { data: counterparties, loading, refresh } = useCounterparties();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Counterparty | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this counterparty?')) return;
    setDeletingId(id);
    try {
      await deleteCounterparty(id);
      refresh();
    } catch {
      alert('Failed to delete counterparty.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (cp: Counterparty) => { setEditing(cp); setFormOpen(true); };
  const handleAdd = () => { setEditing(null); setFormOpen(true); };
  const handleFormClose = (saved: boolean) => {
    setFormOpen(false);
    setEditing(null);
    if (saved) refresh();
  };

  const totalLimit = counterparties.reduce((s, cp) => s + cp.credit_limit, 0);
  const totalExposure = counterparties.reduce((s, cp) => s + cp.current_exposure, 0);
  const atRisk = counterparties.filter(cp => (cp.current_exposure / cp.credit_limit) >= 0.8).length;
  const overallUtil = totalLimit > 0 ? Math.round((totalExposure / totalLimit) * 100) : 0;

  const cols = ['Counterparty', 'Rating', 'Credit Limit', 'Current Exposure', 'Utilization', 'Available Headroom', ''];

  return (
    <PageShell>
      <PageHeader
        title="Counterparty Credit Exposures"
        subtitle="Credit limit utilization and risk-rated counterparty portfolio"
      >
        <ActionButton variant="primary" onClick={handleAdd}>
          <Plus className="w-3.5 h-3.5" /> Add Counterparty
        </ActionButton>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mx-6 mb-5">
        {[
          { label: 'Total Limit', value: `$${(totalLimit / 1_000_000).toFixed(1)}M`, color: 'text-gray-200' },
          { label: 'Total Exposure', value: `$${(totalExposure / 1_000_000).toFixed(1)}M`, color: 'text-blue-400' },
          { label: 'Avg Utilization', value: `${overallUtil}%`, color: overallUtil >= 80 ? 'text-red-400' : overallUtil >= 60 ? 'text-amber-400' : 'text-emerald-400' },
          { label: 'Near Limit (≥80%)', value: atRisk, color: atRisk > 0 ? 'text-red-400' : 'text-emerald-400' },
        ].map((s) => (
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
        ) : counterparties.length === 0 ? (
          <EmptyRow message="No counterparties found." cols={cols.length} />
        ) : (
          <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {counterparties.map((cp) => {
              const util = cp.credit_limit > 0 ? Math.round((cp.current_exposure / cp.credit_limit) * 100) : 0;
              const headroom = cp.credit_limit - cp.current_exposure;
              const utilType = util >= 90 ? 'danger' : util >= 80 ? 'warning' : 'success';

              return (
                <tr key={cp.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-4 py-3 font-bold text-white">{cp.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge label={cp.risk_rating} type={getRatingType(cp.risk_rating)} />
                  </td>
                  <td className="px-4 py-3 text-gray-300">${(cp.credit_limit / 1_000_000).toFixed(2)}M</td>
                  <td className="px-4 py-3 font-semibold text-gray-200">${(cp.current_exposure / 1_000_000).toFixed(2)}M</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                        <div
                          className={`h-full rounded-full transition-all ${utilType === 'danger' ? 'bg-red-500' : utilType === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(util, 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold ${utilType === 'danger' ? 'text-red-400' : utilType === 'warning' ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {util}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    ${(headroom / 1_000_000).toFixed(2)}M
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ActionButton size="xs" variant="ghost" onClick={() => handleEdit(cp)}>
                        <Pencil className="w-3 h-3" />
                      </ActionButton>
                      <ActionButton size="xs" variant="danger" onClick={() => handleDelete(cp.id)} disabled={deletingId === cp.id}>
                        <Trash2 className="w-3 h-3" />
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        )}
      </TableContainer>

      {formOpen && (
        <CounterpartyFormModal
          existing={editing}
          onClose={handleFormClose}
        />
      )}
    </PageShell>
  );
}

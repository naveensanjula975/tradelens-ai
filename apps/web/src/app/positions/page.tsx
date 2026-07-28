'use client';

import React, { useState } from 'react';
import { usePositions } from '@/hooks/use-api';
import { deletePosition } from '@/lib/api-client';
import { PageShell } from '@/components/layout/page-shell';
import {
  PageHeader, TableContainer, Thead, LoadingRows, EmptyRow,
  ActionButton, CommodityFilter, StatusBadge,
} from '@/components/ui/shared';
import { PositionFormModal } from '@/components/positions/position-form-modal';
import { Position } from '@/types/domain';
import { Plus, Trash2, Pencil, TrendingUp, TrendingDown, Download, Search } from 'lucide-react';
import { exportToCSV } from '@/lib/export-csv';

export default function PositionsPage() {
  const [commodity, setCommodity] = useState('Copper');
  const [search, setSearch] = useState('');
  const { data: positions, loading, refresh } = usePositions(commodity || undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = positions.filter(p => {
    const q = search.toLowerCase();
    return (
      p.instrument.toLowerCase().includes(q) ||
      p.commodity.toLowerCase().includes(q) ||
      (p.counterparty && p.counterparty.toLowerCase().includes(q))
    );
  });

  const handleExportCSV = () => {
    exportToCSV(filtered, `positions-${commodity.toLowerCase()}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this position?')) return;
    setDeletingId(id);
    try {
      await deletePosition(id);
      refresh();
    } catch (e) {
      alert('Failed to delete position.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (p: Position) => { setEditing(p); setFormOpen(true); };
  const handleAdd = () => { setEditing(null); setFormOpen(true); };
  const handleFormClose = (saved: boolean) => {
    setFormOpen(false);
    setEditing(null);
    if (saved) refresh();
  };

  // Compute totals
  const totalLong = positions.filter(p => p.direction.toLowerCase() === 'long').reduce((s, p) => s + p.quantity, 0);
  const totalShort = positions.filter(p => p.direction.toLowerCase() === 'short').reduce((s, p) => s + p.quantity, 0);
  const netExposure = positions.reduce((s, p) => {
    const mv = p.quantity * p.market_price;
    return s + (p.direction.toLowerCase() === 'long' ? mv : -mv);
  }, 0);

  const cols = ['Commodity', 'Instrument', 'Direction', 'Quantity', 'Entry Price', 'Market Price', 'Unrealized PnL', 'Counterparty', ''];

  return (
    <PageShell>
      <PageHeader
        title="Open Positions"
        subtitle="Active commodity trading positions and mark-to-market valuations"
      >
        <CommodityFilter value={commodity} onChange={setCommodity} />
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search positions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="text-xs text-white rounded-lg pl-8 pr-3 py-1.5 border focus:outline-none w-44"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          />
        </div>
        <ActionButton variant="ghost" onClick={handleExportCSV}>
          <Download className="w-3.5 h-3.5" /> CSV
        </ActionButton>
        <ActionButton variant="primary" onClick={handleAdd}>

          <Plus className="w-3.5 h-3.5" /> Add Position
        </ActionButton>
      </PageHeader>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4 mx-6 mb-5">
        {[
          { label: 'Total Long', value: `${totalLong.toLocaleString()} MT`, color: 'text-emerald-400' },
          { label: 'Total Short', value: `${totalShort.toLocaleString()} MT`, color: 'text-red-400' },
          { label: 'Net MtM Value', value: `$${(Math.abs(netExposure) / 1_000_000).toFixed(2)}M`, color: netExposure >= 0 ? 'text-emerald-400' : 'text-red-400' },
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
        ) : filtered.length === 0 ? (
          <EmptyRow message="No positions match current filter." cols={cols.length} />
        ) : (
          <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {filtered.map((p) => {
              const isLong = p.direction.toLowerCase() === 'long';
              const pnl = p.quantity * (p.market_price - p.entry_price) * (isLong ? 1 : -1);
              const pnlPct = ((p.market_price - p.entry_price) / p.entry_price) * 100 * (isLong ? 1 : -1);

              return (
                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-4 py-3 font-bold text-white">{p.commodity}</td>
                  <td className="px-4 py-3 text-gray-300">{p.instrument}</td>
                  <td className="px-4 py-3">
                    <StatusBadge label={p.direction} type={isLong ? 'success' : 'danger'} />
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-200">{p.quantity.toLocaleString()} {p.unit}</td>
                  <td className="px-4 py-3 text-gray-300">${p.entry_price.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-300">${p.market_price.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className={`flex items-center gap-1 font-bold text-xs ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {pnl >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      ${Math.abs(pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      <span className="text-[10px] font-normal opacity-70">({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{p.counterparty || 'Exchange'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ActionButton size="xs" variant="ghost" onClick={() => handleEdit(p)}>
                        <Pencil className="w-3 h-3" />
                      </ActionButton>
                      <ActionButton size="xs" variant="danger" onClick={() => handleDelete(p.id)} disabled={deletingId === p.id}>
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
        <PositionFormModal
          existing={editing}
          defaultCommodity={commodity || 'Copper'}
          onClose={handleFormClose}
        />
      )}
    </PageShell>
  );
}

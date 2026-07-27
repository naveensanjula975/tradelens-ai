'use client';

import React, { useState } from 'react';
import { useShipments } from '@/hooks/use-api';
import { deleteShipment } from '@/lib/api-client';
import { PageShell } from '@/components/layout/page-shell';
import {
  PageHeader, TableContainer, Thead, LoadingRows, EmptyRow,
  ActionButton, CommodityFilter, StatusBadge,
} from '@/components/ui/shared';
import { ShipmentFormModal } from '@/components/shipments/shipment-form-modal';
import { Shipment } from '@/types/domain';
import { Plus, Trash2, Pencil, Truck } from 'lucide-react';

function getShipmentStatusType(status: string): 'danger' | 'warning' | 'info' | 'success' | 'neutral' {
  const s = status.toLowerCase();
  if (s === 'delayed') return 'danger';
  if (s === 'in transit') return 'info';
  if (s === 'delivered') return 'success';
  if (s === 'loading') return 'warning';
  return 'neutral';
}

export default function ShipmentsPage() {
  const [commodity, setCommodity] = useState('Copper');
  const { data: shipments, loading, refresh } = useShipments(commodity || undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Shipment | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this shipment?')) return;
    setDeletingId(id);
    try {
      await deleteShipment(id);
      refresh();
    } catch {
      alert('Failed to delete shipment.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (s: Shipment) => { setEditing(s); setFormOpen(true); };
  const handleAdd = () => { setEditing(null); setFormOpen(true); };
  const handleFormClose = (saved: boolean) => {
    setFormOpen(false);
    setEditing(null);
    if (saved) refresh();
  };

  const inTransit = shipments.filter(s => s.status.toLowerCase() === 'in transit').length;
  const delayed = shipments.filter(s => s.delay_days > 0).length;
  const totalQty = shipments.reduce((s, sh) => s + sh.quantity, 0);

  const cols = ['Commodity', 'Route', 'Quantity', 'Expected Arrival', 'Status', 'Delay', ''];

  return (
    <PageShell>
      <PageHeader
        title="Logistics & Shipments"
        subtitle="Track commodity shipment routes, ETAs, and delay status"
      >
        <CommodityFilter value={commodity} onChange={setCommodity} />
        <ActionButton variant="primary" onClick={handleAdd}>
          <Plus className="w-3.5 h-3.5" /> Add Shipment
        </ActionButton>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mx-6 mb-5">
        {[
          { label: 'In Transit', value: inTransit, color: 'text-blue-400' },
          { label: 'Delayed', value: delayed, color: delayed > 0 ? 'text-red-400' : 'text-emerald-400' },
          { label: 'Total Volume', value: `${totalQty.toLocaleString()} MT`, color: 'text-gray-200' },
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
        ) : shipments.length === 0 ? (
          <EmptyRow message="No shipments found. Add a shipment or upload a CSV." cols={cols.length} />
        ) : (
          <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {shipments.map((s) => (
              <tr key={s.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-4 py-3 font-bold text-white">{s.commodity}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-gray-300">
                    <span className="font-semibold">{s.origin}</span>
                    <Truck className="w-3 h-3 text-gray-600 shrink-0" />
                    <span className="font-semibold">{s.destination}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-semibold text-gray-200">{s.quantity.toLocaleString()} {s.unit}</td>
                <td className="px-4 py-3 text-gray-400">{s.expected_arrival}</td>
                <td className="px-4 py-3">
                  <StatusBadge label={s.status} type={getShipmentStatusType(s.status)} />
                </td>
                <td className="px-4 py-3">
                  {s.delay_days > 0 ? (
                    <span className="text-xs font-bold text-red-400">+{s.delay_days}d</span>
                  ) : (
                    <span className="text-xs text-emerald-400 font-semibold">On time</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ActionButton size="xs" variant="ghost" onClick={() => handleEdit(s)}>
                      <Pencil className="w-3 h-3" />
                    </ActionButton>
                    <ActionButton size="xs" variant="danger" onClick={() => handleDelete(s.id)} disabled={deletingId === s.id}>
                      <Trash2 className="w-3 h-3" />
                    </ActionButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        )}
      </TableContainer>

      {formOpen && (
        <ShipmentFormModal
          existing={editing}
          defaultCommodity={commodity || 'Copper'}
          onClose={handleFormClose}
        />
      )}
    </PageShell>
  );
}

'use client';

import React, { useState } from 'react';
import { useInventory } from '@/hooks/use-api';
import { deleteInventory } from '@/lib/api-client';
import { PageShell } from '@/components/layout/page-shell';
import {
  PageHeader, TableContainer, Thead, LoadingRows, EmptyRow,
  ActionButton, CommodityFilter, StatusBadge,
} from '@/components/ui/shared';
import { InventoryFormModal } from '@/components/inventory/inventory-form-modal';
import { Inventory } from '@/types/domain';
import { Plus, Trash2, Pencil, Package } from 'lucide-react';

export default function InventoryPage() {
  const [commodity, setCommodity] = useState('Copper');
  const { data: inventory, loading, refresh } = useInventory(commodity || undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Inventory | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this inventory record?')) return;
    setDeletingId(id);
    try {
      await deleteInventory(id);
      refresh();
    } catch {
      alert('Failed to delete inventory record.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (inv: Inventory) => { setEditing(inv); setFormOpen(true); };
  const handleAdd = () => { setEditing(null); setFormOpen(true); };
  const handleFormClose = (saved: boolean) => {
    setFormOpen(false);
    setEditing(null);
    if (saved) refresh();
  };

  // Compute stats
  const totalAvailable = inventory.reduce((s, i) => s + i.available_quantity, 0);
  const totalRequired = inventory.reduce((s, i) => s + i.minimum_required, 0);
  const below = inventory.filter(i => i.available_quantity < i.minimum_required).length;

  const cols = ['Commodity', 'Location', 'Total Quantity', 'Available', 'Min Required', 'Coverage', 'Status', ''];

  return (
    <PageShell>
      <PageHeader
        title="Physical Inventory"
        subtitle="Warehouse and vault inventory levels vs minimum required thresholds"
      >
        <CommodityFilter value={commodity} onChange={setCommodity} />
        <ActionButton variant="primary" onClick={handleAdd}>
          <Plus className="w-3.5 h-3.5" /> Add Record
        </ActionButton>
      </PageHeader>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4 mx-6 mb-5">
        {[
          { label: 'Total Available', value: `${totalAvailable.toLocaleString()} MT`, color: 'text-blue-400' },
          { label: 'Min Required', value: `${totalRequired.toLocaleString()} MT`, color: 'text-gray-300' },
          { label: 'Below Threshold', value: `${below} location${below !== 1 ? 's' : ''}`, color: below > 0 ? 'text-red-400' : 'text-emerald-400' },
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
        ) : inventory.length === 0 ? (
          <EmptyRow message="No inventory records found. Add a record or upload a CSV." cols={cols.length} />
        ) : (
          <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {inventory.map((inv) => {
              const coverage = inv.minimum_required > 0
                ? Math.round((inv.available_quantity / inv.minimum_required) * 100)
                : 100;
              const statusType = coverage < 70 ? 'danger' : coverage < 100 ? 'warning' : 'success';
              const statusLabel = coverage < 70 ? 'Critical' : coverage < 100 ? 'Below Min' : 'OK';

              return (
                <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-4 py-3 font-bold text-white">{inv.commodity}</td>
                  <td className="px-4 py-3 text-gray-300">{inv.location}</td>
                  <td className="px-4 py-3 font-semibold text-gray-200">{inv.quantity.toLocaleString()} {inv.unit}</td>
                  <td className="px-4 py-3 font-semibold text-gray-200">{inv.available_quantity.toLocaleString()} {inv.unit}</td>
                  <td className="px-4 py-3 text-gray-400">{inv.minimum_required.toLocaleString()} {inv.unit}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                        <div
                          className={`h-full rounded-full transition-all ${statusType === 'danger' ? 'bg-red-500' : statusType === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(coverage, 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold ${statusType === 'danger' ? 'text-red-400' : statusType === 'warning' ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {coverage}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge label={statusLabel} type={statusType} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ActionButton size="xs" variant="ghost" onClick={() => handleEdit(inv)}>
                        <Pencil className="w-3 h-3" />
                      </ActionButton>
                      <ActionButton size="xs" variant="danger" onClick={() => handleDelete(inv.id)} disabled={deletingId === inv.id}>
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
        <InventoryFormModal
          existing={editing}
          defaultCommodity={commodity || 'Copper'}
          onClose={handleFormClose}
        />
      )}
    </PageShell>
  );
}

import React from 'react';
import { Inventory } from '@/types/domain';
import { Package, TrendingDown, CheckCircle } from 'lucide-react';

interface InventoryStatusBarProps {
  inventory: Inventory[];
}

export function InventoryStatusBar({ inventory }: InventoryStatusBarProps) {
  if (!inventory || inventory.length === 0) return null;

  return (
    <div className="p-5 rounded-2xl border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-4 h-4 text-purple-400" />
        <h4 className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Physical Inventory Status</h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {inventory.map((inv) => {
          const pct = inv.minimum_required > 0
            ? Math.min(100, Math.round((inv.available_quantity / inv.minimum_required) * 100))
            : 100;
          const isCritical = pct < 70;
          const isWarning = pct >= 70 && pct < 100;
          const isOk = pct >= 100;

          const barColor = isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500';
          const textColor = isCritical ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-emerald-400';
          const Icon = isCritical ? TrendingDown : isWarning ? TrendingDown : CheckCircle;

          return (
            <div key={inv.id} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs font-bold text-white leading-tight">{inv.location}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{inv.commodity}</p>
                </div>
                <Icon className={`w-3.5 h-3.5 shrink-0 ${textColor}`} />
              </div>

              {/* Progress bar */}
              <div className="w-full rounded-full h-1.5 mb-2" style={{ background: 'var(--border)' }}>
                <div
                  className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">
                  {inv.available_quantity} / {inv.minimum_required} {inv.unit}
                </span>
                <span className={`text-[10px] font-bold ${textColor}`}>{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React from 'react';
import { Alert } from '@/types/domain';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';

interface AlertListProps {
  alerts: Alert[];
}

export function AlertList({ alerts }: AlertListProps) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-card border border-border text-center text-xs text-gray-400">
        No active risk alerts for this commodity.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`p-4 rounded-xl border flex items-start gap-3 ${
            alert.severity === 'high'
              ? 'bg-red-500/10 border-red-500/30 text-red-200'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
          }`}
        >
          {alert.severity === 'high' ? (
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h5 className="font-bold text-sm text-white">{alert.title}</h5>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-gray-900/80 text-gray-300">
                {alert.category}
              </span>
            </div>
            <p className="text-xs text-gray-300 mb-2">{alert.description}</p>
            {alert.recommended_action && (
              <div className="text-[11px] font-semibold text-gray-400 border-t border-gray-800/80 pt-1.5 flex items-center gap-1">
                <span>Action:</span>
                <span className="text-white">{alert.recommended_action}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

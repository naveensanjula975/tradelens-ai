import React from 'react';
import { DecisionSnapshot } from '@/types/domain';
import { ShieldX, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface DecisionCardProps {
  decision: DecisionSnapshot;
}

export function DecisionCard({ decision }: DecisionCardProps) {
  const getPermissionStyle = (permission: string) => {
    switch (permission) {
      case 'Blocked':
        return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: ShieldX };
      case 'Review Required':
        return { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: AlertTriangle };
      case 'Limited':
        return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', icon: Info };
      default:
        return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: CheckCircle2 };
    }
  };

  const style = getPermissionStyle(decision.permission);
  const Icon = style.icon;

  return (
    <div className={`p-6 rounded-2xl border ${style.bg} ${style.border} backdrop-blur-md flex flex-col justify-between`}>
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs uppercase font-bold tracking-wider text-gray-400">Trade Execution Status</span>
          <span className="text-xs text-gray-400">Confidence: <strong className="text-white">{decision.confidence_score}%</strong></span>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className={`p-3 rounded-xl bg-gray-900/80 border ${style.border}`}>
            <Icon className={`w-8 h-8 ${style.text}`} />
          </div>
          <div>
            <h2 className={`text-2xl font-extrabold uppercase tracking-tight ${style.text}`}>
              {decision.permission}
            </h2>
            <p className="text-sm font-semibold text-gray-300">
              State: <span className="text-white">{decision.market_state}</span>
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 border-t border-gray-800 pt-3">
        {decision.summary}
      </p>
    </div>
  );
}

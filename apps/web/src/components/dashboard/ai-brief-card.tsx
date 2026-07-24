import React from 'react';
import { AIBrief } from '@/types/domain';
import { Sparkles, CheckCircle, AlertCircle } from 'lucide-react';

interface AIBriefCardProps {
  brief: AIBrief;
}

export function AIBriefCard({ brief }: AIBriefCardProps) {
  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-900 via-gray-900 to-blue-950/40 border border-blue-500/20 shadow-xl relative overflow-hidden">
      <div className="flex items-center gap-2 mb-3 text-blue-400">
        <Sparkles className="w-5 h-5" />
        <h3 className="font-bold text-sm uppercase tracking-wider">AI Operational Summary Brief</h3>
      </div>

      <h4 className="text-lg font-bold text-white mb-2">{brief.headline}</h4>
      <p className="text-sm text-gray-300 mb-6 leading-relaxed">{brief.summary}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-800">
        <div>
          <div className="flex items-center gap-2 mb-3 text-amber-400 font-semibold text-xs uppercase tracking-wider">
            <AlertCircle className="w-4 h-4" />
            Key Factors & Evidence
          </div>
          <ul className="space-y-2">
            {brief.why.map((reason, idx) => (
              <li key={idx} className="text-xs text-gray-300 flex items-start gap-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
            <CheckCircle className="w-4 h-4" />
            Recommended Desk Actions
          </div>
          <ul className="space-y-2">
            {brief.next_actions.map((action, idx) => (
              <li key={idx} className="text-xs text-gray-300 flex items-start gap-2">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

import React from 'react';

interface MetricScoreCardProps {
  title: string;
  score: number;
  maxScore?: number;
  type: 'risk' | 'evidence';
}

export function MetricScoreCard({ title, score, maxScore = 100, type }: MetricScoreCardProps) {
  const isRisk = type === 'risk';
  
  const getScoreColor = () => {
    if (isRisk) {
      if (score >= 75) return 'text-red-400 border-red-500/40 bg-red-500/10';
      if (score >= 50) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
      return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    } else {
      if (score >= 75) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
      if (score >= 50) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
      return 'text-red-400 border-red-500/40 bg-red-500/10';
    }
  };

  const styleClass = getScoreColor();

  return (
    <div className="p-6 rounded-2xl bg-card border border-border flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase font-bold tracking-wider text-gray-400">{title}</span>
        <span className="text-xs text-gray-500">Scale: 0-{maxScore}</span>
      </div>

      <div className="my-4 flex items-baseline gap-2">
        <span className={`text-4xl font-black ${styleClass.split(' ')[0]}`}>{score}</span>
        <span className="text-gray-500 text-sm font-semibold">/ {maxScore}</span>
      </div>

      <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${isRisk ? (score >= 75 ? 'bg-red-500' : 'bg-amber-500') : 'bg-blue-500'}`}
          style={{ width: `${(score / maxScore) * 100}%` }}
        />
      </div>
    </div>
  );
}

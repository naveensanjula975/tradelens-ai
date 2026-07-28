'use client';

import React from 'react';
import { RefreshCw, ChevronDown, Bell } from 'lucide-react';

interface TopNavProps {
  selectedCommodity: string;
  onCommodityChange: (commodity: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  alertCount?: number;
}

const COMMODITIES = [
  { value: 'Copper', label: 'Copper (LME / Physical)' },
  { value: 'Aluminium', label: 'Aluminium (LME / Physical)' },
  { value: 'Zinc', label: 'Zinc (LME)' },
  { value: 'Nickel', label: 'Nickel (LME)' },
];

export function TopNav({ selectedCommodity, onCommodityChange, onRefresh, isRefreshing = false, alertCount = 0 }: TopNavProps) {
  const now = new Date().toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  return (
    <header className="h-14 border-b sticky top-0 z-20 px-6 flex items-center justify-between backdrop-blur-md"
      style={{ background: 'rgba(13,17,23,0.85)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-4">
        {/* Commodity Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold hidden sm:block">Commodity:</span>
          <div className="relative">
            <select
              value={selectedCommodity}
              onChange={(e) => onCommodityChange(e.target.value)}
              className="text-sm font-bold text-white rounded-lg px-4 py-1.5 pr-8 cursor-pointer appearance-none border focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              {COMMODITIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-2 pointer-events-none" />
          </div>
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-gray-500 hidden md:block border-l pl-4" style={{ borderColor: 'var(--border)' }}>
          {now}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Alert badge */}
        {alertCount > 0 && (
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <Bell className="w-3.5 h-3.5 text-red-400" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold flex items-center justify-center text-white">
              {alertCount}
            </span>
          </div>
        )}

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all active:scale-95 disabled:opacity-50"
          style={{ background: 'var(--card)', borderColor: 'var(--border)', color: '#d1d5db' }}
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:block">Refresh</span>
        </button>
      </div>
    </header>
  );
}

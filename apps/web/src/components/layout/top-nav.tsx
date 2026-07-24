import React from 'react';
import { RefreshCw, Filter } from 'lucide-react';

interface TopNavProps {
  selectedCommodity: string;
  onCommodityChange: (commodity: string) => void;
  onRefresh: () => void;
}

export function TopNav({ selectedCommodity, onCommodityChange, onRefresh }: TopNavProps) {
  return (
    <header className="h-16 border-b border-border bg-sidebar/50 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Active Commodity:</span>
        <div className="relative">
          <select
            value={selectedCommodity}
            onChange={(e) => onCommodityChange(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white text-sm font-semibold rounded-lg px-4 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none pr-8"
          >
            <option value="Copper">Copper (LME / Physical)</option>
            <option value="Aluminium">Aluminium (LME / Physical)</option>
          </select>
          <Filter className="w-4 h-4 text-gray-400 absolute right-2.5 top-2.5 pointer-events-none" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-700 transition-all active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
          Refresh Pipeline
        </button>
      </div>
    </header>
  );
}

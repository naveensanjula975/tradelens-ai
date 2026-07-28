'use client';

import React, { useState } from 'react';
import { Counterparty } from '@/types/domain';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Cell, PieChart, Pie, Legend,
} from 'recharts';

interface ExposureChartProps {
  counterparties: Counterparty[];
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="text-xs rounded-lg p-3 border shadow-xl" style={{ background: '#0d1117', borderColor: '#1e2d45' }}>
      <p className="text-gray-400 mb-2 font-semibold">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.fill || p.color }} />
          <span className="text-gray-400">{p.name}:</span>
          <span className="font-bold text-white">${p.value?.toFixed(1)}M</span>
        </div>
      ))}
    </div>
  );
};

export function ExposureChart({ counterparties }: ExposureChartProps) {
  const [view, setView] = useState<'bar' | 'pie'>('bar');

  if (!counterparties || counterparties.length === 0) {
    return (
      <div className="p-6 rounded-2xl border flex items-center justify-center h-48"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <p className="text-sm text-gray-500">No counterparty data available.</p>
      </div>
    );
  }

  const barData = counterparties.map(cp => ({
    name: cp.name.split(' ').slice(0, 2).join(' '),
    'Limit': cp.credit_limit / 1_000_000,
    'Exposure': cp.current_exposure / 1_000_000,
  }));

  const pieData = counterparties.map(cp => ({
    name: cp.name.split(' ').slice(0, 2).join(' '),
    value: cp.current_exposure / 1_000_000,
  }));

  return (
    <div className="p-5 rounded-2xl border flex flex-col" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[10px] uppercase font-bold tracking-widest text-gray-500">
          {view === 'bar' ? 'Credit Limit vs Exposure ($M)' : 'Exposure Distribution ($M)'}
        </h4>
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--background)' }}>
          {(['bar', 'pie'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all capitalize ${
                view === v ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-white'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {view === 'bar' ? (
            <BarChart data={barData} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
              <XAxis dataKey="name" stroke="#4b5563" tick={{ fontSize: 10 }} />
              <YAxis stroke="#4b5563" tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Limit" fill="#3b82f6" fillOpacity={0.25} radius={[4, 4, 0, 0]} name="Credit Limit" />
              <Bar dataKey="Exposure" fill="#ef4444" radius={[4, 4, 0, 0]} name="Current Exposure" />
            </BarChart>
          ) : (
            <PieChart>
              <Pie
                data={pieData} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={80} innerRadius={40}
                paddingAngle={3}
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.85} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '10px', color: '#9ca3af' }} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

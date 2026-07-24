'use client';

import React from 'react';
import { Counterparty, Position } from '@/types/domain';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface ExposureChartProps {
  counterparties: Counterparty[];
}

export function ExposureChart({ counterparties }: ExposureChartProps) {
  const data = counterparties.map((cp) => ({
    name: cp.name,
    exposure: cp.current_exposure / 1000000,
    limit: cp.credit_limit / 1000000,
  }));

  return (
    <div className="p-6 rounded-2xl bg-card border border-border">
      <h4 className="text-xs uppercase font-bold tracking-wider text-gray-400 mb-4">
        Counterparty Credit Limit vs Current Exposure ($M)
      </h4>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 11 }} />
            <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', fontSize: '12px' }}
            />
            <Bar dataKey="limit" fill="#3b82f6" opacity={0.3} radius={[4, 4, 0, 0]} name="Credit Limit ($M)" />
            <Bar dataKey="exposure" fill="#ef4444" radius={[4, 4, 0, 0]} name="Current Exposure ($M)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

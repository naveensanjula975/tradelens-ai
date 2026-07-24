'use client';

import React, { useEffect, useState } from 'react';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { fetchDashboard } from '@/lib/api-client';
import { Position } from '@/types/domain';

export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([]);

  useEffect(() => {
    fetchDashboard('Copper').then((d) => setPositions(d.positions));
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar />
      <div className="flex-1 p-8">
        <h2 className="text-2xl font-bold mb-6">Commodity Open Positions</h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-900/80 text-gray-400 font-semibold border-b border-border">
              <tr>
                <th className="p-4">Commodity</th>
                <th className="p-4">Instrument</th>
                <th className="p-4">Direction</th>
                <th className="p-4">Quantity</th>
                <th className="p-4">Entry Price</th>
                <th className="p-4">Market Price</th>
                <th className="p-4">Counterparty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {positions.map((p) => (
                <tr key={p.id} className="hover:bg-gray-800/40">
                  <td className="p-4 font-bold text-white">{p.commodity}</td>
                  <td className="p-4">{p.instrument}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded font-bold ${p.direction.toLowerCase() === 'long' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {p.direction}
                    </span>
                  </td>
                  <td className="p-4 font-medium">{p.quantity} {p.unit}</td>
                  <td className="p-4">${p.entry_price}</td>
                  <td className="p-4">${p.market_price}</td>
                  <td className="p-4 text-gray-400">{p.counterparty || 'Exchange'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

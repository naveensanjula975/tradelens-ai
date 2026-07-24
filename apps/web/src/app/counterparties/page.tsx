'use client';

import React, { useEffect, useState } from 'react';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { fetchDashboard } from '@/lib/api-client';
import { Counterparty } from '@/types/domain';

export default function CounterpartiesPage() {
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);

  useEffect(() => {
    fetchDashboard('Copper').then((d) => setCounterparties(d.counterparties));
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar />
      <div className="flex-1 p-8">
        <h2 className="text-2xl font-bold mb-6">Counterparty Credit Exposures</h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-900/80 text-gray-400 font-semibold border-b border-border">
              <tr>
                <th className="p-4">Counterparty Name</th>
                <th className="p-4">Rating</th>
                <th className="p-4">Credit Limit</th>
                <th className="p-4">Current Exposure</th>
                <th className="p-4">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {counterparties.map((cp) => {
                const util = Math.round((cp.current_exposure / cp.credit_limit) * 100);
                return (
                  <tr key={cp.id} className="hover:bg-gray-800/40">
                    <td className="p-4 font-bold text-white">{cp.name}</td>
                    <td className="p-4"><span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold">{cp.risk_rating}</span></td>
                    <td className="p-4">${(cp.credit_limit / 1000000).toFixed(2)}M</td>
                    <td className="p-4 font-medium">${(cp.current_exposure / 1000000).toFixed(2)}M</td>
                    <td className="p-4">
                      <span className={`font-bold ${util >= 85 ? 'text-red-400' : 'text-emerald-400'}`}>{util}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

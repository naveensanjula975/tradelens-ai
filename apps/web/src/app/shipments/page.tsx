'use client';

import React, { useEffect, useState } from 'react';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { fetchDashboard } from '@/lib/api-client';
import { Shipment } from '@/types/domain';

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);

  useEffect(() => {
    fetchDashboard('Copper').then((d) => setShipments(d.shipments));
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar />
      <div className="flex-1 p-8">
        <h2 className="text-2xl font-bold mb-6">Logistics & Shipments</h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-900/80 text-gray-400 font-semibold border-b border-border">
              <tr>
                <th className="p-4">Commodity</th>
                <th className="p-4">Route</th>
                <th className="p-4">Quantity</th>
                <th className="p-4">Expected Arrival</th>
                <th className="p-4">Status</th>
                <th className="p-4">Delay (Days)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {shipments.map((s) => (
                <tr key={s.id} className="hover:bg-gray-800/40">
                  <td className="p-4 font-bold text-white">{s.commodity}</td>
                  <td className="p-4">{s.origin} → {s.destination}</td>
                  <td className="p-4 font-medium">{s.quantity} {s.unit}</td>
                  <td className="p-4">{s.expected_arrival}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded font-bold ${s.status === 'Delayed' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="p-4 font-semibold text-amber-400">{s.delay_days} days</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

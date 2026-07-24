'use client';

import React, { useEffect, useState } from 'react';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { fetchDashboard } from '@/lib/api-client';
import { AlertList } from '@/components/dashboard/alert-list';
import { Alert } from '@/types/domain';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    fetchDashboard('Copper').then((d) => setAlerts(d.alerts));
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar />
      <div className="flex-1 p-8 max-w-4xl">
        <h2 className="text-2xl font-bold mb-6">Active Risk Alerts</h2>
        <AlertList alerts={alerts} />
      </div>
    </div>
  );
}

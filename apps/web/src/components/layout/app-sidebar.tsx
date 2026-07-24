import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, Layers, Truck, Users, Bell, Settings, ShieldAlert, Cpu } from 'lucide-react';

export function AppSidebar() {
  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Positions', href: '/positions', icon: Layers },
    { label: 'Shipments', href: '/shipments', icon: Truck },
    { label: 'Counterparties', href: '/counterparties', icon: Users },
    { label: 'Alerts', href: '/alerts', icon: Bell },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-sidebar border-r border-border min-h-screen flex flex-col justify-between p-4">
      <div>
        <div className="flex items-center gap-3 px-2 py-3 mb-6">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-500/20">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white leading-tight">TradeLens AI</h1>
            <p className="text-xs text-gray-400">Risk & Decision Engine</p>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
              >
                <Icon className="w-4 h-4 text-gray-400" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-3 bg-gray-900/50 border border-gray-800 rounded-xl">
        <div className="flex items-center gap-2 text-xs text-amber-400 font-medium mb-1">
          <ShieldAlert className="w-4 h-4" />
          <span>Decision Support Active</span>
        </div>
        <p className="text-[11px] text-gray-400 leading-normal">
          Deterministic risk evaluation active. Operational trade execution disabled.
        </p>
      </div>
    </aside>
  );
}

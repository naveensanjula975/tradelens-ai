'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Layers, Truck, Users, Bell, Settings, ShieldAlert, Cpu, Package } from 'lucide-react';

export function AppSidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Positions', href: '/positions', icon: Layers },
    { label: 'Inventory', href: '/inventory', icon: Package },
    { label: 'Shipments', href: '/shipments', icon: Truck },
    { label: 'Counterparties', href: '/counterparties', icon: Users },
    { label: 'Alerts', href: '/alerts', icon: Bell },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 min-h-screen flex flex-col justify-between p-4 sticky top-0 h-screen overflow-y-auto"
      style={{ background: 'var(--sidebar)', borderRight: '1px solid var(--border)' }}>
      <div>
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 py-4 mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500 rounded-xl blur-sm opacity-50" />
            <div className="relative bg-gradient-to-br from-blue-500 to-blue-700 p-2.5 rounded-xl text-white shadow-lg">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h1 className="font-extrabold text-base text-white leading-tight tracking-tight">TradeLens AI</h1>
            <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-widest">Risk & Decision Engine</p>
          </div>
        </div>

        {/* Nav label */}
        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold px-3 mb-2">Navigation</p>

        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 group relative ${
                  isActive
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <span className="absolute inset-0 rounded-lg bg-blue-600/20 border border-blue-500/30" />
                )}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-400 rounded-r-full" />
                )}
                <Icon className={`w-4 h-4 relative z-10 transition-colors ${isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Status indicator */}
      <div>
        <div className="p-3 rounded-xl border" style={{ background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.15)' }}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Decision Support Active</span>
          </div>
          <p className="text-[10px] text-gray-500 leading-relaxed">
            Deterministic risk evaluation enabled. No automated trade execution.
          </p>
        </div>
        <p className="text-[10px] text-gray-600 text-center mt-3">TradeLens AI v0.1.0</p>
      </div>
    </aside>
  );
}

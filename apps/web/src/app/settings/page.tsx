'use client';

import React from 'react';
import { AppSidebar } from '@/components/layout/app-sidebar';

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar />
      <div className="flex-1 p-8 max-w-2xl">
        <h2 className="text-2xl font-bold mb-6">Engine & API Configuration</h2>
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
          <div>
            <label className="text-xs uppercase font-bold text-gray-400 block mb-1">FastAPI Backend Endpoint</label>
            <input
              type="text"
              readOnly
              value="http://localhost:8000"
              className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-xs text-gray-300"
            />
          </div>
          <div>
            <label className="text-xs uppercase font-bold text-gray-400 block mb-1">LLM Summary Engine</label>
            <input
              type="text"
              readOnly
              value="OpenAI gpt-4o (with deterministic fallback)"
              className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-xs text-gray-300"
            />
          </div>
          <div>
            <label className="text-xs uppercase font-bold text-gray-400 block mb-1">Execution Mode</label>
            <input
              type="text"
              readOnly
              value="Decision Support Only (No Automated Trade Execution)"
              className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-xs text-gray-300"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

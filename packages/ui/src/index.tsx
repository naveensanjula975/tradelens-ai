/**
 * @tradelens/ui
 *
 * Shared React component primitives for TradeLens AI.
 * These are headless, style-agnostic building blocks.
 */

import React from 'react';

// ── Spinner ────────────────────────────────────────────────────────────────────

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims: Record<string, string> = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={`relative ${dims[size]}`}>
      <div className={`absolute inset-0 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin`} />
    </div>
  );
}

// ── Badge ──────────────────────────────────────────────────────────────────────

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const BADGE_STYLES: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  danger: 'bg-red-500/10 text-red-400 border-red-500/20',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  neutral: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

export function Badge({ label, variant = 'neutral' }: { label: string; variant?: BadgeVariant }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${BADGE_STYLES[variant]}`}>
      {label}
    </span>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────────

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border ${className}`}
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      {children}
    </div>
  );
}

// ── SectionLabel ───────────────────────────────────────────────────────────────

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500">{children}</span>
  );
}

// ── ProgressBar ───────────────────────────────────────────────────────────────

interface ProgressBarProps {
  value: number; // 0–100
  variant?: BadgeVariant;
  className?: string;
}

const PROGRESS_COLORS: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  neutral: 'bg-gray-500',
};

export function ProgressBar({ value, variant = 'info', className = '' }: ProgressBarProps) {
  return (
    <div className={`w-full h-1.5 rounded-full overflow-hidden ${className}`} style={{ background: 'var(--border)' }}>
      <div
        className={`h-full rounded-full transition-all duration-700 ${PROGRESS_COLORS[variant]}`}
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}

// ── Button ─────────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'ghost';
  size?: 'sm' | 'xs';
}

const BUTTON_VARIANTS = {
  primary: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20',
  danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25',
  ghost: 'hover:bg-white/5 text-gray-400 hover:text-white border border-transparent hover:border-white/10',
};

const BUTTON_SIZES = { sm: 'px-3 py-1.5 text-xs', xs: 'px-2 py-1 text-[10px]' };

export function Button({ variant = 'ghost', size = 'sm', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 font-semibold rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// ── StatCard ───────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  color?: string;
}

export function StatCard({ label, value, color = 'text-gray-200' }: StatCardProps) {
  return (
    <div className="p-4 rounded-xl border text-center" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-black ${color}`}>{value}</p>
    </div>
  );
}

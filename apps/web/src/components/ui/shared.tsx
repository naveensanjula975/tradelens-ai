import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 pt-6 pb-4">
      <div>
        <h1 className="text-xl font-extrabold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}

interface TableContainerProps {
  children: React.ReactNode;
}

export function TableContainer({ children }: TableContainerProps) {
  return (
    <div className="mx-6 rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">{children}</table>
      </div>
    </div>
  );
}

interface TheadProps {
  columns: string[];
}

export function Thead({ columns }: TheadProps) {
  return (
    <thead>
      <tr className="border-b" style={{ background: 'rgba(0,0,0,0.4)', borderColor: 'var(--border)' }}>
        {columns.map((col) => (
          <th key={col} className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-gray-500 whitespace-nowrap">
            {col}
          </th>
        ))}
      </tr>
    </thead>
  );
}

interface LoadingRowsProps {
  cols: number;
  rows?: number;
}

export function LoadingRows({ cols, rows = 5 }: LoadingRowsProps) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b" style={{ borderColor: 'var(--border)' }}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-3 rounded-full animate-pulse" style={{ background: 'var(--border)', width: `${60 + Math.random() * 40}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

interface EmptyRowProps {
  message: string;
  cols: number;
}

export function EmptyRow({ message, cols }: EmptyRowProps) {
  return (
    <tbody>
      <tr>
        <td colSpan={cols} className="px-4 py-12 text-center text-sm text-gray-500">
          {message}
        </td>
      </tr>
    </tbody>
  );
}

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'ghost';
  size?: 'sm' | 'xs';
}

export function ActionButton({ variant = 'ghost', size = 'sm', className = '', ...props }: ActionButtonProps) {
  const base = 'inline-flex items-center gap-1.5 font-semibold rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none';
  const sizes = { sm: 'px-3 py-1.5 text-xs', xs: 'px-2 py-1 text-[10px]' };
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20',
    danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25',
    ghost: 'hover:bg-white/5 text-gray-400 hover:text-white border border-transparent hover:border-white/10',
  };
  return <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />;
}

interface CommodityFilterProps {
  value: string;
  onChange: (v: string) => void;
  commodities?: string[];
}

const DEFAULT_COMMODITIES = ['Copper', 'Aluminium', 'Zinc', 'Nickel'];

export function CommodityFilter({ value, onChange, commodities = DEFAULT_COMMODITIES }: CommodityFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Commodity:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs font-semibold text-white rounded-lg px-3 py-1.5 border focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <option value="">All</option>
        {commodities.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  );
}

interface StatusBadgeProps {
  label: string;
  type: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

export function StatusBadge({ label, type }: StatusBadgeProps) {
  const styles = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-red-500/10 text-red-400 border-red-500/20',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    neutral: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${styles[type]}`}>
      {label}
    </span>
  );
}

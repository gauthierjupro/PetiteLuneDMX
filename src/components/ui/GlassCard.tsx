import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface GlassCardProps {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  extra?: React.ReactNode;
}

export const GlassCard = ({ title, icon: Icon, children, className = "", extra }: GlassCardProps) => (
  <div className={`bg-[var(--pl-panel)] backdrop-blur-xl border border-[var(--pl-border)] rounded-3xl p-6 shadow-2xl ${className}`}>
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="text-cyan-400 w-5 h-5" />}
        <h2 className="text-sm font-bold text-[var(--pl-muted)] uppercase tracking-widest">{title}</h2>
      </div>
      {extra && <div className="flex items-center gap-2">{extra}</div>}
    </div>
    {children}
  </div>
);

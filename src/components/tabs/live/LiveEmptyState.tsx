import React from 'react';
import { ArrowRight } from 'lucide-react';

export function LiveEmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-8 text-center min-h-[180px]">
      <p className="text-sm font-black uppercase tracking-widest text-slate-300">{title}</p>
      <p className="text-[11px] text-slate-500 max-w-sm leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-1 flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-cyan-400 hover:bg-cyan-500/20 transition-colors"
        >
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

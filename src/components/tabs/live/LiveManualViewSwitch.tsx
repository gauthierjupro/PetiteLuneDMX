import React from 'react';
import { ListOrdered, SlidersHorizontal } from 'lucide-react';

export type LiveManualView = 'consoles' | 'cues';

export function LiveManualViewSwitch({
  view,
  onChange,
  cueCount,
}: {
  view: LiveManualView;
  onChange: (v: LiveManualView) => void;
  cueCount: number;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange('consoles')}
        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
          view === 'consoles'
            ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
            : 'bg-slate-800/50 border border-white/5 text-slate-500 hover:text-slate-300'
        }`}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Ambiances &amp; lyres
      </button>
      <button
        type="button"
        onClick={() => onChange('cues')}
        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
          view === 'cues'
            ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
            : 'bg-slate-800/50 border border-white/5 text-slate-500 hover:text-slate-300'
        }`}
      >
        <ListOrdered className="h-3.5 w-3.5" />
        Enchaînements
        {cueCount > 0 && (
          <span className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[9px]">{cueCount}</span>
        )}
      </button>
    </div>
  );
}

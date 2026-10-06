import React from 'react';
import { Zap } from 'lucide-react';
import { WOOKIE_200R_PRESET_COUNT } from '../../../utils/cameoWookie200R';

export function WookieLaserPresetGrid({
  activePreset,
  onSelectPreset,
  compact = false,
}: {
  activePreset?: number | null;
  onSelectPreset: (preset1Based: number) => void;
  compact?: boolean;
}) {
  const presets = Array.from({ length: WOOKIE_200R_PRESET_COUNT }, (_, i) => i + 1);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 border-l-2 border-rose-500 pl-2">
        <Zap className="w-3 h-3 text-rose-400" />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
          Motifs laser (32)
        </p>
      </div>
      <p className="text-[9px] text-slate-600 leading-snug">
        Mode DMX auto (CH1). WOOKIE 200 R — 9 canaux.
      </p>
      <div
        className={`grid gap-1 ${compact ? 'grid-cols-8 max-w-[280px]' : 'grid-cols-8 max-w-[320px]'}`}
      >
        {presets.map((n) => {
          const active = activePreset === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onSelectPreset(n)}
              className={`aspect-square min-w-0 rounded-md border text-[9px] font-black transition-all active:scale-95 ${
                active
                  ? 'border-rose-400 bg-rose-500/25 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.35)]'
                  : 'border-white/10 bg-slate-900/80 text-slate-400 hover:border-rose-500/40 hover:text-rose-300'
              }`}
              title={`Preset motif ${n}`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

import React from 'react';
import { Sparkles } from 'lucide-react';

export function LiveAutoActiveBanner({ onOpenAutoLive }: { onOpenAutoLive: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-2">
      <p className="text-[10px] text-fuchsia-200/90 leading-snug max-w-xl">
        <span className="font-black uppercase tracking-wider text-fuchsia-300">Auto Live actif</span>
        {' — '}
        le pilote ajuste master et effets en arrière-plan. Gardez cet onglet pour vos overrides
        manuels (ambiances, lyres, cues).
      </p>
      <button
        type="button"
        onClick={onOpenAutoLive}
        className="flex shrink-0 items-center gap-2 rounded-lg border border-fuchsia-500/40 bg-fuchsia-500/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-fuchsia-300 hover:bg-fuchsia-500/25 transition-colors"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Ouvrir Auto Live
      </button>
    </div>
  );
}

import React from 'react';
import { Sparkles } from 'lucide-react';

export function AutoLiveBackgroundBadge({
  onOpenAutoLive,
}: {
  onOpenAutoLive: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpenAutoLive}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-300 text-[10px] font-black uppercase tracking-widest hover:bg-fuchsia-500/25 transition-all animate-pulse"
      title="Le pilote Auto Live tourne en arrière-plan — cliquer pour ouvrir"
    >
      <Sparkles className="w-3.5 h-3.5" />
      Auto Live actif
    </button>
  );
}

import React from 'react';
import { Mic, PartyPopper, Square, Waves } from 'lucide-react';
import type { AutoLiveState } from '../../../types/autoLive';

interface AutoLiveOneClickSectionProps {
  state: AutoLiveState;
  audioActive: boolean;
  onLaunch: () => void;
  onStop: () => void;
  indicators?: {
    bpm: number;
    masterDimmer: number;
    isBeatActive: boolean;
  };
}

export function AutoLiveOneClickSection({
  state,
  audioActive,
  onLaunch,
  onStop,
  indicators,
}: AutoLiveOneClickSectionProps) {
  const { enabled } = state;
  const masterPct = indicators
    ? Math.round((indicators.masterDimmer / 255) * 100)
    : null;

  return (
    <section className="flex flex-col items-center justify-center gap-6 py-6 px-4 min-h-[min(520px,60vh)]">
      <div className="text-center max-w-md space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-400/90">
          One-Click Party
        </p>
        <h2 className="text-lg font-black uppercase tracking-tight text-white">
          Ambiance automatique
        </h2>
        <p className="text-[12px] text-slate-400 leading-relaxed">
          Le micro analyse le morceau, change les scènes selon l&apos;énergie et adapte pulse,
          couleurs et vitesse des lyres. Aucun réglage Calme / Montée / Peak à faire.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-mono">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-900/80 px-3 py-1 text-slate-400">
          <Mic className="h-3.5 w-3.5 text-cyan-400" />
          Micro / ligne
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-900/80 px-3 py-1 text-slate-400">
          <Waves className="h-3.5 w-3.5 text-violet-400" />
          Tempo &amp; énergie
        </span>
      </div>

      {!enabled ? (
        <button
          type="button"
          onClick={onLaunch}
          className="group relative w-full max-w-lg rounded-3xl border-2 border-fuchsia-400/60 bg-gradient-to-b from-fuchsia-500/25 to-fuchsia-600/10 px-8 py-10 text-center shadow-[0_0_48px_rgba(217,70,239,0.35)] transition-all hover:border-fuchsia-300 hover:shadow-[0_0_56px_rgba(217,70,239,0.5)] active:scale-[0.98]"
        >
          <PartyPopper className="mx-auto h-12 w-12 text-fuchsia-300 mb-4 group-hover:scale-110 transition-transform" />
          <span className="block text-base sm:text-lg font-black uppercase tracking-widest text-white">
            Lancer l&apos;ambiance automatique
          </span>
          <span className="mt-2 block text-[11px] font-bold text-fuchsia-200/80 normal-case tracking-normal">
            Scènes et vitesse choisies pour vous — prêt en un clic
          </span>
        </button>
      ) : (
        <div className="w-full max-w-lg space-y-4">
          <div className="rounded-3xl border border-fuchsia-500/40 bg-fuchsia-500/15 px-6 py-8 text-center">
            <p className="text-sm font-black uppercase tracking-widest text-fuchsia-200">
              Auto Live en cours
            </p>
            {indicators && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span className="rounded-lg bg-black/30 px-3 py-1.5 text-cyan-400">
                  BPM {Math.round(indicators.bpm)}
                </span>
                {masterPct != null && (
                  <span className="rounded-lg bg-black/30 px-3 py-1.5 text-white">
                    Master {masterPct}%
                  </span>
                )}
                <span
                  className={`rounded-lg bg-black/30 px-3 py-1.5 ${
                    indicators.isBeatActive ? 'text-emerald-400' : 'text-slate-600'
                  }`}
                >
                  {indicators.isBeatActive ? 'Beat ●' : 'Beat —'}
                </span>
              </div>
            )}
            {!audioActive && (
              <p className="mt-3 text-[10px] font-bold text-amber-400/90">
                Connexion au micro / analyse…
              </p>
            )}
            <p className="mt-3 text-[11px] text-slate-400">
              Vous pouvez rester sur l&apos;onglet Live pour ajuster le master ou reprendre la main.
            </p>
          </div>
          <button
            type="button"
            onClick={onStop}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-slate-800/90 py-3 text-[11px] font-black uppercase tracking-widest text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <Square className="h-3.5 w-3.5" />
            Arrêter l&apos;auto
          </button>
        </div>
      )}
    </section>
  );
}

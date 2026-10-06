import React, { useState } from 'react';
import { Activity, ChevronDown, Music2, Sparkles, Moon } from 'lucide-react';
import type { AmbiancePreset } from '../../../types';
import type {
  AutoLivePauseBehavior,
  AutoLivePresetId,
  AutoLiveState,
} from '../../../types/autoLive';
import { AUTO_LIVE_PRESET_ORDER, AUTO_LIVE_PRESETS } from '../../../utils/autoLivePresets';

const SIMPLE_PAUSE: { id: AutoLivePauseBehavior; label: string }[] = [
  { id: 'hold', label: 'Garder le niveau' },
  { id: 'fade', label: 'Baisser progressivement' },
  { id: 'blackout', label: 'Tout éteindre' },
];

interface AutoLiveSimpleSectionProps {
  state: AutoLiveState;
  customPresets: Record<string, AmbiancePreset>;
  onToggleEnabled: () => void;
  onApplyPreset: (id: AutoLivePresetId) => void;
  onEnergyLooksChange: (patch: Partial<AutoLiveState['energyLooks']>) => void;
  onOptionChange: <K extends 'autoColor' | 'holdBetweenSongs'>(
    key: K,
    value: AutoLiveState['options'][K]
  ) => void;
  onPauseBehavior: (v: AutoLivePauseBehavior) => void;
  audioActive: boolean;
  indicators?: {
    bpm: number;
    masterDimmer: number;
    isBeatActive: boolean;
  };
}

export function AutoLiveSimpleSection({
  state,
  customPresets,
  onToggleEnabled,
  onApplyPreset,
  onEnergyLooksChange,
  onOptionChange,
  onPauseBehavior,
  audioActive,
  indicators,
}: AutoLiveSimpleSectionProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const { enabled, options, energyLooks } = state;
  const activePreset = state.presetId ?? 'standard';

  const presetLabel = (slot: string) => {
    const p = customPresets[slot];
    const has = p && Object.keys(p.groupStates).length > 0;
    return has ? p.name : `Scène ${slot} (vide)`;
  };

  return (
    <section className="h-full flex flex-col gap-4 min-h-0 max-w-3xl mx-auto w-full">
      <div className="rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-fuchsia-300 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Lumières sur la musique
            </h2>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed max-w-lg">
              Activez l’auto, choisissez un style de soirée, réglez le{' '}
              <span className="text-yellow-400/90">master</span> en haut. Vous pouvez rester sur
              l’onglet <span className="text-cyan-400">Live</span> pour ajuster à la main.
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleEnabled}
            className={`shrink-0 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${
              enabled
                ? 'bg-fuchsia-500 text-white shadow-[0_0_20px_rgba(217,70,239,0.45)]'
                : 'bg-slate-800 text-slate-300 border border-white/10'
            }`}
          >
            {enabled ? 'Auto · ON' : 'Démarrer l’auto'}
          </button>
        </div>

        {enabled && indicators && (
          <div className="flex flex-wrap gap-2 text-[10px] font-mono">
            <span className="rounded-lg bg-black/30 px-2 py-1 text-cyan-400">
              BPM {Math.round(indicators.bpm)}
            </span>
            <span className="rounded-lg bg-black/30 px-2 py-1 text-white">
              Master {Math.round((indicators.masterDimmer / 255) * 100)}%
            </span>
            <span
              className={`rounded-lg bg-black/30 px-2 py-1 ${
                indicators.isBeatActive ? 'text-emerald-400' : 'text-slate-600'
              }`}
            >
              {indicators.isBeatActive ? 'Beat ●' : 'Beat —'}
            </span>
          </div>
        )}

        {enabled && !audioActive && (
          <p className="text-[10px] font-bold text-amber-400/90">Écoute du micro / ligne…</p>
        )}
      </div>

      <div className={enabled ? '' : 'opacity-50 pointer-events-none'}>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
          <Music2 className="w-3.5 h-3.5" />
          Type de soirée
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {AUTO_LIVE_PRESET_ORDER.map((id) => {
            const preset = AUTO_LIVE_PRESETS[id];
            const isActive = activePreset === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onApplyPreset(id)}
                className={`text-left p-3 rounded-xl border transition-all ${
                  isActive
                    ? 'border-fuchsia-500/50 bg-fuchsia-500/15 ring-1 ring-fuchsia-500/30'
                    : 'border-white/10 bg-[#111317] hover:border-white/20'
                }`}
              >
                <p className="text-xs font-black uppercase text-slate-100">{preset.label}</p>
                <p className="text-[10px] text-slate-500 mt-1">{preset.subtitle}</p>
                {id === 'acoustic' && (
                  <p className="text-[9px] text-cyan-500/80 mt-1 font-bold">Recommandé débutant</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={`space-y-3 rounded-2xl border border-white/10 bg-[#111317] p-4 ${
          enabled ? '' : 'opacity-50 pointer-events-none'
        }`}
      >
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="text-[11px] text-slate-300">
            <Sparkles className="w-3.5 h-3.5 inline mr-1.5 text-fuchsia-400" />
            Changer les scènes (1–8) selon l’énergie
          </span>
          <input
            type="checkbox"
            className="w-4 h-4 accent-fuchsia-500"
            checked={energyLooks.enabled}
            onChange={(e) =>
              onEnergyLooksChange({
                enabled: e.target.checked,
                useFade: e.target.checked ? true : energyLooks.useFade,
              })
            }
          />
        </label>

        {energyLooks.enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pl-1">
            {(
              [
                ['calmSlot', 'Calme'],
                ['buildSlot', 'Montée'],
                ['peakSlot', 'Peak'],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <span className="text-[8px] font-black uppercase text-slate-500">{label}</span>
                <select
                  value={energyLooks[key]}
                  onChange={(e) => onEnergyLooksChange({ [key]: e.target.value })}
                  className="mt-1 w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-300"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
                    const id = String(n);
                    return (
                      <option key={id} value={id}>
                        {presetLabel(id)}
                      </option>
                    );
                  })}
                </select>
              </div>
            ))}
          </div>
        )}

        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="text-[11px] text-slate-300">Couleurs qui évoluent seules</span>
          <input
            type="checkbox"
            className="w-4 h-4 accent-fuchsia-500"
            checked={options.autoColor}
            onChange={(e) => onOptionChange('autoColor', e.target.checked)}
          />
        </label>

        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="text-[11px] text-slate-300">Figé entre deux morceaux (moins de mouvement)</span>
          <input
            type="checkbox"
            className="w-4 h-4 accent-fuchsia-500"
            checked={options.holdBetweenSongs}
            onChange={(e) => onOptionChange('holdBetweenSongs', e.target.checked)}
          />
        </label>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Moon className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[10px] font-black uppercase text-slate-500">Silence prolongé</span>
          <select
            value={options.pauseBehavior}
            onChange={(e) => onPauseBehavior(e.target.value as AutoLivePauseBehavior)}
            className="flex-1 min-w-[160px] bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-300"
          >
            {SIMPLE_PAUSE.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setAdvancedOpen((v) => !v)}
        className="flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-500 hover:text-fuchsia-400 transition-colors"
      >
        <ChevronDown className={`w-4 h-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
        {advancedOpen ? 'Masquer les réglages avancés' : 'Réglages avancés (régie)'}
      </button>

      {advancedOpen && (
        <p className="text-[10px] text-slate-500 text-center pb-2">
          Passez le profil Live en <span className="text-cyan-400">Régie</span> dans Réglages pour
          voir toutes les cartes (bandes, routage, options détaillées) sur cet onglet.
        </p>
      )}
    </section>
  );
}

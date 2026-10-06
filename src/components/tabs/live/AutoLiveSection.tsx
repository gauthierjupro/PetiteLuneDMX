import React from 'react';
import {
  Activity,
  Zap,
  Music,
  BarChart3,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Palette,
  Moon,
  PauseCircle,
} from 'lucide-react';
import type { AmbiancePreset } from '../../../types';
import type {
  AutoLiveBandRouting,
  AutoLiveEnergyLooksConfig,
  AutoLiveOptions,
  AutoLivePauseBehavior,
  AutoLivePresetId,
  AutoLiveState,
} from '../../../types/autoLive';
import { AUTO_LIVE_PRESET_ORDER, AUTO_LIVE_PRESETS } from '../../../utils/autoLivePresets';
import { AutoLiveBandRoutingSection } from './AutoLiveBandRoutingSection';
import { AutoLiveEnergyLooksSection } from './AutoLiveEnergyLooksSection';
import { AutoLiveSimpleSection } from './AutoLiveSimpleSection';
import { AutoLiveOneClickSection } from './AutoLiveOneClickSection';
import { PartyPopper } from 'lucide-react';

interface AutoLiveSectionProps {
  state: AutoLiveState;
  customPresets: Record<string, AmbiancePreset>;
  onToggleEnabled: () => void;
  onDisableAutoLive?: () => void;
  onOptionChange: <K extends keyof AutoLiveOptions>(key: K, value: AutoLiveOptions[K]) => void;
  onApplyPreset: (id: AutoLivePresetId) => void;
  onEnergyLooksChange: (patch: Partial<AutoLiveEnergyLooksConfig>) => void;
  onBandRoutingChange: (patch: Partial<AutoLiveBandRouting>) => void;
  audioActive: boolean;
  indicators?: {
    bpm: number;
    masterDimmer: number;
    bass: number;
    mid: number;
    isBeatActive: boolean;
  };
  /** Profil Débutant : interface réduite. */
  simpleMode?: boolean;
  /** Mode facile One-Click Party (masque la structure Calme/Montée/Peak). */
  easyMode?: boolean;
  onEasyModeChange?: (enabled: boolean) => void;
  onLaunchOneClickParty?: () => void;
}

const OPTION_CARDS: {
  key: keyof AutoLiveOptions;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  bool?: true;
}[] = [
  {
    key: 'realtime',
    title: 'Temps réel',
    description: 'Micro / ligne direct.',
    icon: Zap,
    bool: true,
  },
  {
    key: 'followRhythm',
    title: 'Tempo / rythme',
    description: 'Pulse PAR + kick.',
    icon: Music,
    bool: true,
  },
  {
    key: 'followEnergy',
    title: 'Suivi énergie',
    description: 'Master multi-bandes.',
    icon: BarChart3,
    bool: true,
  },
  {
    key: 'risesAndDrops',
    title: 'Montées / chutes',
    description: 'Vitesse lyres.',
    icon: TrendingUp,
    bool: true,
  },
  {
    key: 'accents',
    title: 'Accents',
    description: 'Flash sur impacts.',
    icon: Sparkles,
    bool: true,
  },
  {
    key: 'stayFresh',
    title: 'Reste frais',
    description: 'Formes variées.',
    icon: RefreshCw,
    bool: true,
  },
  {
    key: 'autoColor',
    title: 'Couleur auto',
    description: 'RGB / lyres.',
    icon: Palette,
    bool: true,
  },
  {
    key: 'holdBetweenSongs',
    title: 'Entre morceaux',
    description: 'Pause au silence.',
    icon: PauseCircle,
    bool: true,
  },
];

const PAUSE_LABELS: Record<AutoLivePauseBehavior, string> = {
  hold: 'Garder le niveau actuel',
  fade: 'Baisser le master (fade)',
  blackout: 'Blackout',
  look: 'Look figé (aucune action)',
};

function AutoLiveIndicators({
  indicators,
}: {
  indicators: NonNullable<AutoLiveSectionProps['indicators']>;
}) {
  const masterPct = Math.round((indicators.masterDimmer / 255) * 100);
  const items = [
    { label: 'BPM', value: String(Math.round(indicators.bpm)), className: 'text-cyan-400' },
    { label: 'Master', value: `${masterPct}%`, className: 'text-white' },
    {
      label: 'Bass',
      value: `${Math.round(indicators.bass * 100)}%`,
      className: 'text-fuchsia-400',
    },
    {
      label: 'Mid',
      value: `${Math.round(indicators.mid * 100)}%`,
      className: 'text-violet-400',
    },
    {
      label: 'Beat',
      value: indicators.isBeatActive ? '●' : '—',
      className: indicators.isBeatActive ? 'text-emerald-400' : 'text-slate-600',
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900/80 border border-white/5 px-2 py-1"
        >
          <span className="text-[8px] font-black uppercase text-slate-500">{item.label}</span>
          <span className={`text-xs font-mono font-bold ${item.className}`}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export const AutoLiveSection = ({
  state,
  customPresets,
  onToggleEnabled,
  onDisableAutoLive,
  onOptionChange,
  onApplyPreset,
  onEnergyLooksChange,
  onBandRoutingChange,
  audioActive,
  indicators,
  simpleMode = false,
  easyMode = false,
  onEasyModeChange,
  onLaunchOneClickParty,
}: AutoLiveSectionProps) => {
  const { enabled, options } = state;
  const activePreset = state.presetId ?? 'standard';

  const easyModeToggle =
    onEasyModeChange != null ? (
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-500/35 bg-gradient-to-r from-cyan-500/10 to-fuchsia-500/10 px-4 py-3 mb-1">
        <div className="flex items-start gap-3 min-w-0">
          <PartyPopper
            className={`w-8 h-8 shrink-0 ${easyMode ? 'text-fuchsia-300' : 'text-slate-500'}`}
          />
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-cyan-300">
              Mode facile · One-Click Party
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5 max-w-lg">
              Un seul bouton : scènes et tempo micro automatiques. Désactivez pour voir tous les
              réglages (Calme / Montée / Peak, routage…).
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={easyMode}
          onClick={() => onEasyModeChange(!easyMode)}
          className={`shrink-0 relative w-14 h-8 rounded-full transition-colors ${
            easyMode ? 'bg-fuchsia-500' : 'bg-slate-700 border border-white/10'
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${
              easyMode ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
          <span className="sr-only">{easyMode ? 'Mode facile activé' : 'Mode facile désactivé'}</span>
        </button>
      </div>
    ) : null;

  if (easyMode && onLaunchOneClickParty) {
    return (
      <section className="h-full flex flex-col gap-2 min-h-0">
        {easyModeToggle}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <AutoLiveOneClickSection
            state={state}
            audioActive={audioActive}
            onLaunch={onLaunchOneClickParty}
            onStop={onDisableAutoLive ?? onToggleEnabled}
            indicators={
              indicators
                ? {
                    bpm: indicators.bpm,
                    masterDimmer: indicators.masterDimmer,
                    isBeatActive: indicators.isBeatActive,
                  }
                : undefined
            }
          />
        </div>
      </section>
    );
  }

  if (simpleMode) {
    return (
      <section className="h-full flex flex-col gap-2 min-h-0">
        {easyModeToggle}
        <AutoLiveSimpleSection
        state={state}
        customPresets={customPresets}
        onToggleEnabled={onToggleEnabled}
        onApplyPreset={onApplyPreset}
        onEnergyLooksChange={onEnergyLooksChange}
        onOptionChange={onOptionChange}
        onPauseBehavior={(v) => onOptionChange('pauseBehavior', v)}
        audioActive={audioActive}
        indicators={
          indicators
            ? {
                bpm: indicators.bpm,
                masterDimmer: indicators.masterDimmer,
                isBeatActive: indicators.isBeatActive,
              }
            : undefined
        }
        />
      </section>
    );
  }

  return (
    <section className="h-full flex flex-col gap-2 min-h-0">
      {easyModeToggle}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-4 min-w-0">
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-fuchsia-400 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" />
              Live automatique
            </h2>
            <p className="text-[9px] text-slate-500 mt-0.5 max-w-md">
              Pilote actif en arrière-plan (Scène, Patch…). Macros lyres : onglet{' '}
              <span className="text-cyan-400 font-bold">Live</span>.
            </p>
          </div>
          {enabled && indicators && <AutoLiveIndicators indicators={indicators} />}
        </div>
        <button
          type="button"
          onClick={onToggleEnabled}
          className={`shrink-0 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
            enabled
              ? 'bg-fuchsia-500 text-white shadow-[0_0_16px_rgba(217,70,239,0.4)]'
              : 'bg-slate-800 text-slate-400 border border-white/10'
          }`}
        >
          {enabled ? 'Auto · ON' : 'Activer l’auto'}
        </button>
      </div>

      {enabled && !audioActive && (
        <p className="text-[9px] font-bold text-amber-400/90 uppercase shrink-0">
          Analyse audio au démarrage…
        </p>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-2 gap-3 overflow-hidden">
        <div className="min-h-0 overflow-y-auto custom-scrollbar space-y-3 pr-1">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
              Profils
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {AUTO_LIVE_PRESET_ORDER.map((id) => {
                const preset = AUTO_LIVE_PRESETS[id];
                const isActive = activePreset === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onApplyPreset(id)}
                    className={`text-left p-2 rounded-xl border transition-all ${
                      isActive
                        ? 'border-fuchsia-500/50 bg-fuchsia-500/15'
                        : 'border-white/10 bg-[#111317] hover:border-white/20'
                    }`}
                  >
                    <p className="text-[10px] font-black uppercase text-slate-200 leading-tight">
                      {preset.label}
                    </p>
                    <p className="text-[8px] text-slate-500 mt-0.5 line-clamp-2">{preset.subtitle}</p>
                  </button>
                );
              })}
            </div>
            {activePreset === 'custom' && (
              <p className="text-[8px] text-amber-500/90 font-bold uppercase mt-1">
                Réglages personnalisés
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {OPTION_CARDS.map(({ key, title, description, icon: Icon }) => {
              const on = options[key] as boolean;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={!enabled}
                  title={description}
                  onClick={() => onOptionChange(key, !on as AutoLiveOptions[typeof key])}
                  className={`text-left p-2 rounded-xl border transition-all ${
                    !enabled
                      ? 'opacity-40 cursor-not-allowed border-white/5 bg-slate-900/30'
                      : on
                        ? 'border-fuchsia-500/40 bg-fuchsia-500/10'
                        : 'border-white/5 bg-[#111317] hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 ${
                        on && enabled ? 'text-fuchsia-300' : 'text-slate-500'
                      }`}
                    />
                    <p className="text-[9px] font-black uppercase text-slate-200 leading-tight">
                      {title}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div
            className={`p-2.5 rounded-xl border flex flex-wrap items-center gap-3 ${
              enabled ? 'border-white/10 bg-[#111317]' : 'opacity-40 border-white/5'
            }`}
          >
            <Moon className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-[9px] font-black uppercase text-slate-400">Pauses (silence)</span>
            <select
              disabled={!enabled}
              value={options.pauseBehavior}
              onChange={(e) =>
                onOptionChange('pauseBehavior', e.target.value as AutoLivePauseBehavior)
              }
              className="flex-1 min-w-[140px] bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-300 outline-none focus:border-fuchsia-500/50"
            >
              {(Object.keys(PAUSE_LABELS) as AutoLivePauseBehavior[]).map((k) => (
                <option key={k} value={k}>
                  {PAUSE_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto custom-scrollbar space-y-3 pl-0 xl:pl-1">
          <AutoLiveBandRoutingSection routing={state.bandRouting} onChange={onBandRoutingChange} />
          <AutoLiveEnergyLooksSection
            config={state.energyLooks}
            customPresets={customPresets}
            onChange={onEnergyLooksChange}
          />
        </div>
      </div>
    </section>
  );
};


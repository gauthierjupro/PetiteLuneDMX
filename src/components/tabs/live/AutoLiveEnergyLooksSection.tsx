import React from 'react';
import { Layers } from 'lucide-react';
import type { AmbiancePreset } from '../../../types';
import type { AutoLiveEnergyLooksConfig } from '../../../types/autoLive';
import { ambiancePresetHasData } from '../../../utils/autoLiveEnergyLooks';

const SLOTS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

function slotLabel(
  slot: string,
  customPresets: Record<string, AmbiancePreset>
): string {
  if (!slot) return '—';
  const preset = customPresets[slot];
  if (!ambiancePresetHasData(customPresets, slot)) return `${slot} (vide)`;
  return `${slot} · ${preset.name}`;
}

export function AutoLiveEnergyLooksSection({
  config,
  customPresets,
  onChange,
}: {
  config: AutoLiveEnergyLooksConfig;
  customPresets: Record<string, AmbiancePreset>;
  onChange: (patch: Partial<AutoLiveEnergyLooksConfig>) => void;
}) {
  return (
    <div
      className={`p-3 rounded-2xl border space-y-3 ${
        config.enabled ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-white/10 bg-[#111317]'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[11px] font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Looks par énergie
          </h3>
          <p className="text-[9px] text-slate-500 mt-1 max-w-lg font-medium leading-relaxed">
            Rappelle les presets ambiance du Live (1–8) selon le niveau audio. Enregistrez-les
            d&apos;abord dans l&apos;onglet Live → Ambiances (clic droit sur 1–8).
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange({ enabled: !config.enabled })}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
            config.enabled
              ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
              : 'bg-slate-800 text-slate-500 border border-white/10'
          }`}
        >
          {config.enabled ? 'Actif' : 'Off'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(
          [
            { key: 'calmSlot' as const, label: 'Calme' },
            { key: 'buildSlot' as const, label: 'Montée' },
            { key: 'peakSlot' as const, label: 'Peak' },
          ] as const
        ).map(({ key, label }) => (
          <label key={key} className="space-y-1">
            <span className="text-[9px] font-black uppercase text-slate-500">{label}</span>
            <select
              disabled={!config.enabled}
              value={config[key]}
              onChange={(e) => onChange({ [key]: e.target.value })}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-2 text-[10px] font-bold text-slate-300 outline-none focus:border-cyan-500/50 disabled:opacity-40"
            >
              <option value="">Aucun</option>
              {SLOTS.map((s) => (
                <option key={s} value={s}>
                  {slotLabel(s, customPresets)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className="flex justify-between text-[9px] font-black uppercase text-slate-500">
            <span>Seuil calme</span>
            <span className="text-cyan-400 font-mono">{Math.round(config.lowThreshold * 100)}%</span>
          </div>
          <input
            type="range"
            min={8}
            max={60}
            disabled={!config.enabled}
            value={Math.round(config.lowThreshold * 100)}
            onChange={(e) => onChange({ lowThreshold: parseInt(e.target.value, 10) / 100 })}
            className="w-full h-1 bg-slate-800 rounded-full accent-cyan-500 disabled:opacity-40"
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-[9px] font-black uppercase text-slate-500">
            <span>Seuil peak</span>
            <span className="text-cyan-400 font-mono">
              {Math.round(config.highThreshold * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={40}
            max={90}
            disabled={!config.enabled}
            value={Math.round(config.highThreshold * 100)}
            onChange={(e) => onChange({ highThreshold: parseInt(e.target.value, 10) / 100 })}
            className="w-full h-1 bg-slate-800 rounded-full accent-cyan-500 disabled:opacity-40"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          disabled={!config.enabled}
          checked={config.useFade}
          onChange={(e) => onChange({ useFade: e.target.checked })}
          className="accent-cyan-500 disabled:opacity-40"
        />
        <span className="text-[9px] font-bold text-slate-400 uppercase">
          Fade presets entre looks (durée = réglage « Fade presets » Live → Ambiances)
        </span>
      </label>

      <div className="space-y-2">
        <div className="flex justify-between text-[9px] font-black uppercase text-slate-500">
          <span>Délai entre looks</span>
          <span className="text-cyan-400 font-mono">{config.minHoldMs / 1000}s</span>
        </div>
        <input
          type="range"
          min={3}
          max={45}
          step={1}
          disabled={!config.enabled}
          value={config.minHoldMs / 1000}
          onChange={(e) => onChange({ minHoldMs: parseInt(e.target.value, 10) * 1000 })}
          className="w-full h-1 bg-slate-800 rounded-full accent-cyan-500 disabled:opacity-40"
        />
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { ChevronDown, Power, Radio, Music2, Sliders } from 'lucide-react';
import { ControlSlider } from '../../ui/ControlSlider';
import { WookieLaserPresetGrid } from './WookieLaserPresetGrid';
import type { Fixture } from '../../../types';
import {
  applyWookie200RGlobalModeToFixtures,
  applyWookie200RPresetToFixtures,
  inferWookie200RGlobalMode,
  readWookie200RActivePreset,
  readWookie200RChannelValue,
  writeWookie200RChannelToFixtures,
  type Wookie200RGlobalMode,
  wookie200RCh1ForMode,
} from '../../../utils/cameoWookie200R';

const MODE_BUTTONS: {
  id: Wookie200RGlobalMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'off', label: 'Off', icon: Power },
  { id: 'auto', label: 'Auto', icon: Radio },
  { id: 'sound', label: 'Musical', icon: Music2 },
  { id: 'dmx', label: 'DMX', icon: Sliders },
];

const GEOMETRY_SLIDERS: { ch: number; label: string }[] = [
  { ch: 4, label: 'Zoom / taille' },
  { ch: 5, label: 'Rotation X' },
  { ch: 6, label: 'Rotation Y' },
  { ch: 7, label: 'Rotation Z' },
  { ch: 8, label: 'Position X' },
  { ch: 9, label: 'Position Y' },
];

interface WookieLaserLivePanelProps {
  fixtures: Fixture[];
  channels: number[];
  updateDmx: (channelIndex0: number, value: number) => void;
}

export function WookieLaserLivePanel({
  fixtures,
  channels,
  updateDmx,
}: WookieLaserLivePanelProps) {
  const [geometryOpen, setGeometryOpen] = useState(false);
  const ref = fixtures[0];
  const ch1 = ref ? readWookie200RChannelValue(ref, 1, channels) : 0;
  const activeMode = inferWookie200RGlobalMode(ch1);
  const isDmx = activeMode === 'dmx';
  const activePreset = ref ? readWookie200RActivePreset(ref, channels) : null;

  useEffect(() => {
    if (!isDmx) setGeometryOpen(false);
  }, [isDmx]);

  if (!ref) return null;

  const slider = (ch: number, label: string) => (
    <ControlSlider
      label={label}
      value={readWookie200RChannelValue(ref, ch, channels)}
      onChange={(v) =>
        writeWookie200RChannelToFixtures(fixtures, ch, Number(v), updateDmx)
      }
    />
  );

  return (
    <div className="space-y-4 w-full max-w-xl">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-rose-400/90 mb-2">
          Cameo WOOKIE 200 R
        </p>
        <div className="flex flex-wrap gap-1.5">
          {MODE_BUTTONS.map(({ id, label, icon: Icon }) => {
            const active = activeMode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() =>
                  applyWookie200RGlobalModeToFixtures(
                    fixtures,
                    wookie200RCh1ForMode(id),
                    updateDmx
                  )
                }
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[9px] font-black uppercase transition-all duration-200 active:scale-95 ${
                  active
                    ? 'border-rose-400 bg-rose-500/20 text-rose-200'
                    : 'border-white/10 bg-slate-900/60 text-slate-400 hover:border-white/20'
                }`}
              >
                <Icon className="w-3 h-3 shrink-0" />
                {label}
              </button>
            );
          })}
        </div>
        <p
          className={`text-[9px] mt-2 transition-colors duration-300 ${
            isDmx ? 'text-slate-500' : 'text-slate-600'
          }`}
        >
          {isDmx ? (
            <>Motifs et géométrie disponibles ci-dessous.</>
          ) : (
            <>
              Modes internes — activez{' '}
              <span className="text-rose-400/90 font-bold">DMX</span> pour motifs et réglages
              géométriques.
            </>
          )}
        </p>
      </div>

      <div
        className={`space-y-4 transition-all duration-300 ease-out ${
          isDmx
            ? 'opacity-100 max-h-[2000px] translate-y-0'
            : 'opacity-0 max-h-0 -translate-y-1 overflow-hidden pointer-events-none'
        }`}
        aria-hidden={!isDmx}
      >
        <WookieLaserPresetGrid
          activePreset={activePreset}
          onSelectPreset={(preset) =>
            applyWookie200RPresetToFixtures(fixtures, preset, updateDmx)
          }
        />

        <div className="rounded-xl border border-white/10 bg-slate-900/40 overflow-hidden">
          <button
            type="button"
            onClick={() => setGeometryOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-white/5 transition-colors duration-200"
            aria-expanded={geometryOpen}
          >
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Réglages géométriques avancés
            </span>
            <ChevronDown
              className={`w-4 h-4 shrink-0 text-slate-500 transition-transform duration-300 ${
                geometryOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          <div
            className={`grid transition-all duration-300 ease-out ${
              geometryOpen
                ? 'grid-rows-[1fr] opacity-100'
                : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-3 pb-3 pt-1 border-t border-white/5">
                {GEOMETRY_SLIDERS.map(({ ch, label }) => (
                  <React.Fragment key={ch}>{slider(ch, label)}</React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

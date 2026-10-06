import React from 'react';
import { Power, Radio, Music2, Sliders } from 'lucide-react';
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
  if (fixtures.length === 0) return null;

  const ref = fixtures[0]!;
  const ch1 = readWookie200RChannelValue(ref, 1, channels);
  const activeMode = inferWookie200RGlobalMode(ch1);
  const activePreset = readWookie200RActivePreset(ref, channels);

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
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[9px] font-black uppercase transition-all active:scale-95 ${
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
        <p className="text-[9px] text-slate-600 mt-2">
          Choisissez <span className="text-rose-400/90 font-bold">DMX</span> pour piloter motifs,
          zoom et axes ci-dessous.
        </p>
      </div>

      <WookieLaserPresetGrid
        activePreset={activePreset}
        onSelectPreset={(preset) =>
          applyWookie200RPresetToFixtures(fixtures, preset, updateDmx)
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-white/5">
        {slider(4, 'Zoom / taille')}
        {slider(5, 'Rotation X')}
        {slider(6, 'Rotation Y')}
        {slider(7, 'Rotation Z')}
        {slider(8, 'Position X')}
        {slider(9, 'Position Y')}
      </div>
    </div>
  );
}

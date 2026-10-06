import React, { useState } from 'react';
import {
  ListOrdered,
  Play,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  StepForward,
} from 'lucide-react';
import { Tooltip } from '../../ui/Tooltip';
import { GlassCard } from '../../ui/GlassCard';
import type { ShowCue } from '../../../types';
import { countNonZeroChannels } from '../../../utils/cueStats';

interface CueListSectionProps {
  channels: number[];
  cues: ShowCue[];
  playheadIndex: number;
  onPlayheadChange: (index: number) => void;
  onAddCue: (
    name: string,
    channels: number[],
    fadeMs: number,
    alsoPresetSlot?: string
  ) => void;
  onCopyLiveAmbianceToPreset: (presetName: string, presetSlot: string) => void;
  onRemoveCue: (id: string) => void;
  onReorderCue: (id: string, direction: 'up' | 'down') => void;
  onGoCue: (cue: ShowCue, cueIndex: number) => void;
  onGoNextCue: () => void;
}

export function CueListSection({
  channels,
  cues,
  playheadIndex,
  onPlayheadChange,
  onAddCue,
  onRemoveCue,
  onReorderCue,
  onGoCue,
  onGoNextCue,
  onCopyLiveAmbianceToPreset,
}: CueListSectionProps) {
  const [newName, setNewName] = useState('');
  const [fadeMs, setFadeMs] = useState(0);
  const [alsoPreset, setAlsoPreset] = useState(false);
  const [capturePresetSlot, setCapturePresetSlot] = useState('1');

  const handleCapture = () => {
    onAddCue(newName, channels, fadeMs, alsoPreset ? capturePresetSlot : undefined);
    setNewName('');
  };

  const nextCue = cues.length > 0 ? cues[playheadIndex % cues.length] : null;

  return (
    <GlassCard title="Cue list" icon={ListOrdered}>
      <div className="space-y-4">
        <p className="text-[10px] text-slate-500 leading-relaxed">
          <span className="font-black text-slate-400">GO</span> sur une ligne = cette cue ·{' '}
          <span className="font-black text-amber-400/90">Entrée</span> ou « GO suivante » = cue
          surlignée (playhead) · le playhead avance après chaque GO.
        </p>

        {nextCue && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-amber-400/80">
              Prochaine (Entrée)
            </span>
            <span className="text-xs font-bold text-amber-100 truncate flex-1 min-w-0">
              {(playheadIndex % cues.length) + 1}. {nextCue.name}
            </span>
            <button
              type="button"
              onClick={onGoNextCue}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500/25 border border-amber-500/40 px-3 py-1.5 text-[10px] font-black uppercase text-amber-200 hover:bg-amber-500/35 transition-colors"
            >
              <StepForward className="h-3.5 w-3.5" />
              GO suivante
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[120px]">
            <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">
              Nom
            </label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Intro, drop…"
              className="w-full mt-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div className="w-24">
            <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">
              Fade ms
            </label>
            <input
              type="number"
              min={0}
              max={60000}
              value={fadeMs}
              onChange={(e) => setFadeMs(parseInt(e.target.value, 10) || 0)}
              className="w-full mt-1 bg-slate-900 border border-white/10 rounded-xl px-2 py-2 text-xs font-mono focus:outline-none focus:border-cyan-400"
            />
          </div>
          <button
            type="button"
            onClick={handleCapture}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-cyan-500/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Capturer l&apos;univers
          </button>
        </div>
        <label className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
          <input
            type="checkbox"
            checked={alsoPreset}
            onChange={(e) => setAlsoPreset(e.target.checked)}
            className="accent-cyan-500"
          />
          <span>Aussi enregistrer l&apos;ambiance Live actuelle comme preset</span>
          <select
            value={capturePresetSlot}
            disabled={!alsoPreset}
            onChange={(e) => setCapturePresetSlot(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-[10px] font-mono text-cyan-400 disabled:opacity-40"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={String(n)}>
                Preset {n}
              </option>
            ))}
          </select>
        </label>

        {cues.length === 0 ? (
          <p className="text-[10px] text-slate-600 font-bold uppercase text-center py-6">
            Aucune cue — capture l&apos;univers actuel puis GO en live
          </p>
        ) : (
          <ul className="space-y-2 max-h-[min(420px,50vh)] overflow-y-auto custom-scrollbar pr-1">
            {cues.map((cue, index) => {
              const isPlayhead = index === playheadIndex % cues.length;
              const activeCh = countNonZeroChannels(cue.channels);

              return (
                <li
                  key={cue.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onPlayheadChange(index)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onPlayheadChange(index);
                    }
                  }}
                  className={`flex items-center gap-2 p-2 border rounded-xl cursor-pointer transition-colors ${
                    isPlayhead
                      ? 'bg-amber-500/15 border-amber-500/40 ring-1 ring-amber-500/20'
                      : 'bg-white/5 border-white/5 hover:border-white/15'
                  }`}
                >
                  <span
                    className={`text-[10px] font-mono w-5 ${isPlayhead ? 'text-amber-400 font-black' : 'text-slate-500'}`}
                  >
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="block text-xs font-bold uppercase truncate">{cue.name}</span>
                    <span className="text-[9px] text-slate-600 font-mono">
                      {activeCh} canal{activeCh !== 1 ? 'x' : ''} actif{activeCh !== 1 ? 's' : ''} ·{' '}
                      {cue.fadeMs} ms
                    </span>
                  </div>
                  <Tooltip text="Mémoriser l’ambiance Live actuelle dans un preset (pas le snapshot DMX de la cue)">
                    <select
                      className="max-w-[4.5rem] rounded-lg border border-white/10 bg-slate-900 px-1 py-1 text-[8px] font-black uppercase text-slate-400 hover:border-cyan-500/30"
                      defaultValue=""
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        const slot = e.target.value;
                        if (!slot) return;
                        onCopyLiveAmbianceToPreset(cue.name, slot);
                        e.target.value = '';
                      }}
                    >
                      <option value="">→ P</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <option key={n} value={String(n)}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </Tooltip>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onGoCue(cue, index);
                    }}
                    className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                    title="GO cette cue"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReorderCue(cue.id, 'up');
                    }}
                    disabled={index === 0}
                    className="p-1 text-slate-500 hover:text-white disabled:opacity-30"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReorderCue(cue.id, 'down');
                    }}
                    disabled={index === cues.length - 1}
                    className="p-1 text-slate-500 hover:text-white disabled:opacity-30"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveCue(cue.id);
                    }}
                    className="p-1 text-slate-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </GlassCard>
  );
}

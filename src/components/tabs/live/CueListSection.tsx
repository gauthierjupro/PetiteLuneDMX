import React, { useState } from 'react';
import { ListOrdered, Play, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import type { ShowCue } from '../../../types';

interface CueListSectionProps {
  channels: number[];
  cues: ShowCue[];
  onAddCue: (name: string, channels: number[], fadeMs: number) => void;
  onRemoveCue: (id: string) => void;
  onReorderCue: (id: string, direction: 'up' | 'down') => void;
  onGoCue: (cue: ShowCue) => void;
}

export function CueListSection({
  channels,
  cues,
  onAddCue,
  onRemoveCue,
  onReorderCue,
  onGoCue,
}: CueListSectionProps) {
  const [newName, setNewName] = useState('');
  const [fadeMs, setFadeMs] = useState(0);

  const handleCapture = () => {
    onAddCue(newName, channels, fadeMs);
    setNewName('');
  };

  return (
    <GlassCard title="Cue list" icon={ListOrdered}>
      <div className="space-y-4">
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
            Capturer
          </button>
        </div>

        {cues.length === 0 ? (
          <p className="text-[10px] text-slate-600 font-bold uppercase text-center py-6">
            Aucune cue — capture l&apos;univers actuel puis GO en live
          </p>
        ) : (
          <ul className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {cues.map((cue, index) => (
              <li
                key={cue.id}
                className="flex items-center gap-2 p-2 bg-white/5 border border-white/5 rounded-xl"
              >
                <span className="text-[10px] font-mono text-slate-500 w-5">{index + 1}</span>
                <span className="flex-1 text-xs font-bold uppercase truncate">{cue.name}</span>
                <span className="text-[9px] text-slate-600 font-mono">{cue.fadeMs}ms</span>
                <button
                  type="button"
                  onClick={() => onGoCue(cue)}
                  className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                  title="GO"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onReorderCue(cue.id, 'up')}
                  disabled={index === 0}
                  className="p-1 text-slate-500 hover:text-white disabled:opacity-30"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onReorderCue(cue.id, 'down')}
                  disabled={index === cues.length - 1}
                  className="p-1 text-slate-500 hover:text-white disabled:opacity-30"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveCue(cue.id)}
                  className="p-1 text-slate-500 hover:text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </GlassCard>
  );
}

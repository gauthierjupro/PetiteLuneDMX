import React from 'react';
import { Bookmark } from 'lucide-react';
import { Tooltip } from '../../ui/Tooltip';
import type { MovementPreset } from '../../../types';
import { movementPresetHasData } from '../../../utils/movementPresetStorage';

export function MovementMemorySlots({
  presets,
  onLoad,
  onSave,
  compact = false,
}: {
  presets: MovementPreset[];
  onLoad: (index: number) => void;
  onSave: (index: number) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
      <p className="text-[7px] font-black uppercase text-slate-600 tracking-wide">
        Clic = rappel · Clic droit = enregistrer
      </p>
      <div className="grid grid-cols-4 gap-1">
        {presets.map((preset, index) => {
          const hasData = movementPresetHasData(preset);
          return (
            <Tooltip
              key={index}
              text={
                hasData
                  ? `${preset.label} — forme ${preset.shape} (clic droit pour mettre à jour)`
                  : `${preset.label} vide — clic droit pour mémoriser le mouvement actuel`
              }
            >
              <button
                type="button"
                onClick={() => onLoad(index)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onSave(index);
                }}
                className={`relative h-8 rounded-lg border text-[8px] font-black uppercase transition-all active:scale-95 flex items-center justify-center gap-0.5 ${
                  hasData
                    ? 'bg-purple-500/15 border-purple-400/40 text-purple-200 hover:bg-purple-500/25'
                    : 'bg-slate-800/60 border-white/5 text-slate-600 hover:border-white/15'
                }`}
              >
                {hasData && <Bookmark className="w-2.5 h-2.5 shrink-0 opacity-80" />}
                <span className="truncate px-0.5">{index + 1}</span>
              </button>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

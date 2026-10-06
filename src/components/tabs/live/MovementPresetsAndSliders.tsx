import React from 'react';
import { FlipHorizontal2, Link2 } from 'lucide-react';
import { ControlSlider } from '../../ui/ControlSlider';
import { Tooltip } from '../../ui/Tooltip';
import type {
  CustomTrajectory,
  GroupMovement,
  GroupCustomMovementSlotLinks,
  GroupQuickMovementSaves,
} from '../../../types';
import {
  DEFAULT_GROUP_MOVEMENT,
  type QuickMovementPresetId,
} from '../../../utils/movementQuickPresets';
import { MovementQuickPresetGrid } from './MovementQuickPresetGrid';

export interface MovementPresetsAndSlidersProps {
  config: GroupMovement;
  onApplyPreset: (id: QuickMovementPresetId) => void;
  onUpdate?: (patch: Partial<GroupMovement>) => void;
  presetMaxWidth?: number;
  movingHeadCount?: number;
  groupId?: string;
  quickSaves?: GroupQuickMovementSaves;
  customTrajectories?: CustomTrajectory[];
  customSlotLinks?: GroupCustomMovementSlotLinks;
  onSaveQuickPreset?: (id: QuickMovementPresetId) => boolean | void;
  onClearQuickPreset?: (id: QuickMovementPresetId) => void;
  onRenameQuickPreset?: (id: QuickMovementPresetId, currentLabel: string) => void;
  movementCenterLinked?: boolean;
  onMovementCenterLinkedChange?: (linked: boolean) => void;
  /** Live : rappel uniquement, sauvegarde dans la modale Mouvement & formes. */
  recallOnly?: boolean;
}

export function MovementPresetsAndSliders({
  config,
  onApplyPreset,
  onUpdate,
  presetMaxWidth,
  movingHeadCount = 1,
  groupId,
  quickSaves = {},
  customTrajectories = [],
  customSlotLinks = {},
  onSaveQuickPreset,
  onClearQuickPreset,
  onRenameQuickPreset,
  movementCenterLinked = true,
  onMovementCenterLinkedChange,
  recallOnly = false,
}: MovementPresetsAndSlidersProps) {
  const amplitude = Math.round(((config.sizePan ?? 64) + (config.sizeTilt ?? 64)) / 2);

  return (
    <div className="flex gap-3 items-stretch min-w-0 flex-1">
      {groupId ? (
        <MovementQuickPresetGrid
          config={config}
          groupId={groupId}
          onApplyPreset={onApplyPreset}
          quickSaves={quickSaves}
          customTrajectories={customTrajectories}
          customSlotLinks={customSlotLinks}
          onSaveQuickPreset={recallOnly ? undefined : onSaveQuickPreset}
          onClearQuickPreset={recallOnly ? undefined : onClearQuickPreset}
          onRenameQuickPreset={recallOnly ? undefined : onRenameQuickPreset}
          presetMaxWidth={presetMaxWidth}
          variant="compact"
          recallOnly={recallOnly}
        />
      ) : null}

      {!recallOnly ? (
      <div className="flex flex-col justify-center gap-3 min-w-[132px] flex-1 max-w-[200px]">
        <div>
          <div className="flex justify-between items-baseline text-[8px] font-black uppercase text-slate-500 mb-1">
            <span>Vitesse</span>
            <span className="text-blue-400 font-mono tabular-nums">
              {Math.round(((config.speed ?? 128) / 255) * 100)}%
            </span>
          </div>
          <ControlSlider
            label="Vitesse"
            hideHeader
            value={config.speed ?? DEFAULT_GROUP_MOVEMENT.speed}
            onChange={(v) => onUpdate?.({ speed: Number(v) })}
            color="bg-blue-500"
          />
        </div>
        <div>
          <div className="flex justify-between items-baseline text-[8px] font-black uppercase text-slate-500 mb-1">
            <span>Amplitude</span>
            <span className="text-cyan-400 font-mono tabular-nums">
              {Math.round((amplitude / 255) * 100)}%
            </span>
          </div>
          <ControlSlider
            label="Amplitude"
            hideHeader
            value={amplitude}
            onChange={(v) => {
              const n = Number(v);
              if (config.shape === 'rectangle') {
                const ratio =
                  (config.sizePan ?? 64) / Math.max(1, config.sizeTilt ?? 64);
                const tilt = Math.round(n / Math.sqrt((ratio * ratio + 1) / 2));
                const pan = Math.round(tilt * ratio);
                onUpdate?.({ sizePan: pan, sizeTilt: tilt });
              } else {
                onUpdate?.({ sizePan: n, sizeTilt: n });
              }
            }}
            color="bg-cyan-500"
          />
        </div>

        {movingHeadCount > 1 && onMovementCenterLinkedChange && (
          <Tooltip text="Lié : centre de forme commun. Désactivé : un centre par lyre (pad). Mémorisé avec le bouton trajectoire.">
            <button
              type="button"
              onClick={() => onMovementCenterLinkedChange(!movementCenterLinked)}
              className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg border text-[8px] font-black uppercase transition-all active:scale-95 ${
                movementCenterLinked
                  ? 'bg-red-500/15 border-red-500/40 text-red-300'
                  : 'bg-slate-800/80 border-white/10 text-slate-500 hover:border-white/20'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              Centre · {movementCenterLinked ? 'Lié' : 'Par lyre'}
            </button>
          </Tooltip>
        )}

        {movingHeadCount > 1 && (
          <div>
            <div className="flex justify-between items-baseline text-[8px] font-black uppercase text-slate-500 mb-1">
              <span>Écart lyres</span>
              <span className="text-indigo-300 font-mono tabular-nums">
                {Math.round(((config.fan ?? 0) / 255) * 100)}%
              </span>
            </div>
            <ControlSlider
              label="Écart lyres"
              hideHeader
              value={config.fan ?? DEFAULT_GROUP_MOVEMENT.fan}
              onChange={(v) => onUpdate?.({ fan: Number(v) })}
              color="bg-indigo-500"
            />
          </div>
        )}

        <Tooltip
          text={
            movingHeadCount > 1
              ? 'Lyres paires (2, 4…) : mouvement inversé — effet miroir gauche/droite.'
              : 'Utile avec au moins 2 lyres dans le groupe Patch.'
          }
        >
          <button
            type="button"
            onClick={() => onUpdate?.({ invert180: !config.invert180 })}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg border text-[8px] font-black uppercase transition-all active:scale-95 ${
              config.invert180
                ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                : 'bg-slate-800/80 border-white/10 text-slate-500 hover:border-white/20'
            }`}
          >
            <FlipHorizontal2 className="w-3.5 h-3.5" />
            Symétrie
          </button>
        </Tooltip>
      </div>
      ) : null}
    </div>
  );
}

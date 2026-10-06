import React from 'react';
import { Square, Settings2 } from 'lucide-react';
import { XYPad } from '../../ui/XYPad';
import type { GroupMovement } from '../../../types';
import { movementShapeLabel, type QuickMovementPresetId } from '../../../utils/movementQuickPresets';
import { MovementPresetsAndSliders } from './MovementPresetsAndSliders';
import type {
  CustomTrajectory,
  GroupCustomMovementSlotLinks,
  GroupQuickMovementSaves,
} from '../../../types';

export interface MovementSimpleControlsProps {
  groupId: string;
  fixtureIds: number[];
  config: GroupMovement;
  centerPan: number;
  centerTilt: number;
  onApplyPreset: (id: QuickMovementPresetId) => void;
  onUpdate: (patch: Partial<GroupMovement>) => void;
  onCenter: () => void;
  onPanTiltChange: (pan: number, tilt: number) => void;
  onOpenAdvanced?: () => void;
  compact?: boolean;
  movingHeadCount?: number;
  quickSaves?: GroupQuickMovementSaves;
  customTrajectories?: CustomTrajectory[];
  customSlotLinks?: GroupCustomMovementSlotLinks;
  onSaveQuickPreset?: (id: QuickMovementPresetId) => boolean | void;
  onClearQuickPreset?: (id: QuickMovementPresetId) => void;
  onRenameQuickPreset?: (id: QuickMovementPresetId, currentLabel: string) => void;
  movementCenterLinked?: boolean;
  onMovementCenterLinkedChange?: (linked: boolean) => void;
}

export function MovementSimpleControls({
  groupId,
  config,
  centerPan,
  centerTilt,
  onApplyPreset,
  onUpdate,
  onCenter,
  onPanTiltChange,
  onOpenAdvanced,
  compact = false,
  movingHeadCount = 1,
  quickSaves,
  customTrajectories,
  customSlotLinks,
  onSaveQuickPreset,
  onClearQuickPreset,
  onRenameQuickPreset,
  movementCenterLinked,
  onMovementCenterLinkedChange,
}: MovementSimpleControlsProps) {
  const active = config.shape ?? 'none';

  return (
    <div className={`space-y-4 ${compact ? '' : 'p-1'}`}>
      <p className="text-[11px] text-slate-400 leading-relaxed">
        Choisissez un mouvement, placez le{' '}
        <span className="text-cyan-400/90">centre</span> sur le pad, ajustez vitesse et amplitude.
        Actif :{' '}
        <span className="font-black text-blue-300">{movementShapeLabel(active)}</span>
      </p>

      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div className="shrink-0">
          <XYPad
            x={centerPan}
            y={centerTilt}
            onChange={onPanTiltChange}
            size={compact ? 140 : 200}
          />
          <p className="text-[9px] text-slate-600 mt-1 text-center">Centre du mouvement (pan / tilt)</p>
        </div>

        <div className="flex-1 min-w-0 w-full space-y-3">
          <MovementPresetsAndSliders
            config={config}
            onApplyPreset={onApplyPreset}
            onUpdate={onUpdate}
            movingHeadCount={movingHeadCount}
            groupId={groupId}
            quickSaves={quickSaves}
            customTrajectories={customTrajectories}
            customSlotLinks={customSlotLinks}
            onSaveQuickPreset={onSaveQuickPreset}
            onClearQuickPreset={onClearQuickPreset}
            onRenameQuickPreset={onRenameQuickPreset}
            movementCenterLinked={movementCenterLinked}
            onMovementCenterLinkedChange={onMovementCenterLinkedChange}
          />
          <button
            type="button"
            onClick={onCenter}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-800 border border-white/10 text-[10px] font-black uppercase text-slate-400 hover:text-white transition-colors"
          >
            <Square className="w-3.5 h-3.5" />
            Centre + arrêt
          </button>
        </div>
      </div>

      {onOpenAdvanced && (
        <button
          type="button"
          onClick={onOpenAdvanced}
          className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 hover:text-purple-400 transition-colors"
        >
          <Settings2 className="w-3.5 h-3.5" />
          Trajectoires custom, bibliothèque, presets…
        </button>
      )}
    </div>
  );
}

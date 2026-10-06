import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Edit2, Save, Trash2 } from 'lucide-react';
import type {
  CustomTrajectory,
  GroupMovement,
  GroupCustomMovementSlotLinks,
  GroupQuickMovementSaves,
} from '../../../types';
import {
  MOVEMENT_BUTTON_PRESETS,
  type QuickMovementPresetId,
} from '../../../utils/movementQuickPresets';
import { hasQuickMovementSave } from '../../../utils/movementQuickSaves';
import {
  getMovementPresetLink,
  isPersoSlotActive,
  isPersoSlotProgrammed,
  movementButtonLabel,
  movementButtonLabelForRename,
  rawLinkForPreset,
} from '../../../utils/movementCustomSlots';

export interface MovementQuickPresetGridProps {
  config: GroupMovement;
  groupId: string;
  onApplyPreset: (id: QuickMovementPresetId) => void;
  quickSaves?: GroupQuickMovementSaves;
  customTrajectories?: CustomTrajectory[];
  customSlotLinks?: GroupCustomMovementSlotLinks;
  onSaveQuickPreset?: (id: QuickMovementPresetId) => boolean | void;
  onClearQuickPreset?: (id: QuickMovementPresetId) => void;
  onRenameQuickPreset?: (id: QuickMovementPresetId, currentLabel: string) => void;
  variant?: 'compact' | 'comfortable';
  presetMaxWidth?: number;
  showHint?: boolean;
  recallOnly?: boolean;
}

export function MovementQuickPresetGrid({
  config,
  groupId,
  onApplyPreset,
  quickSaves = {},
  customTrajectories = [],
  customSlotLinks = {},
  onSaveQuickPreset,
  onClearQuickPreset,
  onRenameQuickPreset,
  variant = 'compact',
  presetMaxWidth,
  showHint = true,
  recallOnly = false,
}: MovementQuickPresetGridProps) {
  const [presetMenu, setPresetMenu] = useState<{
    id: QuickMovementPresetId;
    defaultLabel: string;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!presetMenu) return;
    const close = () => setPresetMenu(null);
    window.addEventListener('mousedown', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [presetMenu]);

  const contextMenuEnabled = Boolean(
    !recallOnly &&
      (onSaveQuickPreset || onClearQuickPreset || onRenameQuickPreset)
  );

  const btnClass =
    variant === 'comfortable'
      ? 'px-3 py-2.5 text-[10px] rounded-xl'
      : 'px-2 py-2 text-[8px] rounded-lg';

  const renderPresetButton = (
    id: QuickMovementPresetId,
    label: string,
    hint: string,
    active: boolean,
    memorized: boolean,
    programmed: boolean,
    defaultLabel: string
  ) => (
    <button
      key={id}
      type="button"
      title={
        recallOnly
          ? !programmed
            ? 'Inactif — programmer dans Mouvement & formes'
            : `${hint} — rappel${memorized ? ' (réglages mémorisés)' : ''}`
          : !programmed
            ? 'Clic droit : mémoriser le mouvement en cours'
            : `${hint} — clic gauche rappel · clic droit : menu`
      }
      onClick={() => {
        if (!programmed) return;
        onApplyPreset(id);
      }}
      onContextMenu={(e) => {
        if (!contextMenuEnabled) return;
        e.preventDefault();
        e.stopPropagation();
        setPresetMenu({
          id,
          defaultLabel,
          x: e.clientX,
          y: e.clientY,
        });
      }}
      className={`relative border font-black uppercase leading-tight transition-all truncate ${btnClass} ${
        !programmed
          ? 'opacity-45 cursor-context-menu bg-slate-900/90 border-white/5 text-slate-600 hover:border-violet-500/30'
          : active
            ? variant === 'comfortable'
              ? 'bg-blue-500 text-[#05070a] border-blue-400 shadow-[0_0_16px_rgba(59,130,246,0.25)] active:scale-95'
              : 'bg-blue-500/25 border-blue-400/50 text-blue-200 active:scale-95'
            : variant === 'comfortable'
              ? 'bg-slate-800/50 border-white/5 text-slate-400 hover:text-white hover:bg-slate-700/50 active:scale-95'
              : 'bg-slate-800/80 border-white/5 text-slate-500 hover:border-white/15 hover:text-slate-300 active:scale-95'
      } ${memorized && programmed ? 'ring-1 ring-purple-400/40' : ''}`}
    >
      {memorized && programmed && (
        <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-purple-400" />
      )}
      {programmed && !memorized && (
        <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-violet-400/80" />
      )}
      {label}
    </button>
  );

  const menuLink =
    presetMenu != null
      ? getMovementPresetLink(
          customSlotLinks,
          groupId,
          presetMenu.id,
          quickSaves
        )
      : undefined;
  const menuRawLink =
    presetMenu != null
      ? rawLinkForPreset(customSlotLinks, groupId, presetMenu.id)
      : undefined;
  const menuProgrammed = isPersoSlotProgrammed(menuLink);
  const menuMemorized =
    presetMenu != null && hasQuickMovementSave(quickSaves, groupId, presetMenu.id);
  const menuCanClear = menuMemorized || menuProgrammed;
  const menuRenameLabel =
    presetMenu != null
      ? movementButtonLabelForRename(
          presetMenu.defaultLabel,
          menuRawLink,
          menuLink,
          customTrajectories
        )
      : '';

  const presetContextMenu =
    presetMenu &&
    createPortal(
      <div
        className="fixed z-[200000] bg-[#1a1d23] border border-white/10 rounded-xl shadow-2xl p-1.5 min-w-[200px]"
        style={{ left: presetMenu.x, top: presetMenu.y }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {onSaveQuickPreset && (
          <button
            type="button"
            onClick={() => {
              const ok = onSaveQuickPreset(presetMenu.id);
              if (ok !== false) setPresetMenu(null);
            }}
            className="w-full text-left px-3 py-2 hover:bg-purple-500/20 text-purple-300 text-[10px] font-black uppercase rounded-lg flex items-center gap-2 transition-all"
          >
            <Save className="w-3 h-3 shrink-0" />
            Mémoriser
          </button>
        )}
        {onRenameQuickPreset && menuProgrammed && (
          <button
            type="button"
            onClick={() => {
              onRenameQuickPreset(presetMenu.id, menuRenameLabel);
              setPresetMenu(null);
            }}
            className="w-full text-left px-3 py-2 hover:bg-blue-500/20 text-blue-200 text-[10px] font-black uppercase rounded-lg flex items-center gap-2 transition-all"
          >
            <Edit2 className="w-3 h-3 shrink-0" />
            Renommer
          </button>
        )}
        {onClearQuickPreset && menuCanClear && (
          <>
            {(onSaveQuickPreset || (onRenameQuickPreset && menuProgrammed)) && (
              <div className="h-px bg-white/5 my-1" />
            )}
            <button
              type="button"
              onClick={() => {
                onClearQuickPreset(presetMenu.id);
                setPresetMenu(null);
              }}
              className="w-full text-left px-3 py-2 hover:bg-red-500/20 text-red-400 text-[10px] font-black uppercase rounded-lg flex items-center gap-2 transition-all"
            >
              <Trash2 className="w-3 h-3 shrink-0" />
              Supprimer
            </button>
          </>
        )}
      </div>,
      document.body
    );

  const hintClass =
    variant === 'comfortable'
      ? 'text-[9px] text-slate-500'
      : 'text-[7px] text-slate-600';

  return (
    <div
      className="space-y-1 shrink-0 min-w-0"
      style={presetMaxWidth ? { maxWidth: presetMaxWidth } : undefined}
    >
      {showHint && (
        <p className={`${hintClass} font-black uppercase tracking-wide leading-snug`}>
          {recallOnly
            ? 'Sauvegarde mouvements & positions → Mouvement & formes'
            : 'Bibliothèque → réglages → clic droit : mémoriser, renommer ou supprimer'}
        </p>
      )}
      <div
        className={
          variant === 'comfortable'
            ? 'grid grid-cols-3 sm:grid-cols-5 gap-2'
            : 'grid grid-cols-2 gap-1 content-start'
        }
      >
        {MOVEMENT_BUTTON_PRESETS.map((p) => {
          const rawLink = rawLinkForPreset(customSlotLinks, groupId, p.id);
          const link = getMovementPresetLink(
            customSlotLinks,
            groupId,
            p.id,
            quickSaves
          );
          const programmed = isPersoSlotProgrammed(link);
          const displayLabel = movementButtonLabel(
            p.label,
            rawLink,
            link,
            customTrajectories
          );
          return renderPresetButton(
            p.id,
            displayLabel,
            p.hint,
            programmed && isPersoSlotActive(config, link, customTrajectories),
            hasQuickMovementSave(quickSaves, groupId, p.id),
            programmed,
            p.label
          );
        })}
      </div>
      {presetContextMenu}
    </div>
  );
}

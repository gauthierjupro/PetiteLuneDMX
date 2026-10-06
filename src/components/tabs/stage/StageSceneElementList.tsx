import React from 'react';
import {
  Speaker,
  Volume2,
  Guitar,
  Mic2,
  Drum,
  Piano,
  Disc3,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import type { StageSceneElement, StageSceneElementKind } from '../../../types';
import {
  MAX_STAGE_SCENE_ELEMENTS,
  SCENE_ELEMENT_ADD_OPTIONS,
} from '../../../utils/stageSceneElements';
import { isStageAdditiveSelect } from '../../../utils/stageSelectionInput';

interface StageSceneElementListProps {
  elements: StageSceneElement[];
  selectedIds: string[];
  onSelect: (id: string, additive: boolean) => void;
  onToggleEnabled: (id: string) => void;
  onAdd: (kind: StageSceneElementKind) => void;
  onRemove: (id: string) => void;
}

export function sceneElementKindIcon(kind: StageSceneElementKind) {
  if (kind === 'wedge_monitor') {
    return (
      <Volume2
        className="w-3.5 h-3.5 shrink-0 text-emerald-400 -rotate-45"
        aria-hidden
      />
    );
  }
  if (kind === 'speaker_l' || kind === 'speaker_r' || kind === 'speaker') {
    return <Speaker className="w-3.5 h-3.5 shrink-0 text-amber-400" aria-hidden />;
  }
  if (kind === 'vocalist') return <Mic2 className="w-3.5 h-3.5 shrink-0 text-violet-300" />;
  if (kind === 'guitarist' || kind === 'bassist') {
    return <Guitar className="w-3.5 h-3.5 shrink-0 text-violet-300" />;
  }
  if (kind === 'drummer') return <Drum className="w-3.5 h-3.5 shrink-0 text-violet-300" />;
  if (kind === 'keyboardist') return <Piano className="w-3.5 h-3.5 shrink-0 text-violet-300" />;
  return <Disc3 className="w-3.5 h-3.5 shrink-0 text-cyan-400" />;
}

export function StageSceneElementList({
  elements,
  selectedIds,
  onSelect,
  onToggleEnabled,
  onAdd,
  onRemove,
}: StageSceneElementListProps) {
  const atMax = elements.length >= MAX_STAGE_SCENE_ELEMENTS;
  return (
    <div className="w-56 shrink-0 flex flex-col pl-stage-sidebar overflow-hidden max-h-[360px]">
      <div className="px-3 py-2 border-b border-[var(--pl-border)]">
        <p className="pl-stage-sidebar-title">Éléments scène</p>
        <p className="text-[8px] text-[var(--pl-muted)] font-bold uppercase">
          Clic · Ctrl/Shift+clic multi-sélection
        </p>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
        {elements.map((el) => {
          const selected = selectedIds.includes(el.id);
          const primary =
            selectedIds.length > 0 && selectedIds[selectedIds.length - 1] === el.id;
          return (
            <div
              key={el.id}
              className={`flex items-center gap-1 rounded-xl border transition-all ${
                primary
                  ? 'border-amber-500/50 bg-amber-500/10'
                  : selected
                    ? 'border-amber-500/25 bg-amber-500/5'
                    : 'border-transparent bg-transparent'
              }`}
            >
              <button
                type="button"
                onClick={() => onToggleEnabled(el.id)}
                className="p-2 text-[var(--pl-muted)] hover:text-[var(--pl-text)] shrink-0"
                title={el.enabled ? 'Masquer' : 'Afficher'}
              >
                {el.enabled ? (
                  <Eye className="w-3.5 h-3.5" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 opacity-40" />
                )}
              </button>
              <button
                type="button"
                onClick={(e) => onSelect(el.id, isStageAdditiveSelect(e))}
                className={`flex-1 flex items-center gap-2 py-2 pr-2 text-left min-w-0 ${
                  el.enabled ? 'text-[var(--pl-text)]' : 'text-[var(--pl-muted)] opacity-50'
                }`}
              >
                {sceneElementKindIcon(el.kind)}
                <span className="text-[10px] font-bold truncate">{el.name}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Supprimer « ${el.name} » ?`)) onRemove(el.id);
                }}
                className="p-2 text-slate-600 hover:text-red-400 shrink-0"
                title="Supprimer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
      {selectedIds.length > 1 && (
        <p className="px-3 py-1 text-[8px] font-black uppercase text-amber-500/90 border-t border-[var(--pl-border)]">
          {selectedIds.length} sélectionnés
        </p>
      )}
      <div className="p-2 border-t border-[var(--pl-border)] shrink-0">
        <select
          disabled={atMax}
          defaultValue=""
          onChange={(e) => {
            const kind = e.target.value as StageSceneElementKind;
            if (kind) onAdd(kind);
            e.target.value = '';
          }}
          className="pl-select w-full text-[8px] font-black uppercase disabled:opacity-40"
          title={atMax ? `Maximum ${MAX_STAGE_SCENE_ELEMENTS} éléments` : 'Ajouter un élément'}
        >
          <option value="">+ Ajouter…</option>
          {SCENE_ELEMENT_ADD_OPTIONS.map((opt) => (
            <option key={opt.kind} value={opt.kind}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

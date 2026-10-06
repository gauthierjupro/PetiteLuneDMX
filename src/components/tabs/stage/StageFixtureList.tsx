import React from 'react';
import { isStageAdditiveSelect } from '../../../utils/stageSelectionInput';
import { Sun, Move, Zap, Wind, List, Eye, EyeOff } from 'lucide-react';
import type { Fixture, Group, RgbColor, StageFixturePosition } from '../../../types';
import { findGroupForFixture, groupColorOrDefault, rgbColorToCss } from '../../../utils/stageGroups';
import { isStageFixtureVisible, sameFixtureId } from '../../../utils/stagePositions';

interface StageFixtureListProps {
  fixtures: Fixture[];
  groups: Group[];
  groupColors: Record<string, RgbColor>;
  positions: StageFixturePosition[];
  selectedIds: number[];
  primaryId: number | null;
  onSelect: (id: number, additive: boolean) => void;
  onToggleVisible: (id: number) => void;
}

function FixtureIcon({ type }: { type: string }) {
  if (type === 'RGB') return <Sun className="w-3.5 h-3.5 shrink-0" />;
  if (type === 'Moving Head') return <Move className="w-3.5 h-3.5 shrink-0" />;
  if (type === 'Laser') return <Zap className="w-3.5 h-3.5 shrink-0" />;
  if (type === 'Effect') return <Wind className="w-3.5 h-3.5 shrink-0" />;
  return <Sun className="w-3.5 h-3.5 shrink-0 opacity-40" />;
}

export function StageFixtureList({
  fixtures,
  groups,
  groupColors,
  positions,
  selectedIds,
  primaryId,
  onSelect,
  onToggleVisible,
}: StageFixtureListProps) {
  return (
    <div className="w-56 shrink-0 flex flex-col pl-stage-sidebar overflow-hidden">
      <div className="px-3 py-2.5 border-b border-[var(--pl-border)] flex items-center gap-2">
        <List className="w-4 h-4 text-cyan-500" />
        <div>
          <p className="pl-stage-sidebar-title">Projecteurs</p>
          <p className="text-[8px] text-[var(--pl-muted)] font-bold uppercase">
            Bordure = couleur groupe Live
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5 max-h-[calc(100vh-280px)]">
        {fixtures.length === 0 ? (
          <p className="text-[9px] text-slate-600 uppercase font-bold p-3 text-center">
            Aucun patch
          </p>
        ) : (
          fixtures.map((f) => {
            const selected = selectedIds.some((id) => Number(id) === Number(f.id));
            const primary = primaryId != null && Number(primaryId) === Number(f.id);
            const group = findGroupForFixture(groups, f.id);
            const dot = rgbColorToCss(groupColorOrDefault(groupColors, group?.id));
            const pos = positions.find((p) => sameFixtureId(p.id, f.id));
            const visible = pos ? isStageFixtureVisible(pos) : true;
            return (
              <div
                key={f.id}
                className={`flex items-center gap-1 rounded-xl border transition-all ${
                  primary
                    ? 'border-cyan-500/40 bg-cyan-500/10'
                    : selected
                      ? 'border-[var(--pl-border)] bg-[var(--pl-hover)]'
                      : 'border-transparent'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onToggleVisible(f.id)}
                  className="p-2 text-[var(--pl-muted)] hover:text-[var(--pl-text)] shrink-0"
                  title={visible ? 'Masquer sur le plan / 3D' : 'Afficher sur le plan / 3D'}
                >
                  {visible ? (
                    <Eye className="w-3.5 h-3.5" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 opacity-40" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={(e) => onSelect(f.id, isStageAdditiveSelect(e))}
                  className={`flex-1 flex items-center gap-2 py-2 pr-2 text-left min-w-0 transition-all ${
                    primary
                      ? 'pl-stage-list-item--primary'
                      : selected
                        ? 'pl-stage-list-item--selected'
                        : visible
                          ? 'pl-stage-list-item'
                          : 'text-[var(--pl-muted)] opacity-50'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0 border border-[var(--pl-border)]"
                    style={{ backgroundColor: dot }}
                    title={group?.name ?? 'Sans groupe'}
                  />
                  <FixtureIcon type={f.type} />
                  <span className="text-[10px] font-bold truncate flex-1">{f.name}</span>
                  <span className="text-[8px] font-mono text-[var(--pl-muted)] shrink-0">#{f.id}</span>
                </button>
              </div>
            );
          })
        )}
      </div>
      {selectedIds.length > 1 && (
        <div className="px-3 py-2 border-t border-[var(--pl-border)] text-[8px] font-black uppercase text-cyan-600">
          {selectedIds.length} sélectionnés
        </div>
      )}
    </div>
  );
}

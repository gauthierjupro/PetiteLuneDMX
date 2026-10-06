import React, { useEffect, useState } from 'react';
import type { Fixture, StageFixturePosition, StageSceneElement } from '../../../types';
import { clampPercent, snapPercent } from '../../../utils/stageSnap';

interface StageSelectionInspectorProps {
  fixture?: Fixture;
  fixturePosition?: StageFixturePosition;
  sceneElement?: StageSceneElement;
  snapEnabled: boolean;
  snapStep: number;
  snapStepY?: number;
  onFixtureChange: (id: number, patch: Partial<Omit<StageFixturePosition, 'id'>>) => void;
  onSceneElementChange: (id: string, patch: Partial<Omit<StageSceneElement, 'id' | 'kind'>>) => void;
}

function parseCoord(raw: string): number | null {
  const n = parseFloat(raw.replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  return n;
}

function CoordField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
}) {
  const [draft, setDraft] = useState(String(Math.round(value * 10) / 10));

  useEffect(() => {
    setDraft(String(Math.round(value * 10) / 10));
  }, [value]);

  const commit = () => {
    const n = parseCoord(draft);
    if (n == null) {
      setDraft(String(Math.round(value * 10) / 10));
      return;
    }
    onCommit(clampPercent(n));
  };

  return (
    <label className="flex items-center gap-1.5 min-w-0">
      <span className="text-[8px] font-black uppercase text-[var(--pl-muted)] w-3">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit();
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="w-12 bg-[var(--pl-input-bg)] border border-[var(--pl-border)] rounded-lg px-1.5 py-1 text-[10px] font-mono tabular-nums text-[var(--pl-text)]"
        title={`${label} sur le plan (0–100 %)`}
      />
    </label>
  );
}

export function StageSelectionInspector({
  fixture,
  fixturePosition,
  sceneElement,
  snapEnabled,
  snapStep,
  snapStepY: snapStepYProp,
  onFixtureChange,
  onSceneElementChange,
}: StageSelectionInspectorProps) {
  const snapStepY = snapStepYProp ?? snapStep;
  if (fixture && fixturePosition) {
    const id = Number(fixture.id);
    const apply = (patch: Partial<Omit<StageFixturePosition, 'id'>>) => {
      const next = { ...patch };
      if (next.x != null) next.x = snapPercent(next.x, snapStep, snapEnabled);
      if (next.y != null) next.y = snapPercent(next.y, snapStepY, snapEnabled);
      if (next.z != null) next.z = snapPercent(next.z, snapStep, snapEnabled);
      onFixtureChange(id, next);
    };
    return (
      <div className="w-56 shrink-0 pl-stage-sidebar px-3 py-2 border border-[var(--pl-border)] rounded-xl">
        <p className="pl-stage-sidebar-title truncate" title={fixture.name}>
          {fixture.name}
        </p>
        <p className="text-[8px] text-[var(--pl-muted)] font-bold uppercase mb-2">
          Position plan %
        </p>
        <div className="flex flex-wrap gap-x-2 gap-y-1.5">
          <CoordField label="X" value={fixturePosition.x ?? 50} onCommit={(x) => apply({ x })} />
          <CoordField label="Y" value={fixturePosition.y ?? 50} onCommit={(y) => apply({ y })} />
          <CoordField label="Z" value={fixturePosition.z ?? 50} onCommit={(z) => apply({ z })} />
        </div>
      </div>
    );
  }

  if (sceneElement) {
    const apply = (patch: Partial<Omit<StageSceneElement, 'id' | 'kind'>>) => {
      const next = { ...patch };
      if (next.x != null) next.x = snapPercent(next.x, snapStep, snapEnabled);
      if (next.y != null) next.y = snapPercent(next.y, snapStepY, snapEnabled);
      if (next.z != null) next.z = snapPercent(next.z, snapStep, snapEnabled);
      onSceneElementChange(sceneElement.id, next);
    };
    return (
      <div className="w-56 shrink-0 pl-stage-sidebar px-3 py-2 border border-[var(--pl-border)] rounded-xl">
        <p className="pl-stage-sidebar-title truncate" title={sceneElement.name}>
          {sceneElement.name}
        </p>
        <p className="text-[8px] text-[var(--pl-muted)] font-bold uppercase mb-2">
          Position plan %
        </p>
        <div className="flex flex-wrap gap-x-2 gap-y-1.5">
          <CoordField label="X" value={sceneElement.x} onCommit={(x) => apply({ x })} />
          <CoordField label="Y" value={sceneElement.y} onCommit={(y) => apply({ y })} />
          <CoordField label="Z" value={sceneElement.z} onCommit={(z) => apply({ z })} />
        </div>
      </div>
    );
  }

  return null;
}

interface StageMultiHeightInspectorProps {
  selectionLabel: string;
  snapEnabled: boolean;
  snapStep: number;
  onNudge: (deltaZ: number) => void;
  onSetAllZ: (z: number) => void;
}

/** Hauteur Z commune pour une multi-sélection (projecteurs ou éléments scène). */
export function StageMultiHeightInspector({
  selectionLabel,
  snapEnabled,
  snapStep,
  onNudge,
  onSetAllZ,
}: StageMultiHeightInspectorProps) {
  const step = snapEnabled ? snapStep : 1;
  const fine = 1;

  const [setAllDraft, setSetAllDraft] = useState('');

  const commitSetAll = () => {
    const n = parseCoord(setAllDraft);
    if (n == null) {
      setSetAllDraft('');
      return;
    }
    onSetAllZ(clampPercent(n));
    setSetAllDraft('');
  };

  return (
    <div className="w-56 shrink-0 pl-stage-sidebar px-3 py-2 border border-[var(--pl-border)] rounded-xl">
      <p className="pl-stage-sidebar-title truncate" title={selectionLabel}>
        {selectionLabel}
      </p>
      <p className="text-[8px] text-[var(--pl-muted)] font-bold uppercase mb-2">
        Hauteur Z · plan %
      </p>
      <div className="flex items-center gap-1 mb-2">
        <button
          type="button"
          className="px-2 py-1 rounded-lg text-[10px] font-black border border-[var(--pl-border)] bg-[var(--pl-input-bg)] text-[var(--pl-text)] hover:border-cyan-500/40"
          title={`Baisser (${step} % · Shift+clic ${fine} %)`}
          onClick={(e) => onNudge(-(e.shiftKey ? fine : step))}
        >
          Z−
        </button>
        <button
          type="button"
          className="px-2 py-1 rounded-lg text-[10px] font-black border border-[var(--pl-border)] bg-[var(--pl-input-bg)] text-[var(--pl-text)] hover:border-cyan-500/40"
          title={`Monter (${step} % · Shift+clic ${fine} %)`}
          onClick={(e) => onNudge(e.shiftKey ? fine : step)}
        >
          Z+
        </button>
      </div>
      <label className="flex items-center gap-1.5 min-w-0">
        <span className="text-[8px] font-black uppercase text-[var(--pl-muted)] shrink-0">
          Tous à
        </span>
        <input
          type="text"
          inputMode="decimal"
          placeholder="Z %"
          value={setAllDraft}
          onChange={(e) => setSetAllDraft(e.target.value)}
          onBlur={commitSetAll}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitSetAll();
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="flex-1 min-w-0 bg-[var(--pl-input-bg)] border border-[var(--pl-border)] rounded-lg px-1.5 py-1 text-[10px] font-mono tabular-nums text-[var(--pl-text)]"
          title="Appliquer la même hauteur Z (0–100 %) à toute la sélection"
        />
      </label>
      <p className="text-[8px] text-[var(--pl-muted)] mt-2 leading-tight">
        Page ↑ / ↓ · hauteur · Shift pas fin
      </p>
    </div>
  );
}

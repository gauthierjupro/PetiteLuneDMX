import { useCallback, useRef, useState } from 'react';
import type { StageFixturePosition, StageSceneElement } from '../types';

const MAX_UNDO = 25;

export type StageSceneUndoSnapshot = {
  positions: StageFixturePosition[];
  elements: StageSceneElement[];
};

function cloneSnapshot(
  positions: StageFixturePosition[],
  elements: StageSceneElement[]
): StageSceneUndoSnapshot {
  return {
    positions: positions.map((p) => ({ ...p })),
    elements: elements.map((el) => ({ ...el })),
  };
}

function cloneSnapshotDeep(snap: StageSceneUndoSnapshot): StageSceneUndoSnapshot {
  return cloneSnapshot(snap.positions, snap.elements);
}

export function useStageSceneUndo() {
  const undoStackRef = useRef<StageSceneUndoSnapshot[]>([]);
  const redoStackRef = useRef<StageSceneUndoSnapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncFlags = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  const pushSnapshot = useCallback(
    (positions: StageFixturePosition[], elements: StageSceneElement[]) => {
      undoStackRef.current = [
        ...undoStackRef.current,
        cloneSnapshot(positions, elements),
      ].slice(-MAX_UNDO);
      redoStackRef.current = [];
      syncFlags();
    },
    [syncFlags]
  );

  const undo = useCallback(
    (current: StageSceneUndoSnapshot): StageSceneUndoSnapshot | null => {
      const stack = undoStackRef.current;
      if (stack.length === 0) return null;
      const previous = stack[stack.length - 1]!;
      undoStackRef.current = stack.slice(0, -1);
      redoStackRef.current = [
        ...redoStackRef.current,
        cloneSnapshotDeep(current),
      ].slice(-MAX_UNDO);
      syncFlags();
      return cloneSnapshotDeep(previous);
    },
    [syncFlags]
  );

  const redo = useCallback(
    (current: StageSceneUndoSnapshot): StageSceneUndoSnapshot | null => {
      const stack = redoStackRef.current;
      if (stack.length === 0) return null;
      const next = stack[stack.length - 1]!;
      redoStackRef.current = stack.slice(0, -1);
      undoStackRef.current = [
        ...undoStackRef.current,
        cloneSnapshotDeep(current),
      ].slice(-MAX_UNDO);
      syncFlags();
      return cloneSnapshotDeep(next);
    },
    [syncFlags]
  );

  const clearUndo = useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    syncFlags();
  }, [syncFlags]);

  return { pushSnapshot, undo, redo, canUndo, canRedo, clearUndo };
};

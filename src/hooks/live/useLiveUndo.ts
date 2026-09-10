import { useCallback, useRef, useState } from 'react';
import type { GroupIntensity, RgbColor } from '../../types';

export interface LiveUndoSnapshot {
  masterDimmer: number;
  groupIntensities: Record<string, GroupIntensity>;
  groupColors: Record<string, RgbColor>;
  groupAutoColorActive: Record<string, boolean>;
  groupPulseActive: Record<string, boolean>;
}

const MAX_UNDO = 8;

/** Historique court pour annuler un preset / action Live (Ctrl+Z). */
export function useLiveUndo() {
  const stackRef = useRef<LiveUndoSnapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  const pushSnapshot = useCallback((snapshot: LiveUndoSnapshot) => {
    const next = [...stackRef.current, snapshot].slice(-MAX_UNDO);
    stackRef.current = next;
    setCanUndo(next.length > 0);
  }, []);

  const popSnapshot = useCallback((): LiveUndoSnapshot | null => {
    const stack = stackRef.current;
    if (stack.length === 0) {
      setCanUndo(false);
      return null;
    }
    const snap = stack[stack.length - 1];
    stackRef.current = stack.slice(0, -1);
    setCanUndo(stackRef.current.length > 0);
    return snap;
  }, []);

  const clearUndo = useCallback(() => {
    stackRef.current = [];
    setCanUndo(false);
  }, []);

  return { pushSnapshot, popSnapshot, canUndo, clearUndo };
}

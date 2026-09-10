import { useCallback, useEffect, useState } from 'react';
import type { Fixture, StageFixturePosition } from '../types';
import {
  STAGE_POSITIONS_EVENT,
  STAGE_POSITIONS_KEY,
  generateDefaultPositions,
  loadStagePositions,
  mergeStagePositions,
  persistStagePositions,
  sameFixtureId,
} from '../utils/stagePositions';

/**
 * Positions scène partagées 2D ↔ 3D (localStorage + événement même onglet).
 */
export function useStagePositions(fixtures: Fixture[]) {
  const [positions, setPositions] = useState<StageFixturePosition[]>(() =>
    loadStagePositions(fixtures)
  );

  useEffect(() => {
    setPositions(loadStagePositions(fixtures));
  }, [fixtures]);

  useEffect(() => {
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<StageFixturePosition[]>).detail;
      if (Array.isArray(detail)) {
        setPositions(mergeStagePositions(fixtures, detail));
      }
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key !== STAGE_POSITIONS_KEY || e.newValue == null) return;
      try {
        const saved = JSON.parse(e.newValue) as StageFixturePosition[];
        setPositions(mergeStagePositions(fixtures, saved));
      } catch {
        /* ignore */
      }
    };

    window.addEventListener(STAGE_POSITIONS_EVENT, onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(STAGE_POSITIONS_EVENT, onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, [fixtures]);

  const savePositions = useCallback((next: StageFixturePosition[]) => {
    setPositions(next);
    persistStagePositions(next);
  }, []);

  /** Met à jour l’état local sans écrire (ex. drag en cours). */
  const setPositionsLocal = useCallback((next: StageFixturePosition[]) => {
    setPositions(next);
  }, []);

  const updatePosition = useCallback(
    (
      id: number,
      patch: Partial<Omit<StageFixturePosition, 'id'>>
    ) => {
      setPositions((prev) => {
        const next = prev.map((p) =>
          sameFixtureId(p.id, id) ? { ...p, ...patch } : p
        );
        persistStagePositions(next);
        return next;
      });
    },
    []
  );

  const resetAllPositions = useCallback(() => {
    const defaults = generateDefaultPositions(fixtures);
    savePositions(defaults);
  }, [fixtures, savePositions]);

  const resetUnit = useCallback(
    (id: number, fixtureType?: string) => {
      setPositions((prev) => {
        const next = prev.map((p) =>
          sameFixtureId(p.id, id)
            ? {
                ...p,
                z: fixtureType === 'Moving Head' ? 0 : 100,
                rotationX: 0,
                rotationY: 0,
                beamShape: 'round' as const,
                beamWidth: 200,
              }
            : p
        );
        persistStagePositions(next);
        return next;
      });
    },
    []
  );

  return {
    positions,
    savePositions,
    setPositionsLocal,
    updatePosition,
    resetAllPositions,
    resetUnit,
  };
}

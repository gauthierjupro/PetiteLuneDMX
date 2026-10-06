import { useCallback, useEffect, useState } from 'react';
import type { StageLandmark } from '../types';
import {
  STAGE_LANDMARKS_EVENT,
  loadStageLandmarks,
  persistStageLandmarks,
  stripMusicianNamedLandmarks,
} from '../utils/stageLandmarks';

function loadLandmarksWithoutMusicianDuplicates(): StageLandmark[] {
  const saved = loadStageLandmarks();
  const next = stripMusicianNamedLandmarks(saved);
  if (next.length !== saved.length) {
    persistStageLandmarks(next);
  }
  return next;
}

export function useStageLandmarks() {
  const [landmarks, setLandmarks] = useState<StageLandmark[]>(() =>
    loadLandmarksWithoutMusicianDuplicates()
  );

  useEffect(() => {
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<StageLandmark[]>).detail;
      if (Array.isArray(detail)) setLandmarks(detail);
    };
    window.addEventListener(STAGE_LANDMARKS_EVENT, onCustom);
    return () => window.removeEventListener(STAGE_LANDMARKS_EVENT, onCustom);
  }, []);

  const saveLandmarks = useCallback((next: StageLandmark[]) => {
    setLandmarks(next);
    persistStageLandmarks(next);
  }, []);

  const updateLandmark = useCallback(
    (id: string, patch: Partial<Omit<StageLandmark, 'id'>>) => {
      setLandmarks((prev) => {
        const next = prev.map((l) => (l.id === id ? { ...l, ...patch } : l));
        persistStageLandmarks(next);
        return next;
      });
    },
    []
  );

  return { landmarks, saveLandmarks, updateLandmark, setLandmarksLocal: setLandmarks };
}

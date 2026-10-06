import { useCallback, useEffect, useState } from 'react';
import type { StageSceneElement } from '../types';
import type { StageSceneElementKind } from '../types';
import {
  STAGE_SCENE_ELEMENTS_EVENT,
  MAX_STAGE_SCENE_ELEMENTS,
  createSceneElement,
  loadStageSceneElements,
  persistStageSceneElements,
} from '../utils/stageSceneElements';

export function useStageSceneElements() {
  const [elements, setElements] = useState<StageSceneElement[]>(() =>
    loadStageSceneElements()
  );

  useEffect(() => {
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<StageSceneElement[]>).detail;
      if (Array.isArray(detail)) setElements(detail);
    };
    window.addEventListener(STAGE_SCENE_ELEMENTS_EVENT, onCustom);
    return () => window.removeEventListener(STAGE_SCENE_ELEMENTS_EVENT, onCustom);
  }, []);

  const saveElements = useCallback((next: StageSceneElement[]) => {
    setElements(next);
    persistStageSceneElements(next);
  }, []);

  const setElementsLocal = useCallback((next: StageSceneElement[]) => {
    setElements(next);
  }, []);

  const updateElement = useCallback(
    (id: string, patch: Partial<Omit<StageSceneElement, 'id' | 'kind'>>) => {
      setElements((prev) => {
        const next = prev.map((el) => (el.id === id ? { ...el, ...patch } : el));
        persistStageSceneElements(next);
        return next;
      });
    },
    []
  );

  const toggleEnabled = useCallback((id: string) => {
    setElements((prev) => {
      const next = prev.map((el) =>
        el.id === id ? { ...el, enabled: !el.enabled } : el
      );
      persistStageSceneElements(next);
      return next;
    });
  }, []);

  const addElement = useCallback((kind: StageSceneElementKind): string | null => {
    let newId: string | null = null;
    setElements((prev) => {
      if (prev.length >= MAX_STAGE_SCENE_ELEMENTS) return prev;
      const el = createSceneElement(kind, prev);
      newId = el.id;
      const next = [...prev, el];
      persistStageSceneElements(next);
      return next;
    });
    return newId;
  }, []);

  const removeElement = useCallback((id: string) => {
    setElements((prev) => {
      const next = prev.filter((el) => el.id !== id);
      persistStageSceneElements(next);
      return next;
    });
  }, []);

  return {
    elements,
    saveElements,
    setElementsLocal,
    updateElement,
    toggleEnabled,
    addElement,
    removeElement,
  };
}

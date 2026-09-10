import { useEffect } from 'react';

export interface LiveKeyboardActions {
  onBlackout: () => void;
  onTapTempo: () => void;
  onGoCue: () => void;
  onUndo?: () => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

/** Raccourcis Live (onglet actif uniquement). */
export function useLiveKeyboardShortcuts(enabled: boolean, actions: LiveKeyboardActions) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;

      const key = e.key.toLowerCase();

      if (key === 'b' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        actions.onBlackout();
        return;
      }
      if (key === 't' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        actions.onTapTempo();
        return;
      }
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        actions.onGoCue();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && key === 'z' && actions.onUndo) {
        e.preventDefault();
        actions.onUndo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, actions]);
}

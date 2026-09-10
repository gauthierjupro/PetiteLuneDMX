import { useCallback } from 'react';
import type { ShowCue } from '../types';
import { useJsonLocalStorage } from './useJsonLocalStorage';

const CUE_STORAGE_KEY = 'dmx_cue_list';

export function useCueList() {
  const [cues, setCues] = useJsonLocalStorage<ShowCue[]>(CUE_STORAGE_KEY, []);

  const addCueFromChannels = useCallback(
    (name: string, channels: number[], fadeMs: number) => {
      const cue: ShowCue = {
        id: `cue-${Date.now()}`,
        name: name.trim() || `Cue ${cues.length + 1}`,
        fadeMs: Math.max(0, fadeMs),
        channels: [...channels],
      };
      setCues((prev) => [...prev, cue]);
    },
    [cues.length, setCues]
  );

  const removeCue = useCallback(
    (id: string) => {
      setCues((prev) => prev.filter((c) => c.id !== id));
    },
    [setCues]
  );

  const reorderCue = useCallback(
    (id: string, direction: 'up' | 'down') => {
      setCues((prev) => {
        const idx = prev.findIndex((c) => c.id === id);
        if (idx < 0) return prev;
        const next = [...prev];
        const swap = direction === 'up' ? idx - 1 : idx + 1;
        if (swap < 0 || swap >= next.length) return prev;
        [next[idx], next[swap]] = [next[swap], next[idx]];
        return next;
      });
    },
    [setCues]
  );

  return { cues, addCueFromChannels, removeCue, reorderCue };
}

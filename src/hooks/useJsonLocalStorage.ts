import { useEffect, useState, Dispatch, SetStateAction } from 'react';
import { setLocalStorageJsonDebounced } from '../utils/localStorageDebounced';

const LS_DEBOUNCE_MS = 300;

/** État React synchronisé avec une clé localStorage (JSON, écriture debouncée). */
export function useJsonLocalStorage<T>(
  key: string,
  initialValue: T | (() => T)
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved != null) return JSON.parse(saved) as T;
    } catch (e) {
      console.warn(`localStorage invalide pour ${key}:`, e);
    }
    return typeof initialValue === 'function'
      ? (initialValue as () => T)()
      : initialValue;
  });

  useEffect(() => {
    setLocalStorageJsonDebounced(key, state, LS_DEBOUNCE_MS);
  }, [key, state]);

  return [state, setState];
}

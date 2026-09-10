const timers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingValues = new Map<string, string>();

/** Écriture localStorage différée (évite les rafales). */
export function setLocalStorageDebounced(
  key: string,
  value: string,
  delayMs = 300
): void {
  pendingValues.set(key, value);
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);
  timers.set(
    key,
    setTimeout(() => {
      const v = pendingValues.get(key);
      if (v != null) localStorage.setItem(key, v);
      timers.delete(key);
      pendingValues.delete(key);
    }, delayMs)
  );
}

export function setLocalStorageJsonDebounced(
  key: string,
  value: unknown,
  delayMs = 300
): void {
  setLocalStorageDebounced(key, JSON.stringify(value), delayMs);
}

/** Force l’écriture immédiate de toutes les clés en attente. */
export function flushDebouncedLocalStorage(): void {
  for (const [key, timer] of timers) {
    clearTimeout(timer);
    const v = pendingValues.get(key);
    if (v != null) localStorage.setItem(key, v);
  }
  timers.clear();
  pendingValues.clear();
}

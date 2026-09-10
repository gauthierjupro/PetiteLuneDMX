import { useCallback, useEffect, useState } from 'react';
import { setLocalStorageDebounced } from '../utils/localStorageDebounced';

export type AppTheme = 'dark' | 'light';
export type UiDensity = 'comfortable' | 'compact';

const THEME_KEY = 'pldmx_theme';
const DENSITY_KEY = 'pldmx_ui_density';
const MIDI_KEY = 'pldmx_midi_enabled';

function applyDom(theme: AppTheme, density: UiDensity) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.density = density;
}

export function useAppPreferences() {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    const s = localStorage.getItem(THEME_KEY);
    return s === 'light' ? 'light' : 'dark';
  });
  const [density, setDensityState] = useState<UiDensity>(() => {
    const s = localStorage.getItem(DENSITY_KEY);
    return s === 'compact' ? 'compact' : 'comfortable';
  });
  const [midiEnabled, setMidiEnabledState] = useState(() => {
    return localStorage.getItem(MIDI_KEY) === '1';
  });

  useEffect(() => {
    applyDom(theme, density);
  }, [theme, density]);

  const setTheme = useCallback((t: AppTheme) => {
    setThemeState(t);
    setLocalStorageDebounced(THEME_KEY, t);
  }, []);

  const setDensity = useCallback((d: UiDensity) => {
    setDensityState(d);
    setLocalStorageDebounced(DENSITY_KEY, d);
  }, []);

  const setMidiEnabled = useCallback((enabled: boolean) => {
    setMidiEnabledState(enabled);
    setLocalStorageDebounced(MIDI_KEY, enabled ? '1' : '0');
  }, []);

  return { theme, setTheme, density, setDensity, midiEnabled, setMidiEnabled };
}

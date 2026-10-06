import { useCallback, useEffect, useState } from 'react';
import { setLocalStorageDebounced } from '../utils/localStorageDebounced';

export type AppTheme = 'dark' | 'light';
export type UiDensity = 'comfortable' | 'compact';
/** Débutant = Live simplifié ; Régie = interface complète (cues, rythme, macros avancées). */
export type LiveProfile = 'beginner' | 'regie';

const THEME_KEY = 'pldmx_theme';
const DENSITY_KEY = 'pldmx_ui_density';
const MIDI_KEY = 'pldmx_midi_enabled';
const CONFIRM_BLACKOUT_KEY = 'pldmx_live_confirm_blackout';
const LIVE_COMPACT_KEY = 'pldmx_live_compact';
const LIVE_PROFILE_KEY = 'pldmx_live_profile';
const AUTO_LIVE_EASY_KEY = 'pldmx_auto_live_easy_mode';

export function applyAppPreferencesDom(theme: AppTheme, density: UiDensity) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.density = density;
}

/** Applique thème / densité depuis localStorage avant le premier rendu React. */
export function syncAppPreferencesDomFromStorage() {
  const theme: AppTheme =
    localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  const density: UiDensity =
    localStorage.getItem(DENSITY_KEY) === 'compact' ? 'compact' : 'comfortable';
  applyAppPreferencesDom(theme, density);
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
  const [liveConfirmBlackout, setLiveConfirmBlackoutState] = useState(() => {
    return localStorage.getItem(CONFIRM_BLACKOUT_KEY) === '1';
  });
  const [liveCompact, setLiveCompactState] = useState(() => {
    return localStorage.getItem(LIVE_COMPACT_KEY) === '1';
  });
  const [liveProfile, setLiveProfileState] = useState<LiveProfile>(() => {
    const s = localStorage.getItem(LIVE_PROFILE_KEY);
    return s === 'regie' ? 'regie' : 'beginner';
  });
  const [autoLiveEasyMode, setAutoLiveEasyModeState] = useState(() => {
    const s = localStorage.getItem(AUTO_LIVE_EASY_KEY);
    if (s === '1') return true;
    if (s === '0') return false;
    const profile = localStorage.getItem(LIVE_PROFILE_KEY);
    return profile !== 'regie';
  });

  useEffect(() => {
    applyAppPreferencesDom(theme, density);
  }, [theme, density]);

  const setTheme = useCallback((t: AppTheme) => {
    setThemeState(t);
    setLocalStorageDebounced(THEME_KEY, t);
    applyAppPreferencesDom(t, density);
  }, [density]);

  const setDensity = useCallback((d: UiDensity) => {
    setDensityState(d);
    setLocalStorageDebounced(DENSITY_KEY, d);
    applyAppPreferencesDom(theme, d);
  }, [theme]);

  const setMidiEnabled = useCallback((enabled: boolean) => {
    setMidiEnabledState(enabled);
    setLocalStorageDebounced(MIDI_KEY, enabled ? '1' : '0');
  }, []);

  const setLiveConfirmBlackout = useCallback((enabled: boolean) => {
    setLiveConfirmBlackoutState(enabled);
    setLocalStorageDebounced(CONFIRM_BLACKOUT_KEY, enabled ? '1' : '0');
  }, []);

  const setLiveCompact = useCallback((enabled: boolean) => {
    setLiveCompactState(enabled);
    setLocalStorageDebounced(LIVE_COMPACT_KEY, enabled ? '1' : '0');
  }, []);

  const setLiveProfile = useCallback((profile: LiveProfile) => {
    setLiveProfileState(profile);
    setLocalStorageDebounced(LIVE_PROFILE_KEY, profile);
  }, []);

  const setAutoLiveEasyMode = useCallback((enabled: boolean) => {
    setAutoLiveEasyModeState(enabled);
    setLocalStorageDebounced(AUTO_LIVE_EASY_KEY, enabled ? '1' : '0');
  }, []);

  return {
    theme,
    setTheme,
    density,
    setDensity,
    midiEnabled,
    setMidiEnabled,
    liveConfirmBlackout,
    setLiveConfirmBlackout,
    liveCompact,
    setLiveCompact,
    liveProfile,
    setLiveProfile,
    autoLiveEasyMode,
    setAutoLiveEasyMode,
  };
}

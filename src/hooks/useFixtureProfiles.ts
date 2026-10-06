import { useEffect, useState } from 'react';
import type { FixtureProfile } from '../types';
import { mergeBundledProfileUpdates } from '../utils/cameoWookie200R';

export function loadFixtureProfilesFromStorage(): FixtureProfile[] {
  try {
    const raw = localStorage.getItem('fixture_profiles');
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return mergeBundledProfileUpdates(parsed as FixtureProfile[]);
  } catch {
    return [];
  }
}

export function useFixtureProfiles(): FixtureProfile[] {
  const [profiles, setProfiles] = useState<FixtureProfile[]>(() =>
    loadFixtureProfilesFromStorage()
  );

  useEffect(() => {
    const refresh = () => setProfiles(loadFixtureProfilesFromStorage());
    window.addEventListener('storage', refresh);
    window.addEventListener('pldmx:fixture_profiles', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('pldmx:fixture_profiles', refresh);
    };
  }, []);

  return profiles;
}

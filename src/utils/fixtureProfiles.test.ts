import { describe, expect, it } from 'vitest';
import { parseFixtureProfilesImport, validateFixtureProfiles } from './fixtureProfiles';

const validProfile = {
  id: 'test_rgb',
  name: 'Test',
  manufacturer: 'M',
  model: 'X',
  channels: 1,
  type: 'RGB',
  channelDefs: [{ index: 1, name: 'Dim', type: 'dimmer' }],
};

describe('fixtureProfiles', () => {
  it('valide un profil correct', () => {
    const r = validateFixtureProfiles([validProfile]);
    expect(r.ok).toBe(true);
  });

  it('rejette un profil incomplet', () => {
    const r = validateFixtureProfiles([{ id: 'bad' }]);
    expect(r.ok).toBe(false);
  });

  it('parse un export { profiles: [] }', () => {
    const r = parseFixtureProfilesImport(
      JSON.stringify({ version: 1, profiles: [validProfile] })
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.profiles).toHaveLength(1);
  });
});

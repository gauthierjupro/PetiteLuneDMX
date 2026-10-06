import type { Fixture, Group } from '../types';

export type MovingHeadGroupKind = 'lyre' | 'scan_dynamo' | 'mixed' | 'generic';

const DYNAMO_MODEL = 'Dynamo Scan LED';
const PICO_MODEL = 'PicoSpot 20';

export function movingHeadGroupKind(group: Group, fixtures: Fixture[]): MovingHeadGroupKind {
  const models = group.fixtureIds
    .map((id) => fixtures.find((f) => f.id === id)?.model)
    .filter((m): m is string => Boolean(m));

  if (models.length === 0) return 'generic';

  const dynamoCount = models.filter((m) => m === DYNAMO_MODEL).length;
  const picoCount = models.filter((m) => m === PICO_MODEL).length;

  if (dynamoCount === models.length) return 'scan_dynamo';
  if (picoCount === models.length) return 'lyre';
  if (dynamoCount > 0 || picoCount > 0) return 'mixed';
  return 'generic';
}

export const MOVING_HEAD_KIND_BADGE: Record<
  Exclude<MovingHeadGroupKind, 'generic'>,
  { label: string; title: string; tone: 'blue' | 'orange' | 'slate' }
> = {
  lyre: {
    label: 'Lyre',
    title: 'Moving head type spot (ex. PicoSpot)',
    tone: 'blue',
  },
  scan_dynamo: {
    label: 'Scan Dynamo',
    title: 'Scanner BoomToneDJ Dynamo Scan LED',
    tone: 'orange',
  },
  mixed: {
    label: 'Lyres mixtes',
    title: 'Plusieurs modèles de moving heads dans ce groupe',
    tone: 'slate',
  },
};

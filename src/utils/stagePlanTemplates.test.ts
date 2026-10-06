import { describe, expect, it } from 'vitest';
import type { Fixture } from '../types';
import { applyStagePlanTemplate } from './stagePlanTemplates';

const fixtures: Fixture[] = [
  {
    id: 1,
    name: 'PAR 1',
    manufacturer: 'X',
    model: 'Y',
    address: 1,
    channels: 5,
    type: 'RGB',
  },
  {
    id: 2,
    name: 'Ly 1',
    manufacturer: 'X',
    model: 'Z',
    address: 10,
    channels: 16,
    type: 'Moving Head',
  },
];

describe('stagePlanTemplates', () => {
  it('place les lyres et PAR sur le modèle mobile T', () => {
    const { positions, sceneElements } = applyStagePlanTemplate(
      'mobile_stage_t',
      fixtures,
      []
    );
    const ly = positions.find((p) => p.id === 2);
    const par = positions.find((p) => p.id === 1);
    expect(ly?.y).toBeLessThan(par?.y ?? 100);
    expect(sceneElements.some((e) => e.kind === 'vocalist' && e.enabled)).toBe(true);
  });

  it('active le DJ sur le modèle compact', () => {
    const { sceneElements } = applyStagePlanTemplate('dj_compact', fixtures, []);
    const dj = sceneElements.find((e) => e.kind === 'dj_booth');
    expect(dj?.enabled).toBe(true);
  });
});

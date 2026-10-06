import { describe, expect, it } from 'vitest';
import {
  findTrajectoryByPoints,
  getLinkedTrajectory,
  getPersoSlotLink,
  inferPersoSlotLinkFromMovement,
  movementButtonLabel,
  trajectoryPointsEqual,
} from './movementCustomSlots';

describe('movementCustomSlots', () => {
  it('compare les points de trajectoire', () => {
    expect(
      trajectoryPointsEqual(
        [
          { x: 1, y: 2 },
          { x: 3, y: 4 },
        ],
        [
          { x: 1, y: 2 },
          { x: 3, y: 4 },
        ]
      )
    ).toBe(true);
    expect(
      trajectoryPointsEqual([{ x: 1, y: 2 }], [{ x: 1, y: 3 }])
    ).toBe(false);
  });

  it('retrouve une trajectoire par points', () => {
    const traj = {
      id: 'a',
      label: 'Test',
      points: [
        { x: 10, y: 20 },
        { x: 30, y: 40 },
      ],
    };
    expect(
      findTrajectoryByPoints([traj], [
        { x: 10, y: 20 },
        { x: 30, y: 40 },
      ])?.id
    ).toBe('a');
  });

  it('résout le lien slot → trajectoire', () => {
    const links = { g1: { custom_1: { trajectoryId: 't1' } } };
    const trajs = {
      g1: [{ id: 't1', label: 'Mon trajet', points: [{ x: 127, y: 127 }] }],
    };
    expect(getLinkedTrajectory(links, trajs, 'g1', 'custom_1')?.label).toBe(
      'Mon trajet'
    );
  });

  it('déduit le lien depuis le mouvement courant', () => {
    expect(
      inferPersoSlotLinkFromMovement(
        {
          shape: 'circle',
          speed: 100,
          sizePan: 50,
          sizeTilt: 50,
          fan: 0,
          invert180: false,
        },
        []
      )?.type
    ).toBe('shape');
    const traj = {
      id: 't2',
      label: 'Z',
      points: [{ x: 1, y: 2 }],
    };
    const link = inferPersoSlotLinkFromMovement(
      {
        shape: 'custom',
        customPoints: [{ x: 1, y: 2 }],
        speed: 100,
        sizePan: 50,
        sizeTilt: 50,
        fan: 0,
        invert180: false,
      },
      [traj]
    );
    expect(link?.type).toBe('trajectory');
    if (link?.type === 'trajectory') expect(link.trajectoryId).toBe('t2');
  });

  it('affiche un nom personnalisé sur le bouton', () => {
    expect(
      movementButtonLabel(
        'Cercle',
        { shapePresetId: 'circle_wide', displayName: 'Mon balayé' },
        { type: 'shape', presetId: 'circle_wide' },
        []
      )
    ).toBe('Mon balayé');
  });

  it('accepte une forme standard sur un Perso', () => {
    const links = { g1: { custom_2: { shapePresetId: 'circle_wide' } } };
    const link = getPersoSlotLink(links, 'g1', 'custom_2');
    expect(link?.type).toBe('shape');
    if (link?.type === 'shape') expect(link.presetId).toBe('circle_wide');
  });
});

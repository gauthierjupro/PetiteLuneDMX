import React from 'react';
import { useMotionPreviewDots } from '../../../hooks/useMotionPreviewDots';
import type { CalibrationSettings, Fixture, GroupMovement } from '../../../types';
import { getMovingHeadIds } from '../../../utils/groupPositionFixtures';
import { fixtureIsLyreControllable } from '../../../utils/autoLiveGroups';
import { CentreApercuPad } from './CentreApercuPad';

export function LyreCentreApercuBlock({
  fixtureIds,
  fixtures,
  channels,
  fixtureCalibration,
  config,
  groupPan,
  groupTilt,
  motionCenters,
  centerLinked,
  onMoveLinked,
  onMoveFixture,
  size = 140,
}: {
  fixtureIds: number[];
  fixtures: Fixture[];
  channels: number[];
  fixtureCalibration: Record<number, CalibrationSettings>;
  config: GroupMovement | undefined;
  groupPan: number;
  groupTilt: number;
  motionCenters: { pan: number; tilt: number }[];
  centerLinked: boolean;
  onMoveLinked: (pan: number, tilt: number) => void;
  onMoveFixture: (fixtureId: number, pan: number, tilt: number) => void;
  size?: number;
}) {
  const isLyre = (id: number) => {
    const f = fixtures.find((fx) => fx.id === id);
    return f != null && fixtureIsLyreControllable(f);
  };
  const movingHeadIds = getMovingHeadIds(fixtureIds, isLyre);
  const movement = config ?? {
    shape: 'none' as const,
    speed: 128,
    sizePan: 64,
    sizeTilt: 64,
    fan: 0,
    invert180: false,
  };
  const previewDots = useMotionPreviewDots(
    movement,
    motionCenters,
    movingHeadIds.length,
    movement.shape !== 'none'
  );

  return (
    <CentreApercuPad
      size={size}
      title
      movingHeadIds={movingHeadIds}
      fixtures={fixtures}
      channels={channels}
      fixtureCalibration={fixtureCalibration}
      linked={movingHeadIds.length < 2 ? true : centerLinked}
      onLinkedChange={() => {}}
      groupPan={groupPan}
      groupTilt={groupTilt}
      motionPreviewDots={previewDots.map((d) => ({
        pan: d.pan,
        tilt: d.tilt,
        index: d.index,
      }))}
      perHeadMovementCenters={motionCenters}
      onMoveLinked={onMoveLinked}
      onMoveFixture={onMoveFixture}
    />
  );
}

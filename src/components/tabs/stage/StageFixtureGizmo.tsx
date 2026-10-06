import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TransformControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import type { StageFixturePosition } from '../../../types';
import type { StageDecorSettings } from '../../../utils/stageDecorSettings';
import {
  eulerToStageRotation,
  stagePositionToWorld3D,
  stageRotationToEuler,
  world3DToStagePosition,
} from '../../../utils/stageWorld';
import * as THREE from 'three';

export type StageGizmoMode = 'off' | 'translate' | 'rotate';

export type StageGizmoPositionMapper = {
  toWorld: (
    p: StageFixturePosition,
    decor: StageDecorSettings
  ) => [number, number, number];
  fromWorld: (
    x: number,
    y: number,
    z: number,
    decor: StageDecorSettings
  ) => Partial<Omit<StageFixturePosition, 'id'>>;
};

interface StageFixtureGizmoProps {
  mode: StageGizmoMode;
  decor: StageDecorSettings;
  stagePos: StageFixturePosition | null;
  positionMapper?: StageGizmoPositionMapper;
  onDragStart?: () => void;
  onCommit: (patch: Partial<Omit<StageFixturePosition, 'id'>>) => void;
}

export function StageFixtureGizmo({
  mode,
  decor,
  stagePos,
  positionMapper,
  onDragStart,
  onCommit,
}: StageFixtureGizmoProps) {
  const groupRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<React.ComponentRef<typeof TransformControls>>(null);
  const [target, setTarget] = useState<THREE.Object3D | null>(null);
  const draggingRef = useRef(false);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;
  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;
  const orbit = useThree((s) => s.controls);

  const commitFromGroup = useCallback(() => {
    const g = groupRef.current;
    if (!g || !stagePos) return;
    const plan = positionMapper
      ? positionMapper.fromWorld(g.position.x, g.position.y, g.position.z, decor)
      : world3DToStagePosition(g.position.x, g.position.y, g.position.z, decor);
    if (modeRef.current === 'rotate') {
      const rot = eulerToStageRotation(g.rotation.x, g.rotation.y);
      onCommitRef.current({ ...plan, ...rot });
    } else {
      onCommitRef.current(plan);
    }
  }, [stagePos, decor, positionMapper]);

  useLayoutEffect(() => {
    const g = groupRef.current;
    if (!g || !stagePos || draggingRef.current) return;
    const [x, y, z] = positionMapper
      ? positionMapper.toWorld(stagePos, decor)
      : stagePositionToWorld3D(stagePos, decor);
    g.position.set(x, y, z);
    const [rx, ry, rz] = stageRotationToEuler(
      stagePos.rotationX,
      stagePos.rotationY
    );
    g.rotation.set(rx, ry, rz);
  }, [stagePos, mode, decor, positionMapper]);

  useEffect(() => {
    const tc = controlsRef.current as unknown as THREE.EventDispatcher | null;
    if (!tc || !orbit || !target || mode === 'off') return;

    const onDragging = (event: unknown) => {
      const value = Boolean((event as { value?: boolean }).value);
      draggingRef.current = value;
      if (orbit && 'enabled' in orbit) {
        (orbit as { enabled: boolean }).enabled = !value;
      }
      if (value) {
        onDragStartRef.current?.();
      } else {
        commitFromGroup();
      }
    };

    const onObjectChange = () => {
      if (draggingRef.current) commitFromGroup();
    };

    tc.addEventListener('dragging-changed', onDragging as () => void);
    tc.addEventListener('objectChange', onObjectChange as () => void);
    return () => {
      tc.removeEventListener('dragging-changed', onDragging as () => void);
      tc.removeEventListener('objectChange', onObjectChange as () => void);
    };
  }, [orbit, commitFromGroup, target, mode]);

  if (mode === 'off' || !stagePos) return null;

  return (
    <>
      <group
        ref={(node) => {
          groupRef.current = node;
          setTarget(node);
        }}
      >
        <mesh visible={false}>
          <boxGeometry args={[0.5, 0.3, 0.5]} />
        </mesh>
      </group>
      {target && (
        <TransformControls
          key={`${target.uuid}-${mode}`}
          ref={controlsRef}
          object={target}
          mode={mode === 'rotate' ? 'rotate' : 'translate'}
          space="world"
          size={0.85}
          showX
          showY
          showZ
        />
      )}
    </>
  );
}

import React, { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

export type StageCameraPreset = 'audience' | 'booth' | 'top' | 'iso';

export type StageCameraCommand =
  | { kind: 'preset'; preset: StageCameraPreset; tick: number }
  | { kind: 'focus'; target: THREE.Vector3; tick: number }
  | { kind: 'dolly'; scale: number; tick: number }
  | { kind: 'reset'; preset: StageCameraPreset; tick: number }
  | { kind: 'idle'; tick: number };

export type StageCameraRoom = {
  centerX: number;
  centerZ: number;
  front: number;
  height: number;
};

function presetTargets(room?: StageCameraRoom): Record<
  StageCameraPreset,
  { position: [number, number, number]; target: [number, number, number] }
> {
  const cx = room?.centerX ?? 0;
  const cz = room?.centerZ ?? 0;
  const front = room?.front ?? 40;
  const h = room?.height ?? 14;
  return {
    audience: {
      position: [cx, 2.8, front + 16],
      target: [cx, h * 0.25, cz - 2],
    },
    booth: { position: [cx, h * 0.85, -front * 0.55], target: [cx, 2, cz + 4] },
    top: { position: [cx, h * 2.6, cz + 0.01], target: [cx, 0, cz] },
    iso: { position: [cx + 22, h * 0.9, cz + 22], target: [cx, 2, cz] },
  };
}

export type StageCameraDistanceLimits = { min: number; max: number };

function dollyCamera(
  camera: THREE.PerspectiveCamera,
  controls: NonNullable<React.ComponentRef<typeof OrbitControls>>,
  scale: number,
  limits: StageCameraDistanceLimits
) {
  const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
  const dist = offset.length();
  if (dist < 1e-4) return;
  const next = THREE.MathUtils.clamp(dist * scale, limits.min, limits.max);
  offset.multiplyScalar(next / dist);
  camera.position.copy(controls.target).add(offset);
  controls.update();
}

interface Stage3DCameraRigProps {
  command: StageCameraCommand;
  room?: StageCameraRoom;
  distanceLimits?: StageCameraDistanceLimits;
}

export function Stage3DCameraRig({
  command,
  room,
  distanceLimits = { min: 2, max: 120 },
}: Stage3DCameraRigProps) {
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const { camera } = useThree();

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || command.kind === 'idle') return;

    if (command.kind === 'dolly') {
      dollyCamera(camera as THREE.PerspectiveCamera, controls, command.scale, distanceLimits);
      return;
    }

    if (command.kind === 'focus') {
      controls.target.copy(command.target);
      const offset = new THREE.Vector3(7, 5, 10);
      camera.position.copy(command.target).add(offset);
      controls.update();
      return;
    }

    if (command.kind === 'preset' || command.kind === 'reset') {
      const p = presetTargets(room)[command.preset];
      camera.position.set(...p.position);
      controls.target.set(...p.target);
      controls.update();
    }
  }, [command, camera, room, distanceLimits]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableZoom
      zoomSpeed={1.1}
      enablePan
      minPolarAngle={0}
      maxPolarAngle={Math.PI / 1.8}
      maxDistance={distanceLimits.max}
      minDistance={distanceLimits.min}
    />
  );
}

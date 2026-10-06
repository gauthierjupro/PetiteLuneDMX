import React, { useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

export type MusicianRole =
  | 'vocalist'
  | 'guitarist'
  | 'bassist'
  | 'drummer'
  | 'keyboardist';

const ROLE_LABEL: Record<MusicianRole, string> = {
  vocalist: 'Chant',
  guitarist: 'Guitare',
  bassist: 'Basse',
  drummer: 'Batterie',
  keyboardist: 'Claviers',
};

const SKIN = { color: '#94a3b8', roughness: 0.88, metalness: 0.02 };
const CLOTH = { color: '#475569', roughness: 0.92, metalness: 0.04 };
const CLOTH_ACCENT: Record<MusicianRole, string> = {
  vocalist: '#7c3aed',
  guitarist: '#b45309',
  bassist: '#1e40af',
  drummer: '#dc2626',
  keyboardist: '#0891b2',
};

function Limb({
  from,
  to,
  radius = 0.055,
  material,
}: {
  from: [number, number, number];
  to: [number, number, number];
  radius?: number;
  material: THREE.MeshStandardMaterialParameters;
}) {
  const { mid, len, quat } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    const length = dir.length();
    const midpoint = a.clone().add(b).multiplyScalar(0.5);
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return { mid: midpoint, len: length, quat: q };
  }, [from, to]);

  return (
    <mesh position={mid} quaternion={quat}>
      <cylinderGeometry args={[radius, radius * 0.92, len, 8]} />
      <meshStandardMaterial {...material} />
    </mesh>
  );
}

/** Silhouette debout ~1,55 m (repère scène). */
function StandingMusician({
  accent,
  pose = 'neutral',
}: {
  accent: string;
  pose?: 'neutral' | 'guitar' | 'vocal';
}) {
  const cloth = { ...CLOTH, color: accent };
  const headY = 1.48;
  const shoulderY = 1.22;
  const hipY = 0.78;
  const footY = 0.06;

  const leftHand: [number, number, number] =
    pose === 'guitar' ? [-0.22, 0.92, 0.18] : [-0.28, 1.02, 0.08];
  const rightHand: [number, number, number] =
    pose === 'guitar' ? [0.2, 0.88, 0.22] : pose === 'vocal' ? [0.12, 1.08, 0.28] : [0.28, 1.02, 0.08];

  return (
    <group>
      <mesh position={[0, headY, 0]}>
        <sphereGeometry args={[0.11, 12, 12]} />
        <meshStandardMaterial {...SKIN} />
      </mesh>
      <mesh position={[0, shoulderY - 0.12, 0]}>
        <boxGeometry args={[0.34, 0.42, 0.16]} />
        <meshStandardMaterial {...cloth} />
      </mesh>
      <Limb from={[-0.2, shoulderY, 0.02]} to={leftHand} material={SKIN} />
      <Limb from={[0.2, shoulderY, 0.02]} to={rightHand} material={SKIN} />
      <Limb from={[-0.1, hipY, 0]} to={[-0.11, footY, 0.04]} material={cloth} radius={0.06} />
      <Limb from={[0.1, hipY, 0]} to={[0.11, footY, 0.04]} material={cloth} radius={0.06} />
    </group>
  );
}

function SeatedDrummer({ accent }: { accent: string }) {
  const cloth = { ...CLOTH, color: accent };
  return (
    <group position={[0, 0.42, 0]}>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.14, 0.16, 0.08, 12]} />
        <meshStandardMaterial color="#64748b" metalness={0.35} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.1, 10, 10]} />
        <meshStandardMaterial {...SKIN} />
      </mesh>
      <mesh position={[0, 0.38, 0]}>
        <boxGeometry args={[0.32, 0.28, 0.2]} />
        <meshStandardMaterial {...cloth} />
      </mesh>
      <Limb from={[-0.18, 0.48, 0.12]} to={[-0.32, 0.35, 0.28]} material={SKIN} />
      <Limb from={[0.18, 0.48, 0.12]} to={[0.35, 0.38, 0.22]} material={SKIN} />
    </group>
  );
}

function MicStand() {
  return (
    <group position={[0, 0, 0.42]}>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.14, 0.16, 0.06, 10]} />
        <meshStandardMaterial color="#334155" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.018, 0.022, 1.05, 8]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.65} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.12, 0.06]} rotation={[0.35, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.35, 6]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.65} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.22, 0.18]}>
        <sphereGeometry args={[0.075, 12, 12]} />
        <meshStandardMaterial
          color="#e2e8f0"
          metalness={0.75}
          roughness={0.2}
          emissive="#64748b"
          emissiveIntensity={0.15}
        />
      </mesh>
    </group>
  );
}

function ElectricGuitar({ scale = 1, dark = false }: { scale?: number; dark?: boolean }) {
  const body = dark ? '#1e293b' : '#c2410c';
  const neck = dark ? '#0f172a' : '#78350f';
  return (
    <group scale={scale}>
      <mesh position={[0, 0, 0]} rotation={[0, 0, 0.15]}>
        <boxGeometry args={[0.38, 0.28, 0.06]} />
        <meshStandardMaterial color={body} roughness={0.55} metalness={0.12} />
      </mesh>
      <mesh position={[0, 0.08, 0.04]} rotation={[0, 0, 0.15]}>
        <cylinderGeometry args={[0.1, 0.11, 0.04, 16]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[0.02, 0.32, 0.02]} rotation={[0, 0, -0.72]}>
        <boxGeometry args={[0.06, 0.52, 0.025]} />
        <meshStandardMaterial color={neck} roughness={0.7} />
      </mesh>
      <mesh position={[0.08, 0.58, 0.03]} rotation={[0, 0, -0.72]}>
        <boxGeometry args={[0.14, 0.06, 0.03]} />
        <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.2} />
      </mesh>
    </group>
  );
}

function DrumKit() {
  return (
    <group position={[0, 0.08, 0]}>
      <mesh position={[0, 0.32, 0.05]} rotation={[0.1, 0, 0]}>
        <cylinderGeometry args={[0.42, 0.44, 0.38, 24]} />
        <meshStandardMaterial color="#334155" metalness={0.45} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.52, 0.05]} rotation={[0.1, 0, 0]}>
        <cylinderGeometry args={[0.38, 0.38, 0.03, 24]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.95} metalness={0} />
      </mesh>
      <mesh position={[-0.38, 0.38, 0.12]} rotation={[0, 0, 0.25]}>
        <cylinderGeometry args={[0.2, 0.2, 0.1, 20]} />
        <meshStandardMaterial color="#475569" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0.4, 0.4, 0.08]} rotation={[0, 0, -0.2]}>
        <cylinderGeometry args={[0.18, 0.18, 0.09, 20]} />
        <meshStandardMaterial color="#475569" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0.15, 0.55, -0.22]} rotation={[0.35, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.06, 20]} />
        <meshStandardMaterial color="#64748b" metalness={0.55} roughness={0.4} />
      </mesh>
      <mesh position={[-0.25, 0.72, -0.08]} rotation={[0.55, 0.2, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.012, 24]} />
        <meshStandardMaterial color="#eab308" metalness={0.7} roughness={0.25} />
      </mesh>
      <mesh position={[0.32, 0.78, -0.05]} rotation={[0.5, -0.15, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.012, 24]} />
        <meshStandardMaterial color="#eab308" metalness={0.7} roughness={0.25} />
      </mesh>
    </group>
  );
}

function KeyboardRig() {
  return (
    <group position={[0, 0, 0.35]} rotation={[0, -0.15, 0]}>
      <mesh position={[-0.35, 0.42, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.85, 6]} />
        <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0.35, 0.42, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.85, 6]} />
        <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.48, 0.05]} rotation={[-0.32, 0, 0]}>
        <boxGeometry args={[1.05, 0.1, 0.38]} />
        <meshStandardMaterial color="#1e293b" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.54, 0.05]} rotation={[-0.32, 0, 0]}>
        <boxGeometry args={[0.98, 0.025, 0.32]} />
        <meshStandardMaterial
          color="#0e7490"
          emissive="#06b6d4"
          emissiveIntensity={0.2}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[0, 0.56, 0.05]} rotation={[-0.32, 0, 0]}>
        <boxGeometry args={[0.92, 0.008, 0.26]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.3} />
      </mesh>
    </group>
  );
}

export function MusicianFigure({
  role,
  position,
  rotationY,
  label,
}: {
  role: MusicianRole;
  position: [number, number, number];
  rotationY: number;
  label?: string;
}) {
  const accent = CLOTH_ACCENT[role];
  const labelY = role === 'drummer' ? 1.35 : 1.72;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {role === 'drummer' ? (
        <>
          <SeatedDrummer accent={accent} />
          <DrumKit />
        </>
      ) : role === 'keyboardist' ? (
        <>
          <group position={[0, 0, -0.15]}>
            <StandingMusician accent={accent} pose="neutral" />
          </group>
          <KeyboardRig />
        </>
      ) : (
        <>
          <StandingMusician
            accent={accent}
            pose={role === 'vocalist' ? 'vocal' : role === 'guitarist' || role === 'bassist' ? 'guitar' : 'neutral'}
          />
          {role === 'vocalist' && <MicStand />}
          {role === 'guitarist' && (
            <group position={[0.08, 0.75, 0.12]} rotation={[0, 0.35, -0.55]}>
              <ElectricGuitar scale={1.05} />
            </group>
          )}
          {role === 'bassist' && (
            <group position={[-0.06, 0.72, 0.1]} rotation={[0, -0.25, 0.48]}>
              <ElectricGuitar scale={1.15} dark />
            </group>
          )}
        </>
      )}

      <Text
        position={[0, labelY, 0]}
        fontSize={0.26}
        color="#f1f5f9"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.018}
        outlineColor="#0f172a"
      >
        {label ?? ROLE_LABEL[role]}
      </Text>
    </group>
  );
}

import React from 'react';

/** Enceinte de retour couchée (wedge), orientée vers le public (+Z). */
export function StageWedgeMonitor3D() {
  const cabinet = '#1a1a1a';
  const grill = '#0f172a';
  const trim = '#334155';

  return (
    <group rotation={[-0.48, 0, 0]}>
      <mesh position={[0, 0.22, 0.04]} castShadow receiveShadow>
        <boxGeometry args={[0.52, 0.38, 0.44]} />
        <meshStandardMaterial color={cabinet} roughness={0.65} metalness={0.25} />
      </mesh>
      <mesh position={[0, 0.38, 0.18]} rotation={[-0.15, 0, 0]}>
        <boxGeometry args={[0.46, 0.22, 0.06]} />
        <meshStandardMaterial
          color={grill}
          roughness={0.85}
          metalness={0.15}
          emissive="#1e293b"
          emissiveIntensity={0.08}
        />
      </mesh>
      <mesh position={[0, 0.08, -0.12]}>
        <boxGeometry args={[0.48, 0.06, 0.08]} />
        <meshStandardMaterial color={trim} roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0.24, 0.12, -0.1]} rotation={[0, 0, -0.4]}>
        <boxGeometry args={[0.04, 0.14, 0.04]} />
        <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  );
}

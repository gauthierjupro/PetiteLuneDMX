import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { AudiencePlacement } from '../../../utils/stageAudienceLayout';

/** Silhouette debout ~1,55 m (pieds à y = 0). */
function createAudienceSilhouetteGeometry(): THREE.BufferGeometry {
  const skin = new THREE.SphereGeometry(0.11, 10, 10);
  skin.translate(0, 1.48, 0);

  const torso = new THREE.BoxGeometry(0.4, 0.5, 0.17);
  torso.translate(0, 1.1, 0);

  const leftLeg = new THREE.BoxGeometry(0.14, 0.76, 0.16);
  leftLeg.translate(-0.1, 0.38, 0);

  const rightLeg = new THREE.BoxGeometry(0.14, 0.76, 0.16);
  rightLeg.translate(0.1, 0.38, 0);

  const merged = mergeGeometries([skin, torso, leftLeg, rightLeg], true);
  if (merged) {
    merged.computeVertexNormals();
    return merged;
  }
  return torso;
}

export function StageAudienceCrowd3D({ placements }: { placements: AudiencePlacement[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => createAudienceSilhouetteGeometry(), []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    placements.forEach((p, i) => {
      dummy.position.set(p.x, 0, p.z);
      dummy.rotation.set(0, p.rotationY, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [placements]);

  if (placements.length === 0) return null;

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, placements.length]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color="#64748b"
        roughness={0.88}
        metalness={0.04}
        emissive="#334155"
        emissiveIntensity={0.06}
      />
    </instancedMesh>
  );
}

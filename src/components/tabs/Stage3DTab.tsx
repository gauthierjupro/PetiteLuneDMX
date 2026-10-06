import React, { useMemo, useRef, useState, useEffect, memo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Grid, Stars, Text, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import {
  Square,
  Layout,
  Box,
  Eye,
  EyeOff,
  Circle,
  RectangleHorizontal,
  RefreshCw,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Users,
  Monitor,
  Compass,
  Focus,
  Gauge,
  Music2,
  Speaker,
  Theater,
  Guitar,
  Move3d,
  Rotate3d,
  ZoomIn,
  ZoomOut,
  Scan,
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import type {
  BeamShape,
  Fixture,
  Group,
  RgbColor,
  StageFixturePosition,
  StageLandmark,
  StageSceneElement,
} from '../../types';
import { clampPercent } from '../../utils/stageSnap';
import {
  stageSceneElementToWorld3D,
  world3DToStageSceneElementPosition,
} from '../../utils/stageWorld';
import { findGroupForFixture, groupColorOrDefault } from '../../utils/stageGroups';
import { isStageAdditiveSelect } from '../../utils/stageSelectionInput';
import { useStagePositions } from '../../hooks/useStagePositions';
import { isStageFixtureVisible, sameFixtureId } from '../../utils/stagePositions';
import {
  clampBeamSpreadPercent,
  clampBeamVisualPercent,
  fixture3DBeamAngleRad,
  fixture3DPoolOpacity,
  fixture3DPoolRadiusM,
  fixture3DWashConeOpacity,
  inferFixture3DBeamStyle,
} from '../../utils/fixture3DVisual';
import {
  type StageDecorSettings,
  loadStageDecorSettings,
  saveStageDecorSettings,
  clampRoomHeightM,
  clampAudienceOffsetM,
  clampStagePlatformDepthM,
  clampStagePlatformWidthM,
  clampStageElevationM,
  setStageRoomDimensions,
  stageRoomBounds,
  stageRoomDimensionsMeters,
  stageDecorSettingsEqual,
} from '../../utils/stageDecorSettings';
import {
  StageLayoutDimensionFields,
  type StageLayoutDimensionPatch,
} from './stage/StageLayoutDimensionFields';
import {
  stageFloorHeightAt,
  stagePositionToWorld3D,
} from '../../utils/stageWorld';
import { normalizeStageDeckColor } from '../../utils/stageDeckColor';
import {
  Stage3DCameraRig,
  type StageCameraCommand,
  type StageCameraPreset,
} from './stage/Stage3DCameraRig';
import { StageSceneElements } from './stage/StageSceneElements';
import {
  StageFixtureGizmo,
  type StageGizmoPositionMapper,
  type StageGizmoMode,
} from './stage/StageFixtureGizmo';

interface Stage3DTabProps {
  fixtures: Fixture[];
  channels: number[];
  groups?: Group[];
  groupColors?: Record<string, RgbColor>;
  highlightGroupId?: string;
  landmarks?: StageLandmark[];
  sceneElements?: StageSceneElement[];
  selectedSceneElementIds?: string[];
  onSelectSceneElement?: (id: string, additive: boolean) => void;
  onSceneElementCommit?: (
    id: string,
    patch: Partial<Pick<StageSceneElement, 'x' | 'y' | 'z'>>
  ) => void;
  /** Sélection pilotée par l’onglet Scène (optionnel). */
  selectedFixtureId?: number | null;
  selectedIds?: number[];
  onSelectFixture?: (id: number, additive: boolean) => void;
  onClearSelection?: () => void;
  onGizmoDragStart?: () => void;
  /** false = Canvas monté mais rendu en pause (évite perte de contexte WebGL). */
  canvasActive?: boolean;
}

/** Force un frame après changement décor (frameloop never → always, contexte WebGL). */
function InvalidateOnDecorChange({
  settings,
  active,
}: {
  settings: StageDecorSettings;
  active: boolean;
}) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (active) invalidate();
  }, [settings, active, invalidate]);
  return null;
}

const StageLandmark3D = memo(function StageLandmark3D({
  lm,
  decor,
}: {
  lm: StageLandmark;
  decor: StageDecorSettings;
}) {
  const [xPos, yPos, zPos] = stagePositionToWorld3D(
    {
      id: 0,
      x: lm.x,
      y: lm.y,
      z: 0,
    },
    decor
  );
  return (
    <group position={[xPos, yPos, zPos]}>
      <mesh>
        <cylinderGeometry args={[0.2, 0.05, 0.45, 8]} />
        <meshStandardMaterial
          color="#e879f9"
          emissive="#c026d3"
          emissiveIntensity={0.45}
          metalness={0.2}
          roughness={0.6}
        />
      </mesh>
      <Text
        position={[0, 0.55, 0]}
        fontSize={0.32}
        color="#f5d0fe"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {lm.name}
      </Text>
    </group>
  );
});

type FixturePosition = StageFixturePosition;

function channelsSliceEqual(
  a: number[],
  b: number[],
  start: number,
  count: number
): boolean {
  for (let i = 0; i < count; i++) {
    if ((a[start + i] || 0) !== (b[start + i] || 0)) return false;
  }
  return true;
}

const BEAM_DIMMER_THRESHOLD = 0.02;

/** Gradateur 0–1 (plusieurs dispositions RGB / lyre). */
function fixtureDimmerNorm(
  fixture: Fixture,
  channels: number[],
  start: number
): number {
  const ch = (i: number) => (channels[start + i] ?? 0) / 255;
  if (fixture.type === 'Moving Head') {
    return Math.max(ch(5), ch(7));
  }
  if (fixture.type === 'RGB') {
    return Math.max(ch(0), ch(3), ch(4));
  }
  if (fixture.type === 'Effect') {
    return ch(0);
  }
  return ch(0);
}

function positionEqual(a: FixturePosition, b: FixturePosition): boolean {
  return (
    a.x === b.x &&
    a.y === b.y &&
    a.z === b.z &&
    a.rotationX === b.rotationX &&
    a.rotationY === b.rotationY &&
    a.beamShape === b.beamShape &&
    a.beamWidth === b.beamWidth &&
    a.beamSpread === b.beamSpread &&
    a.beamVisual === b.beamVisual
  );
}

const Fixture3D = memo(
  function Fixture3D({
    fixture,
    position,
    channels,
    isSelected,
    onSelect,
    dimmed = false,
    accentRgb,
    decor,
  }: {
    fixture: Fixture;
    position: FixturePosition;
    channels: number[];
    isSelected: boolean;
    onSelect: (id: number, additive: boolean) => void;
    dimmed?: boolean;
    accentRgb?: RgbColor;
    decor: StageDecorSettings;
  }) {
    const meshRef = useRef<THREE.Group>(null);
    const headRef = useRef<THREE.Group>(null);
    const start = fixture.address - 1;

    const beamStyle = useMemo(() => inferFixture3DBeamStyle(fixture), [fixture]);

    const lightData = useMemo(() => {
      const color = new THREE.Color(1, 1, 1);
      let intensity = 0;
      const angle = fixture3DBeamAngleRad(beamStyle);
      let pan = 0;
      let tilt = 0;
      const dimmerNorm = fixtureDimmerNorm(fixture, channels, start);
      const beamActive = dimmerNorm > BEAM_DIMMER_THRESHOLD;

      if (fixture.type === 'RGB') {
        const dimOnFirstChannel =
          (channels[start] || 0) >= (channels[start + 3] || 0);
        const rgbOff = dimOnFirstChannel ? 1 : 0;
        const r = (channels[start + rgbOff] || 0) / 255;
        const g = (channels[start + rgbOff + 1] || 0) / 255;
        const b = (channels[start + rgbOff + 2] || 0) / 255;
        if (r + g + b < 0.01) color.setRGB(1, 1, 1);
        else color.setRGB(r, g, b);
        intensity = dimmerNorm * 18;
      } else if (fixture.type === 'Moving Head') {
        intensity = dimmerNorm * 25;
        pan = ((channels[start] || 127) - 127) * (Math.PI / 127) * 1.5;
        tilt = ((channels[start + 2] || 127) - 127) * (Math.PI / 2 / 127);
      } else if (fixture.type === 'Effect') {
        color.setRGB(1, 0.8, 0.4);
        intensity = dimmerNorm * 15;
      } else {
        intensity = dimmerNorm * 12;
      }

      const dimMul = dimmed ? 0.25 : 1;
      const scaledIntensity = beamActive ? intensity * dimMul : 0;
      return {
        color,
        intensity: scaledIntensity,
        beamActive,
        angle,
        pan,
        tilt,
      };
    }, [channels, fixture, start, dimmed, beamStyle]);

    const accentColor = useMemo(() => {
      if (!accentRgb) return '#64748b';
      return `rgb(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b})`;
    }, [accentRgb]);

    useFrame(() => {
      if (beamStyle === 'moving_spot') {
        const basePan = (position.rotationY || 0) * (Math.PI / 180);
        const baseTilt = (position.rotationX || 0) * (Math.PI / 180);
        if (meshRef.current) meshRef.current.rotation.y = -lightData.pan - basePan;
        if (headRef.current) headRef.current.rotation.x = lightData.tilt + baseTilt;
      } else if (meshRef.current) {
        meshRef.current.rotation.y = -(position.rotationY || 0) * (Math.PI / 180);
        meshRef.current.rotation.x = (position.rotationX || 0) * (Math.PI / 180);
      }
    });

    const zVal = position.z ?? 100;
    const [xPos, yPos, zPos] = stagePositionToWorld3D(position, decor);
    const room = stageRoomBounds(decor);
    const floorY = stageFloorHeightAt(xPos, zPos, decor);
    const dropToFloorM = Math.max(0.35, yPos - floorY);
    const heightPercent = zVal;
    const isOnGround = heightPercent < 10;
    const isMovingSpot = beamStyle === 'moving_spot';
    const beamShape: BeamShape = isMovingSpot
      ? position.beamShape || 'round'
      : beamStyle === 'bar'
        ? 'rect'
        : 'square';
    const beamWidthFactor = (position.beamWidth || 200) / 100;
    const spreadFactor = clampBeamSpreadPercent(position.beamSpread) / 100;
    const visualFactor = clampBeamVisualPercent(position.beamVisual) / 100;
    const poolRadius =
      fixture3DPoolRadiusM(beamStyle, dropToFloorM, room.width, room.depth) *
      spreadFactor;
    const poolOpacity = fixture3DPoolOpacity(beamStyle) * visualFactor;
    const washConeOpacity = fixture3DWashConeOpacity(beamStyle) * visualFactor;
    const spotBeamScale = spreadFactor;
    const poolLocalY = -dropToFloorM + 0.02;
    const label = `${fixture.name.split(' ')[0]} #${fixture.id}`;

    return (
      <group
        position={[xPos, yPos, zPos]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(fixture.id, isStageAdditiveSelect(e));
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {!isOnGround ? (
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.3]} />
            <meshStandardMaterial
              color={isSelected ? '#06b6d4' : '#333'}
              metalness={0.9}
              roughness={0.1}
              emissive={isSelected ? '#06b6d4' : '#000'}
              emissiveIntensity={isSelected ? 0.5 : 0}
            />
          </mesh>
        ) : (
          <mesh position={[0, -0.1, 0]}>
            <boxGeometry args={[0.6, 0.05, 0.6]} />
            <meshStandardMaterial
              color={isSelected ? '#06b6d4' : '#475569'}
              metalness={0.8}
              roughness={0.2}
              emissive={isSelected ? '#06b6d4' : '#000'}
              emissiveIntensity={isSelected ? 0.3 : 0}
            />
          </mesh>
        )}

        <group ref={meshRef} rotation={isOnGround ? [Math.PI, 0, 0] : [0, 0, 0]}>
          {lightData.beamActive && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, poolLocalY, 0]}>
              {isMovingSpot && beamShape === 'round' ? (
                <circleGeometry args={[poolRadius, 28]} />
              ) : isMovingSpot && beamShape === 'square' ? (
                <planeGeometry args={[poolRadius * 1.4, poolRadius * 1.4]} />
              ) : isMovingSpot ? (
                <planeGeometry args={[1.0 * beamWidthFactor, 0.3]} />
              ) : beamStyle === 'bar' ? (
                <planeGeometry args={[1.6 * beamWidthFactor, poolRadius * 0.85]} />
              ) : (
                <circleGeometry args={[poolRadius, 32]} />
              )}
              <meshBasicMaterial
                color={lightData.color}
                transparent
                opacity={poolOpacity}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          )}

          {isMovingSpot ? (
            <>
              {lightData.beamActive && (
                <mesh scale={[1.1, 1.1, 1.1]}>
                  <boxGeometry args={[beamShape === 'rect' ? 1.2 : 0.4, 0.2, 0.4]} />
                  <meshBasicMaterial
                    color="#ff0000"
                    side={THREE.BackSide}
                    transparent
                    opacity={0.5}
                  />
                </mesh>
              )}

              <mesh>
                <boxGeometry args={[beamShape === 'rect' ? 1.2 : 0.4, 0.2, 0.4]} />
                <meshStandardMaterial
                  color={isSelected ? '#0e7490' : accentColor}
                  metalness={0.9}
                  roughness={0.1}
                  emissive={isSelected ? '#0891b2' : '#111'}
                  emissiveIntensity={isSelected ? 0.2 : 0.1}
                />
              </mesh>

              <group ref={headRef}>
                {lightData.beamActive && (
                  <mesh position={[0, -0.2, 0]} scale={[1.15, 1.15, 1.15]}>
                    {beamShape === 'rect' ? (
                      <boxGeometry args={[1.0, 0.2, 0.3]} />
                    ) : (
                      <sphereGeometry args={[0.22, 12, 12]} />
                    )}
                    <meshBasicMaterial
                      color="#ff0000"
                      side={THREE.BackSide}
                      transparent
                      opacity={0.4}
                    />
                  </mesh>
                )}

                <mesh position={[0, -0.2, 0]}>
                  {beamShape === 'rect' ? (
                    <boxGeometry args={[1.0, 0.2, 0.3]} />
                  ) : (
                    <sphereGeometry args={[0.22, 12, 12]} />
                  )}
                  <meshStandardMaterial
                    color={isSelected ? '#0891b2' : '#333'}
                    metalness={1}
                    roughness={0}
                    emissive={isSelected ? '#06b6d4' : '#1a1a1a'}
                    emissiveIntensity={isSelected ? 0.4 : 0.2}
                  />
                </mesh>

                <mesh position={[0, -0.32, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  {beamShape === 'rect' ? (
                    <boxGeometry args={[0.9, 0.05, 0.2]} />
                  ) : (
                    <torusGeometry args={[0.12, 0.02, 8, 16]} />
                  )}
                  <meshBasicMaterial color={lightData.beamActive ? lightData.color : '#444'} />
                </mesh>

                {lightData.beamActive && (
                  <spotLight
                    position={[0, -0.1, 0]}
                    angle={lightData.angle * spotBeamScale}
                    penumbra={0.1}
                    intensity={lightData.intensity * 4 * visualFactor}
                    color={lightData.color}
                    castShadow={false}
                    target-position={[0, -10, 0]}
                  />
                )}

                {lightData.beamActive && (
                  <group>
                    <mesh position={[0, -2.5, 0]}>
                      {beamShape === 'round' && (
                        <coneGeometry
                          args={[lightData.angle * 5.2 * spotBeamScale, 5, 16, 1, true]}
                        />
                      )}
                      {beamShape === 'square' && (
                        <cylinderGeometry
                          args={[0, lightData.angle * 5.2 * spotBeamScale, 5, 4, 1, true]}
                        />
                      )}
                      {beamShape === 'rect' && (
                        <boxGeometry args={[1.0 * beamWidthFactor, 5, 0.3]} />
                      )}
                      <meshBasicMaterial
                        color={lightData.color}
                        transparent
                        opacity={Math.min(
                          beamShape === 'round' ? 0.6 : 0.3,
                          lightData.intensity * 0.05
                        )}
                        depthWrite={false}
                        side={THREE.DoubleSide}
                      />
                    </mesh>

                    <mesh position={[0, -0.15, 0]}>
                      <sphereGeometry args={[0.15, 12, 12]} />
                      <meshBasicMaterial color={lightData.color} />
                    </mesh>
                  </group>
                )}
              </group>
            </>
          ) : (
            <>
              {beamStyle === 'bar' ? (
                <mesh>
                  <boxGeometry args={[1.55, 0.22, 0.34]} />
                  <meshStandardMaterial
                    color={isSelected ? '#0e7490' : '#1e293b'}
                    metalness={0.85}
                    roughness={0.25}
                    emissive={isSelected ? '#0891b2' : '#0f172a'}
                    emissiveIntensity={isSelected ? 0.25 : 0.08}
                  />
                </mesh>
              ) : beamStyle === 'flood' ? (
                <mesh>
                  <boxGeometry args={[0.95, 0.12, 0.72]} />
                  <meshStandardMaterial
                    color={isSelected ? '#0e7490' : '#334155'}
                    metalness={0.7}
                    roughness={0.35}
                    emissive={isSelected ? '#0891b2' : '#111'}
                    emissiveIntensity={isSelected ? 0.2 : 0.06}
                  />
                </mesh>
              ) : (
                <mesh position={[0, 0.06, 0]}>
                  <cylinderGeometry args={[0.28, 0.34, 0.3, 18]} />
                  <meshStandardMaterial
                    color={isSelected ? '#0e7490' : accentColor}
                    metalness={0.88}
                    roughness={0.15}
                    emissive={isSelected ? '#0891b2' : '#111'}
                    emissiveIntensity={isSelected ? 0.22 : 0.1}
                  />
                </mesh>
              )}

              <mesh position={[0, beamStyle === 'par_wash' ? -0.1 : -0.08, 0]}>
                {beamStyle === 'bar' ? (
                  <boxGeometry args={[1.45, 0.04, 0.28]} />
                ) : (
                  <boxGeometry args={[beamStyle === 'flood' ? 0.88 : 0.5, 0.03, beamStyle === 'flood' ? 0.66 : 0.48]} />
                )}
                <meshStandardMaterial
                  color="#111"
                  emissive={lightData.beamActive ? lightData.color : '#222'}
                  emissiveIntensity={lightData.beamActive ? 0.55 : 0.15}
                  metalness={0.2}
                  roughness={0.4}
                />
              </mesh>

              {lightData.beamActive && (
                <group>
                  <mesh position={[0, -dropToFloorM / 2, 0]}>
                    {beamStyle === 'bar' ? (
                      <boxGeometry
                        args={[
                          Math.min(1.5 * beamWidthFactor, poolRadius * 1.1),
                          dropToFloorM,
                          Math.min(0.55, poolRadius * 0.35),
                        ]}
                      />
                    ) : (
                      <cylinderGeometry
                        args={[poolRadius * 0.92, 0.1, dropToFloorM, 24, 1, true]}
                      />
                    )}
                    <meshBasicMaterial
                      color={lightData.color}
                      transparent
                      opacity={Math.min(
                        washConeOpacity,
                        washConeOpacity + lightData.intensity * 0.008
                      )}
                      depthWrite={false}
                      side={THREE.DoubleSide}
                    />
                  </mesh>
                </group>
              )}
            </>
          )}
        </group>

        <Text
          position={[0, 0.6, 0]}
          fontSize={0.15}
          color={isSelected ? '#06b6d4' : '#555'}
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>

        {isSelected && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, poolLocalY + 0.03, 0]}>
            <ringGeometry args={[0.4, 0.5, 24]} />
            <meshBasicMaterial color="#06b6d4" transparent opacity={0.5} />
          </mesh>
        )}
      </group>
    );
  },
  (prev, next) => {
    if (prev.isSelected !== next.isSelected) return false;
    if (prev.dimmed !== next.dimmed) return false;
    if (prev.accentRgb?.r !== next.accentRgb?.r) return false;
    if (prev.accentRgb?.g !== next.accentRgb?.g) return false;
    if (prev.accentRgb?.b !== next.accentRgb?.b) return false;
    if (prev.fixture.id !== next.fixture.id) return false;
    if (prev.fixture.address !== next.fixture.address) return false;
    if (prev.fixture.type !== next.fixture.type) return false;
    if (prev.fixture.name !== next.fixture.name) return false;
    if (prev.fixture.model !== next.fixture.model) return false;
    if (prev.fixture.manufacturer !== next.fixture.manufacturer) return false;
    if (!positionEqual(prev.position, next.position)) return false;
    return channelsSliceEqual(
      prev.channels,
      next.channels,
      next.fixture.address - 1,
      next.fixture.channels
    );
  }
);

const WALL_MAT = {
  color: '#4a5d73',
  roughness: 0.85,
  metalness: 0.05,
  emissive: '#1e293b',
  emissiveIntensity: 0.35,
};

const FLOOR_MAT = {
  color: '#334155',
  roughness: 0.9,
  metalness: 0.02,
  emissive: '#0f172a',
  emissiveIntensity: 0.2,
};

function WallPlane({
  position,
  rotation,
  width,
  height,
  opacity = 1,
  dimmer = false,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  width: number;
  height: number;
  opacity?: number;
  dimmer?: boolean;
}) {
  const geo = useMemo(() => new THREE.PlaneGeometry(width, height), [width, height]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo]);

  return (
    <group position={position} rotation={rotation ?? [0, 0, 0]}>
      <mesh geometry={geo} receiveShadow>
        <meshStandardMaterial
          {...WALL_MAT}
          color={dimmer ? '#3d4f62' : WALL_MAT.color}
          transparent={opacity < 1}
          opacity={opacity}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#94a3b8" transparent opacity={0.55} />
      </lineSegments>
    </group>
  );
}

const StageDecor = memo(function StageDecor({ settings }: { settings: StageDecorSettings }) {
  const room = stageRoomBounds(settings);
  const { L, R, back, front, width: wallW, depth: wallD, centerX: cx, centerZ: cz } = room;
  const wallH = room.height;
  const wallY = wallH / 2;

  const floorOutlineLine = useMemo(() => {
    const y = 0.06;
    const pts = [
      new THREE.Vector3(-L, y, -back),
      new THREE.Vector3(R, y, -back),
      new THREE.Vector3(R, y, front),
      new THREE.Vector3(-L, y, front),
      new THREE.Vector3(-L, y, -back),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: '#22d3ee',
      transparent: true,
      opacity: 0.35,
    });
    return new THREE.Line(geo, mat);
  }, [L, R, back, front]);

  return (
    <group>
      {settings.showFloor && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[cx, -0.08, cz]}
          receiveShadow
        >
          <boxGeometry args={[wallW, wallD, 0.15]} />
          <meshStandardMaterial {...FLOOR_MAT} side={THREE.DoubleSide} />
        </mesh>
      )}

      {settings.showFloor && <primitive object={floorOutlineLine} />}

      {settings.showWalls && (
        <group>
          <WallPlane position={[cx, wallY, -back]} width={wallW} height={wallH} />
          <WallPlane
            position={[-L, wallY, cz]}
            rotation={[0, Math.PI / 2, 0]}
            width={wallD}
            height={wallH}
          />
          <WallPlane
            position={[R, wallY, cz]}
            rotation={[0, -Math.PI / 2, 0]}
            width={wallD}
            height={wallH}
          />
          {settings.showPublicWall && (
            <WallPlane
              position={[cx, wallY, front]}
              rotation={[0, Math.PI, 0]}
              width={wallW}
              height={wallH}
            />
          )}
        </group>
      )}

      {settings.showCeiling && (
        <mesh position={[cx, wallH, cz]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[wallW, wallD]} />
          <meshStandardMaterial
            color="#475569"
            roughness={0.95}
            metalness={0}
            emissive="#1e293b"
            emissiveIntensity={0.25}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

    </group>
  );
});

export const Stage3DTab = ({
  fixtures,
  channels,
  groups = [],
  groupColors = {},
  highlightGroupId,
  landmarks = [],
  sceneElements = [],
  selectedSceneElementIds = [],
  onSelectSceneElement,
  onSceneElementCommit,
  selectedFixtureId: selectedFixtureIdProp,
  selectedIds: selectedIdsProp,
  onSelectFixture,
  onClearSelection,
  onGizmoDragStart,
  canvasActive = true,
}: Stage3DTabProps) => {
  const [gizmoMode, setGizmoMode] = useState<StageGizmoMode>('translate');
  const [selectedFixtureIdLocal, setSelectedFixtureIdLocal] = useState<number | null>(null);
  const controlled = onSelectFixture != null;
  const selectedFixtureId = controlled
    ? (selectedFixtureIdProp ?? null)
    : selectedFixtureIdLocal;
  const setSelectedFixtureId = controlled
    ? (id: number | null) => {
        if (id == null) onClearSelection?.();
        else onSelectFixture!(id, false);
      }
    : setSelectedFixtureIdLocal;

  const fixtureIsSelected = (id: number) => {
    if (selectedIdsProp?.length) {
      return selectedIdsProp.some((x) => sameFixtureId(x, id));
    }
    return selectedFixtureId != null && sameFixtureId(selectedFixtureId, id);
  };

  const handleSelect = (id: number, additive: boolean) => {
    if (onSelectFixture) onSelectFixture(id, additive);
    else if (additive) {
      setSelectedFixtureIdLocal((prev) =>
        prev != null && sameFixtureId(prev, id) ? null : id
      );
    } else setSelectedFixtureIdLocal(id);
  };
  const [roomPanelOpen, setRoomPanelOpen] = useState(false);
  const [perfMode, setPerfMode] = useState(false);
  const [cameraCommand, setCameraCommand] = useState<StageCameraCommand>({
    kind: 'idle',
    tick: 0,
  });
  const lastCameraPresetRef = useRef<StageCameraPreset>('iso');
  const {
    positions,
    updatePosition,
    resetAllPositions,
    resetUnit,
  } = useStagePositions(fixtures);

  const [decorSettings, setDecorSettings] = useState<StageDecorSettings>(() =>
    loadStageDecorSettings()
  );
  const decorSaveFromSelf = useRef(false);

  useEffect(() => {
    decorSaveFromSelf.current = true;
    saveStageDecorSettings(decorSettings);
  }, [decorSettings]);

  useEffect(() => {
    const refresh = () => {
      if (decorSaveFromSelf.current) {
        decorSaveFromSelf.current = false;
        return;
      }
      const loaded = loadStageDecorSettings();
      setDecorSettings((prev) => (stageDecorSettingsEqual(prev, loaded) ? prev : loaded));
    };
    window.addEventListener('pldmx:stage_decor', refresh);
    return () => window.removeEventListener('pldmx:stage_decor', refresh);
  }, []);

  useEffect(() => {
    if (controlled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedFixtureIdLocal(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [controlled]);

  useEffect(() => {
    if (
      selectedFixtureId != null &&
      !fixtures.some((f) => sameFixtureId(f.id, selectedFixtureId))
    ) {
      setSelectedFixtureId(null);
    }
  }, [fixtures, selectedFixtureId]);

  const applyCameraPreset = (preset: StageCameraPreset) => {
    lastCameraPresetRef.current = preset;
    setCameraCommand({ kind: 'preset', preset, tick: Date.now() });
  };

  const dollyCamera = (scale: number) => {
    setCameraCommand({ kind: 'dolly', scale, tick: Date.now() });
  };

  const resetCameraView = () => {
    setCameraCommand({
      kind: 'reset',
      preset: lastCameraPresetRef.current,
      tick: Date.now(),
    });
  };

  const primarySceneElementId =
    selectedSceneElementIds.length > 0
      ? selectedSceneElementIds[selectedSceneElementIds.length - 1]
      : null;

  const selectedSceneElement = useMemo(
    () =>
      primarySceneElementId
        ? sceneElements.find((el) => el.id === primarySceneElementId)
        : undefined,
    [sceneElements, primarySceneElementId]
  );

  const sceneGizmoStagePos = useMemo((): StageFixturePosition | null => {
    if (!selectedSceneElement) return null;
    return {
      id: 0,
      x: selectedSceneElement.x,
      y: selectedSceneElement.y,
      z: selectedSceneElement.z,
    };
  }, [selectedSceneElement]);

  const sceneGizmoPositionMapper = useMemo((): StageGizmoPositionMapper | undefined => {
    if (!selectedSceneElement) return undefined;
    const kind = selectedSceneElement.kind;
    return {
      toWorld: (p, decor) =>
        stageSceneElementToWorld3D(
          { kind, x: p.x ?? 50, y: p.y ?? 50, z: p.z ?? 0 },
          decor
        ),
      fromWorld: (x, y, z, decor) =>
        world3DToStageSceneElementPosition(x, y, z, kind, decor),
    };
  }, [selectedSceneElement]);

  const focusPrimarySelection = () => {
    if (selectedFixtureId != null) {
      const pos = positions.find((p) => sameFixtureId(p.id, selectedFixtureId));
      if (!pos) return;
      const [x, y, z] = stagePositionToWorld3D(pos, decorSettings);
      setCameraCommand({
        kind: 'focus',
        target: new THREE.Vector3(x, y, z),
        tick: Date.now(),
      });
      return;
    }
    if (selectedSceneElement) {
      const [x, y, z] = stageSceneElementToWorld3D(selectedSceneElement, decorSettings);
      setCameraCommand({
        kind: 'focus',
        target: new THREE.Vector3(x, y + 0.85, z),
        tick: Date.now(),
      });
    }
  };

  const toggleSetting = (key: keyof StageDecorSettings) => {
    if (typeof decorSettings[key] === 'boolean') {
      setDecorSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const roomDimensionsM = useMemo(
    () => stageRoomDimensionsMeters(decorSettings),
    [decorSettings]
  );

  const applyRoomSize3d = (widthM: number, depthM: number) => {
    setDecorSettings((prev) => setStageRoomDimensions(prev, widthM, depthM));
  };

  const patchLayout3d = (patch: StageLayoutDimensionPatch) => {
    setDecorSettings((prev) => {
      let next = { ...prev, ...patch };
      if (patch.stageDeckColor != null) {
        next.stageDeckColor = normalizeStageDeckColor(patch.stageDeckColor);
      }
      if (patch.roomHeight != null) {
        next.roomHeight = clampRoomHeightM(patch.roomHeight);
      }
      if (patch.stageElevationM != null) {
        next.stageElevationM = clampStageElevationM(patch.stageElevationM);
      }
      if (patch.stageWidthM != null) {
        next.stageWidthM = clampStagePlatformWidthM(patch.stageWidthM, next);
      }
      if (patch.stageDepthM != null) {
        next.stageDepthM = clampStagePlatformDepthM(patch.stageDepthM, next);
      }
      if (patch.audienceOffsetM != null) {
        next.audienceOffsetM = clampAudienceOffsetM(patch.audienceOffsetM, next);
      }
      next.audienceOffsetM = clampAudienceOffsetM(next.audienceOffsetM, next);
      return next;
    });
  };

  const applyFogDensity = (value: number) => {
    if (!Number.isFinite(value)) return;
    const v = Math.min(100, Math.max(0, Math.round(value)));
    setDecorSettings((prev) => ({ ...prev, fogDensity: v }));
  };

  const selectedFixture = useMemo(
    () => fixtures.find((f) => sameFixtureId(f.id, selectedFixtureId ?? -1)),
    [fixtures, selectedFixtureId]
  );

  const selectedPos = useMemo(
    () => positions.find((p) => sameFixtureId(p.id, selectedFixtureId ?? -1)),
    [positions, selectedFixtureId]
  );

  const selectedPanelBeamStyle = useMemo(
    () => (selectedFixture ? inferFixture3DBeamStyle(selectedFixture) : 'moving_spot'),
    [selectedFixture]
  );

  const fixtureGizmoActive =
    selectedFixtureId != null &&
    !perfMode &&
    !!selectedPos &&
    isStageFixtureVisible(selectedPos);

  const sceneGizmoActive =
    !fixtureGizmoActive && !perfMode && primarySceneElementId != null && !!selectedSceneElement;

  const gizmoModeForTarget = fixtureGizmoActive
    ? gizmoMode
    : sceneGizmoActive
      ? gizmoMode === 'rotate'
        ? 'translate'
        : gizmoMode
      : 'off';

  const hasGizmoTarget = fixtureGizmoActive || sceneGizmoActive;

  const cameraRoom = useMemo(() => {
    const b = stageRoomBounds(decorSettings);
    return {
      centerX: b.centerX,
      centerZ: b.centerZ,
      front: b.front,
      height: b.height,
    };
  }, [decorSettings]);

  const cameraDistanceLimits = useMemo(() => {
    const b = stageRoomBounds(decorSettings);
    const span = Math.max(b.width, b.depth, b.height, 10);
    return { min: 1.5, max: Math.max(80, span * 3.2) };
  }, [decorSettings]);

  const fogNear = 6 + decorSettings.fogDensity * 0.12;
  const fogFar = 45 + (100 - decorSettings.fogDensity) * 0.55;

  return (
    <div className="h-full min-h-[420px] w-full flex gap-4">
      <div className="pl-scene-dark flex-1 bg-[#020408] rounded-[2.5rem] overflow-hidden relative border border-white/5 shadow-2xl">
        <Canvas
          className="absolute inset-0 z-0"
          shadows={false}
          dpr={perfMode ? [1, 1] : [1, 1.5]}
          frameloop={canvasActive ? 'always' : 'never'}
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
            stencil: false,
            preserveDrawingBuffer: false,
          }}
          onCreated={({ gl }) => {
            const canvas = gl.domElement;
            canvas.addEventListener('webglcontextlost', (e) => {
              e.preventDefault();
              console.warn('WebGL context lost — la vue 3D peut être réinitialisée.');
            });
            canvas.addEventListener('webglcontextrestored', () => {
              gl.resetState();
            });
          }}
          onPointerMissed={() => {
            if (onClearSelection) onClearSelection();
            else setSelectedFixtureIdLocal(null);
          }}
        >
          <PerspectiveCamera makeDefault position={[0, 8, 18]} fov={45} />
          <InvalidateOnDecorChange settings={decorSettings} active={canvasActive} />
          <Stage3DCameraRig
            command={cameraCommand}
            room={cameraRoom}
            distanceLimits={cameraDistanceLimits}
          />

          <color attach="background" args={['#121a28']} />
          <fog attach="fog" args={['#121a28', fogNear, fogFar]} />
          {!perfMode && (
            <Stars
              radius={100}
              depth={50}
              count={400}
              factor={2.5}
              saturation={0}
              fade
              speed={0.3}
            />
          )}

          <hemisphereLight intensity={0.9} groundColor="#1e293b" color="#e2e8f0" />
          <ambientLight intensity={0.65} />
          <directionalLight
            position={[12, 22, 14]}
            intensity={1.1}
            color="#f8fafc"
          />
          <directionalLight position={[-10, 8, -8]} intensity={0.35} color="#94a3b8" />
          <pointLight position={[0, 14, 0]} intensity={1.8} color="#fff" distance={60} decay={2} />
          <pointLight position={[0, 4, 18]} intensity={1.2} color="#e0f2fe" distance={50} decay={2} />

          <StageDecor settings={decorSettings} />
          <StageSceneElements
            settings={decorSettings}
            sceneElements={sceneElements}
            selectedSceneElementIds={selectedSceneElementIds}
            onSelectSceneElement={onSelectSceneElement}
          />

          {decorSettings.showFloor && (() => {
            const b = stageRoomBounds(decorSettings);
            return (
              <Grid
                infiniteGrid
                fadeDistance={Math.max(b.width, b.depth) * 1.2}
                fadeStrength={4}
                cellSize={1}
                sectionSize={5}
                sectionColor="#64748b"
                cellColor="#475569"
                position={[b.centerX, 0.02, b.centerZ]}
              />
            );
          })()}

          {landmarks.map((lm) => (
            <StageLandmark3D key={lm.id} lm={lm} decor={decorSettings} />
          ))}

          {fixtures.map((fixture) => {
            const pos =
              positions.find((p) => sameFixtureId(p.id, fixture.id)) || {
                id: fixture.id,
                x: 50,
                y: 50,
                z: 100,
              };
            if (!isStageFixtureVisible(pos)) {
              return null;
            }
            const group = findGroupForFixture(groups, fixture.id);
            const dimmed =
              !!highlightGroupId && (!group || group.id !== highlightGroupId);
            const accent = groupColorOrDefault(groupColors, group?.id);
            return (
              <Fixture3D
                key={fixture.id}
                fixture={fixture}
                position={pos}
                channels={channels}
                isSelected={fixtureIsSelected(fixture.id)}
                onSelect={handleSelect}
                dimmed={dimmed}
                accentRgb={accent}
                decor={decorSettings}
              />
            );
          })}

          <StageFixtureGizmo
            mode={fixtureGizmoActive ? gizmoModeForTarget : 'off'}
            decor={decorSettings}
            stagePos={selectedPos ?? null}
            onDragStart={onGizmoDragStart}
            onCommit={(patch) => {
              if (selectedFixtureId == null) return;
              updatePosition(selectedFixtureId, patch);
            }}
          />

          <StageFixtureGizmo
            mode={sceneGizmoActive ? gizmoModeForTarget : 'off'}
            decor={decorSettings}
            stagePos={sceneGizmoStagePos}
            positionMapper={sceneGizmoPositionMapper}
            onDragStart={onGizmoDragStart}
            onCommit={(patch) => {
              if (!primarySceneElementId || !onSceneElementCommit) return;
              onSceneElementCommit(primarySceneElementId, {
                ...(patch.x != null ? { x: clampPercent(patch.x) } : {}),
                ...(patch.y != null ? { y: clampPercent(patch.y) } : {}),
                ...(patch.z != null ? { z: clampPercent(patch.z) } : {}),
              });
            }}
          />

          {!perfMode && (
            <ContactShadows
              resolution={256}
              scale={30}
              blur={2}
              opacity={0.35}
              far={10}
              color="#000000"
            />
          )}
        </Canvas>

        <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-start pointer-events-none">
          <div className="pointer-events-none">
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">
              Visualiseur 3D <span className="text-cyan-500 italic">Pro</span>
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
              <Box className="w-3 h-3" /> Sync plan 2D · molette zoom · Esc désélection
            </p>
          </div>

          <div className="flex flex-col gap-2 pointer-events-auto items-end max-w-[min(100%,52rem)]">
            <div className="bg-black/75 backdrop-blur-xl p-1.5 rounded-2xl border border-white/15 flex flex-wrap gap-1 justify-end">
              {[
                { key: 'showFloor' as const, label: 'Sol', icon: Square },
                { key: 'showWalls' as const, label: 'Murs', icon: Layout },
                { key: 'showPublicWall' as const, label: 'Mur public', icon: RectangleHorizontal },
                { key: 'showCeiling' as const, label: 'Plafond', icon: Box },
                { key: 'showStageDeck' as const, label: 'Scène', icon: Theater },
                { key: 'showSpeakers' as const, label: 'Son', icon: Speaker },
                { key: 'showDjBooth' as const, label: 'DJ', icon: Music2 },
                { key: 'showAudience' as const, label: 'Public', icon: Users },
                { key: 'showBandMusicians' as const, label: 'Groupe', icon: Guitar },
              ].map((item) => {
                const isActive = decorSettings[item.key];
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleSetting(item.key)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-300 group ${
                      isActive
                        ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                        : 'bg-slate-800/90 text-slate-100 hover:bg-slate-700 hover:text-white border border-white/10'
                    }`}
                    title={`${isActive ? 'Masquer' : 'Afficher'} ${item.label}`}
                  >
                    <item.icon
                      className={`w-3.5 h-3.5 ${isActive ? 'scale-110' : 'opacity-50 group-hover:opacity-100'}`}
                    />
                    <span className="text-[9px] font-black uppercase tracking-wider">
                      {item.label}
                    </span>
                    {isActive ? (
                      <Eye className="w-3 h-3 ml-1" />
                    ) : (
                      <EyeOff className="w-3 h-3 ml-1 opacity-30" />
                    )}
                  </button>
                );
              })}
            </div>

            {decorSettings.showWalls && (
              <div className="bg-black/60 backdrop-blur-xl rounded-3xl border border-white/10 w-64 shadow-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setRoomPanelOpen((o) => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 text-[9px] font-black text-cyan-500 uppercase tracking-[0.2em] hover:bg-white/5"
                >
                  Dimensions de la salle
                  {roomPanelOpen ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
                {roomPanelOpen && (
                  <div className="px-4 pb-4">
                    <StageLayoutDimensionFields
                      variant="panel3d"
                      roomWidthM={roomDimensionsM.widthM}
                      roomDepthM={roomDimensionsM.depthM}
                      roomHeightM={decorSettings.roomHeight}
                      stageWidthM={decorSettings.stageWidthM}
                      stageDepthM={decorSettings.stageDepthM}
                      stageElevationM={decorSettings.stageElevationM}
                      audienceOffsetM={decorSettings.audienceOffsetM}
                      onRoomSizeChange={applyRoomSize3d}
                      onLayoutChange={patchLayout3d}
                      fogDensity={decorSettings.fogDensity}
                      onFogDensityChange={applyFogDensity}
                      stageDeckColor={decorSettings.stageDeckColor}
                      onStageDeckColorChange={(hex) =>
                        patchLayout3d({ stageDeckColor: hex })
                      }
                    />
                  </div>
                )}
              </div>
            )}

            <div className="bg-black/60 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 flex flex-wrap gap-1 max-w-md justify-end">
              {(
                [
                  { id: 'audience' as StageCameraPreset, label: 'Public', icon: Users },
                  { id: 'booth' as StageCameraPreset, label: 'Régie', icon: Monitor },
                  { id: 'top' as StageCameraPreset, label: 'Dessus', icon: Maximize2 },
                  { id: 'iso' as StageCameraPreset, label: 'Iso', icon: Compass },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => applyCameraPreset(item.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 text-slate-200 hover:bg-cyan-500/25 hover:text-cyan-200 text-[8px] font-black uppercase"
                >
                  <item.icon className="w-3 h-3" />
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                disabled={!hasGizmoTarget && selectedFixtureId == null && !primarySceneElementId}
                onClick={focusPrimarySelection}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 text-slate-200 hover:bg-cyan-500/25 hover:text-cyan-200 disabled:opacity-30 text-[8px] font-black uppercase"
              >
                <Focus className="w-3 h-3" />
                Focus
              </button>
              <button
                type="button"
                disabled={!hasGizmoTarget && selectedFixtureId == null && !primarySceneElementId}
                onClick={() =>
                  setGizmoMode((m) => (m === 'translate' ? 'off' : 'translate'))
                }
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[8px] font-black uppercase disabled:opacity-30 ${
                  gizmoMode === 'translate'
                    ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
                    : 'bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white'
                }`}
                title="Gizmo déplacement 3D"
              >
                <Move3d className="w-3 h-3" />
                Gizmo
              </button>
              <button
                type="button"
                disabled={selectedFixtureId == null}
                onClick={() =>
                  setGizmoMode((m) => (m === 'rotate' ? 'off' : 'rotate'))
                }
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[8px] font-black uppercase disabled:opacity-30 ${
                  gizmoMode === 'rotate'
                    ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
                    : 'bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white'
                }`}
                title="Gizmo rotation (pan/tilt fixe)"
              >
                <Rotate3d className="w-3 h-3" />
                Pivot
              </button>
              <button
                type="button"
                onClick={() => setPerfMode((v) => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[8px] font-black uppercase ${
                  perfMode
                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/30'
                    : 'bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white'
                }`}
                title="Réduit étoiles et ombres pour la régie"
              >
                <Gauge className="w-3 h-3" />
                Régie
              </button>
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 left-6 z-20 flex flex-wrap items-center gap-2 pointer-events-none">
          <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-[9px] text-slate-300 font-black uppercase tracking-widest">
              {fixtures.length} fixture{fixtures.length !== 1 ? 's' : ''}
              {selectedFixtureId != null ? ` · #${selectedFixtureId}` : ''}
              {primarySceneElementId && selectedFixtureId == null
                ? ` · ${selectedSceneElement?.name ?? 'Élément'}`
                : ''}
            </span>
          </div>
          <div className="flex items-center gap-1 pointer-events-auto">
            <button
              type="button"
              onClick={() => dollyCamera(1.22)}
              className="p-2 rounded-xl bg-slate-950/90 border border-white/10 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors"
              title="Zoom arrière"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => dollyCamera(0.82)}
              className="p-2 rounded-xl bg-slate-950/90 border border-white/10 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors"
              title="Zoom avant"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={resetCameraView}
              className="p-2 rounded-xl bg-slate-950/90 border border-white/10 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors"
              title="Recentrer la vue (dernier preset caméra)"
            >
              <Scan className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="absolute bottom-6 right-6 z-20 bg-black/50 backdrop-blur-md p-3 rounded-xl border border-white/10 text-[9px] text-slate-500 font-bold uppercase pointer-events-none space-y-1">
          <p>Rotation : clic gauche</p>
          <p>Déplacement : clic droit</p>
          <p>Gizmo / Pivot : projecteur sélectionné</p>
          <p>Zoom : roulette</p>
        </div>
      </div>

      <div className="w-80 flex flex-col gap-4 shrink-0">
        <GlassCard title="Propriétés du projecteur" icon={Maximize2} className="h-full">
          {selectedFixtureId != null && selectedFixture && selectedPos ? (
            <div className="space-y-5 overflow-y-auto max-h-[calc(100vh-260px)] pr-1">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1">
                  Machine sélectionnée
                </p>
                <p className="text-sm font-bold text-white uppercase">{selectedFixture.name}</p>
                <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">
                  {selectedFixture.manufacturer} — {selectedFixture.model}
                </p>
              </div>

              {/* Position plan (sync 2D) */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Position plan (2D)
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-black uppercase text-slate-500">
                    <span>X (gauche → droite)</span>
                    <span className="text-cyan-400 font-mono">{Math.round(selectedPos.x)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={selectedPos.x}
                    onChange={(e) =>
                      updatePosition(selectedFixtureId, {
                        x: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full h-1 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-black uppercase text-slate-500">
                    <span>Y (fond → public)</span>
                    <span className="text-cyan-400 font-mono">{Math.round(selectedPos.y)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={selectedPos.y}
                    onChange={(e) =>
                      updatePosition(selectedFixtureId, {
                        y: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full h-1 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-white/5">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Altitude (Z)
                  </p>
                  <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-xs font-mono font-black border border-cyan-500/20">
                    {selectedPos.z ?? 0}%
                  </span>
                </div>

                <div className="flex items-center gap-4 h-28 justify-center bg-black/40 rounded-2xl p-4 border border-white/5">
                  <div className="flex flex-col items-center justify-between h-full text-[8px] font-black text-slate-600 uppercase">
                    <span>Haut</span>
                    <div className="w-px flex-1 bg-white/5 my-1" />
                    <span>Sol</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={selectedPos.z ?? 0}
                    onChange={(e) =>
                      updatePosition(selectedFixtureId, {
                        z: parseInt(e.target.value, 10),
                      })
                    }
                    className="h-full w-2 accent-cyan-500 cursor-pointer"
                    style={
                      {
                        writingMode: 'vertical-lr',
                        direction: 'rtl',
                      } as React.CSSProperties
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => updatePosition(selectedFixtureId, { z: 0 })}
                  className="w-full py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[8px] font-black uppercase text-slate-400 transition-all"
                >
                  Au sol
                </button>
              </div>

              <div className="space-y-4 pt-3 border-t border-white/5">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                    <span>Orientation (pan fixe)</span>
                    <span className="text-cyan-400 font-mono">
                      {selectedPos.rotationY || 0}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={selectedPos.rotationY || 0}
                    onChange={(e) =>
                      updatePosition(selectedFixtureId, {
                        rotationY: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full h-1 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                    <span>Inclinaison (tilt fixe)</span>
                    <span className="text-cyan-400 font-mono">
                      {selectedPos.rotationX || 0}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-90}
                    max={90}
                    value={selectedPos.rotationX || 0}
                    onChange={(e) =>
                      updatePosition(selectedFixtureId, {
                        rotationX: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full h-1 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 space-y-3">
                {selectedPanelBeamStyle === 'moving_spot' ? (
                  <>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Forme du faisceau (lyre)
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'round' as BeamShape, icon: Circle, label: 'Rond' },
                          { id: 'square' as BeamShape, icon: Square, label: 'Carré' },
                          {
                            id: 'rect' as BeamShape,
                            icon: RectangleHorizontal,
                            label: 'Rect.',
                          },
                        ] as const
                      ).map((shape) => {
                        const isCurrent = (selectedPos.beamShape || 'round') === shape.id;
                        return (
                          <button
                            key={shape.id}
                            type="button"
                            onClick={() =>
                              updatePosition(selectedFixtureId, { beamShape: shape.id })
                            }
                            className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all ${
                              isCurrent
                                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                                : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10 hover:border-white/10'
                            }`}
                          >
                            <shape.icon
                              className={`w-4 h-4 ${isCurrent ? 'scale-110' : ''}`}
                            />
                            <span className="text-[8px] font-black uppercase">{shape.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {selectedPos.beamShape === 'rect' && (
                      <div className="space-y-2 pt-2">
                        <div className="flex justify-between text-[9px] font-black uppercase text-slate-500">
                          <span>Largeur d&apos;étalement</span>
                          <span className="text-cyan-400 font-mono">
                            {selectedPos.beamWidth || 200}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={100}
                          max={500}
                          step={10}
                          value={selectedPos.beamWidth || 200}
                          onChange={(e) =>
                            updatePosition(selectedFixtureId, {
                              beamWidth: parseInt(e.target.value, 10),
                            })
                          }
                          className="w-full h-1 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-500"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-[9px] text-slate-500 leading-relaxed">
                    PAR / flood / barre : pool au sol + faisceau large (pas de forme lyre).
                  </p>
                )}

                <div className="space-y-2 pt-1">
                  <div className="flex justify-between text-[9px] font-black uppercase text-slate-500">
                    <span>Ouverture 3D (taille pool)</span>
                    <span className="text-cyan-400 font-mono">
                      {clampBeamSpreadPercent(selectedPos.beamSpread)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={25}
                    max={200}
                    step={5}
                    value={clampBeamSpreadPercent(selectedPos.beamSpread)}
                    onChange={(e) =>
                      updatePosition(selectedFixtureId, {
                        beamSpread: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full h-1 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-black uppercase text-slate-500">
                    <span>Luminosité visuelle</span>
                    <span className="text-cyan-400 font-mono">
                      {clampBeamVisualPercent(selectedPos.beamVisual)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={clampBeamVisualPercent(selectedPos.beamVisual)}
                    onChange={(e) =>
                      updatePosition(selectedFixtureId, {
                        beamVisual: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full h-1 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-500"
                  />
                  <p className="text-[8px] text-slate-600 leading-relaxed">
                    N&apos;affecte que l&apos;aperçu 3D (pas le DMX réel).
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Réinitialiser les paramètres 3D de ce projecteur ?')) {
                      resetUnit(selectedFixtureId, selectedFixture.type);
                    }
                  }}
                  className="w-full py-2 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-xl text-[9px] font-black uppercase text-red-500/60 hover:text-red-500 transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3 h-3" />
                  Réinitialiser l&apos;unité
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Réinitialiser toutes les positions (2D + 3D) ?')) {
                      resetAllPositions();
                      setSelectedFixtureId(null);
                    }
                  }}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase text-slate-500 hover:text-cyan-400 transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3 h-3" />
                  Réinit. toutes positions
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="w-16 h-16 bg-white/5 rounded-[2rem] flex items-center justify-center mb-6 border border-white/5 shadow-inner">
                <Box className="w-8 h-8 text-slate-700" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Aucune sélection
              </p>
              <p className="text-[10px] font-bold text-slate-600 uppercase leading-relaxed">
                Cliquez un projecteur dans la scène pour éditer position, hauteur et faisceau.
                Les positions X/Y sont partagées avec le plan 2D.
              </p>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

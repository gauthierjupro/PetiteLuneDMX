import React, { useMemo, useRef, useState, useEffect, memo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, Stars, Text, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import {
  Layers,
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
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import type { BeamShape, Fixture, StageFixturePosition } from '../../types';
import { useStagePositions } from '../../hooks/useStagePositions';
import { sameFixtureId } from '../../utils/stagePositions';
import { setLocalStorageJsonDebounced } from '../../utils/localStorageDebounced';

interface Stage3DTabProps {
  fixtures: Fixture[];
  channels: number[];
}

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

function positionEqual(a: FixturePosition, b: FixturePosition): boolean {
  return (
    a.x === b.x &&
    a.y === b.y &&
    a.z === b.z &&
    a.rotationX === b.rotationX &&
    a.rotationY === b.rotationY &&
    a.beamShape === b.beamShape &&
    a.beamWidth === b.beamWidth
  );
}

const Fixture3D = memo(
  function Fixture3D({
    fixture,
    position,
    channels,
    isSelected,
    onSelect,
  }: {
    fixture: Fixture;
    position: FixturePosition;
    channels: number[];
    isSelected: boolean;
    onSelect: (id: number) => void;
  }) {
    const meshRef = useRef<THREE.Group>(null);
    const headRef = useRef<THREE.Group>(null);
    const start = fixture.address - 1;

    const lightData = useMemo(() => {
      const color = new THREE.Color(1, 1, 1);
      let intensity = 0;
      const angle = 0.35;
      let pan = 0;
      let tilt = 0;

      if (fixture.type === 'RGB') {
        const r = (channels[start + 1] || 0) / 255;
        const g = (channels[start + 2] || 0) / 255;
        const b = (channels[start + 3] || 0) / 255;
        const dim = (channels[start] || 0) / 255;
        color.setRGB(r, g, b);
        intensity = dim * 18;
      } else if (fixture.type === 'Moving Head') {
        const dimVal = Math.max(channels[start + 5] || 0, channels[start + 7] || 0);
        const dim = dimVal / 255;
        intensity = dim * 25;
        pan = ((channels[start] || 127) - 127) * (Math.PI / 127) * 1.5;
        tilt = ((channels[start + 2] || 127) - 127) * (Math.PI / 2 / 127);
      } else if (fixture.type === 'Effect') {
        const dim = (channels[start] || 0) / 255;
        color.setRGB(1, 0.8, 0.4);
        intensity = dim * 15;
      }

      return { color, intensity, angle, pan, tilt };
    }, [channels, fixture.type, start]);

    useFrame(() => {
      if (fixture.type === 'Moving Head') {
        const basePan = (position.rotationY || 0) * (Math.PI / 180);
        const baseTilt = (position.rotationX || 0) * (Math.PI / 180);
        if (meshRef.current) meshRef.current.rotation.y = -lightData.pan - basePan;
        if (headRef.current) headRef.current.rotation.x = lightData.tilt + baseTilt;
      } else if (meshRef.current) {
        meshRef.current.rotation.y = -(position.rotationY || 0) * (Math.PI / 180);
        meshRef.current.rotation.x = (position.rotationX || 0) * (Math.PI / 180);
      }
    });

    const xVal = position.x ?? 50;
    const yVal = position.y ?? 50;
    const zVal = position.z ?? 100;
    const xPos = (xVal - 50) / 5;
    const zPos = (yVal - 50) / 5;
    const heightPercent = zVal;
    const yPos = (heightPercent / 100) * 5.8;
    const isOnGround = heightPercent < 10;
    const beamShape = position.beamShape || 'round';
    const beamWidthFactor = (position.beamWidth || 200) / 100;
    const label = `${fixture.name.split(' ')[0]} #${fixture.id}`;

    return (
      <group
        position={[xPos, yPos, zPos]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(fixture.id);
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
              color={isSelected ? '#06b6d4' : '#222'}
              metalness={0.8}
              roughness={0.2}
              emissive={isSelected ? '#06b6d4' : '#000'}
              emissiveIntensity={isSelected ? 0.3 : 0}
            />
          </mesh>
        )}

        <group ref={meshRef} rotation={isOnGround ? [Math.PI, 0, 0] : [0, 0, 0]}>
          {lightData.intensity > 0 && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -yPos + 0.02, 0]}>
              {beamShape === 'round' ? (
                <circleGeometry args={[lightData.angle * (yPos + 2), 24]} />
              ) : beamShape === 'square' ? (
                <planeGeometry
                  args={[
                    lightData.angle * (yPos + 2) * 1.4,
                    lightData.angle * (yPos + 2) * 1.4,
                  ]}
                />
              ) : (
                <planeGeometry args={[1.0 * beamWidthFactor, 0.3]} />
              )}
              <meshBasicMaterial
                color={lightData.color}
                transparent
                opacity={0.4}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          )}

          {lightData.intensity > 0 && (
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
              color={isSelected ? '#0e7490' : '#2a2a2a'}
              metalness={0.9}
              roughness={0.1}
              emissive={isSelected ? '#0891b2' : '#111'}
              emissiveIntensity={isSelected ? 0.2 : 0.1}
            />
          </mesh>

          <group ref={headRef}>
            {lightData.intensity > 0 && (
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
              <meshBasicMaterial
                color={lightData.intensity > 0 ? lightData.color : '#444'}
              />
            </mesh>

            <spotLight
              position={[0, -0.1, 0]}
              angle={lightData.angle}
              penumbra={0.1}
              intensity={lightData.intensity * 4}
              color={lightData.color}
              castShadow={false}
              target-position={[0, -10, 0]}
            />

            {lightData.intensity > 0 && (
              <group>
                <mesh position={[0, -2.5, 0]}>
                  {beamShape === 'round' && (
                    <coneGeometry args={[lightData.angle * 5.2, 5, 16, 1, true]} />
                  )}
                  {beamShape === 'square' && (
                    <cylinderGeometry args={[0, lightData.angle * 5.2, 5, 4, 1, true]} />
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
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -yPos + 0.05, 0]}>
            <ringGeometry args={[0.4, 0.5, 24]} />
            <meshBasicMaterial color="#06b6d4" transparent opacity={0.5} />
          </mesh>
        )}
      </group>
    );
  },
  (prev, next) => {
    if (prev.isSelected !== next.isSelected) return false;
    if (prev.fixture.id !== next.fixture.id) return false;
    if (prev.fixture.address !== next.fixture.address) return false;
    if (prev.fixture.type !== next.fixture.type) return false;
    if (prev.fixture.name !== next.fixture.name) return false;
    if (!positionEqual(prev.position, next.position)) return false;
    return channelsSliceEqual(
      prev.channels,
      next.channels,
      next.fixture.address - 1,
      next.fixture.channels
    );
  }
);

interface DecorSettings {
  showFloor: boolean;
  showWalls: boolean;
  showCeiling: boolean;
  showTruss: boolean;
  backWallPos: number;
  leftWallPos: number;
  rightWallPos: number;
  frontWallPos: number;
}

const DEFAULT_DECOR: DecorSettings = {
  showFloor: true,
  showWalls: true,
  showCeiling: false,
  showTruss: true,
  backWallPos: 25,
  leftWallPos: 40,
  rightWallPos: 40,
  frontWallPos: 40,
};

const StageDecor = memo(function StageDecor({ settings }: { settings: DecorSettings }) {
  return (
    <group>
      {settings.showFloor && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
          <boxGeometry args={[100, 100, 0.2]} />
          <meshBasicMaterial color="#1a1a1a" side={THREE.DoubleSide} />
        </mesh>
      )}

      {settings.showWalls && (
        <group>
          <mesh position={[0, 10, -settings.backWallPos]} receiveShadow>
            <planeGeometry args={[100, 25]} />
            <meshBasicMaterial color="#111" side={THREE.DoubleSide} />
          </mesh>
          <mesh
            position={[-settings.leftWallPos, 10, 0]}
            rotation={[0, Math.PI / 2, 0]}
            receiveShadow
          >
            <planeGeometry args={[100, 25]} />
            <meshBasicMaterial color="#111" side={THREE.DoubleSide} />
          </mesh>
          <mesh
            position={[settings.rightWallPos, 10, 0]}
            rotation={[0, -Math.PI / 2, 0]}
            receiveShadow
          >
            <planeGeometry args={[100, 25]} />
            <meshBasicMaterial color="#111" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 10, settings.frontWallPos]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[100, 25]} />
            <meshBasicMaterial
              color="#080808"
              transparent
              opacity={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}

      {settings.showCeiling && (
        <mesh position={[0, 25, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[100, 80]} />
          <meshBasicMaterial color="#0a0a0a" side={THREE.DoubleSide} />
        </mesh>
      )}

      {settings.showTruss && (
        <group position={[0, 6, 0]}>
          {[-15, -8, 0, 8, 15].map((z, i) => (
            <mesh key={`truss-h-${i}`} position={[0, 0, z]}>
              <boxGeometry args={[80, 0.4, 0.4]} />
              <meshStandardMaterial color="#666" metalness={0.8} roughness={0.2} />
            </mesh>
          ))}
          {[-30, -15, 0, 15, 30].map((x, i) => (
            <mesh key={`truss-v-${i}`} position={[x, 0, 0]}>
              <boxGeometry args={[0.4, 0.4, 30.2]} />
              <meshStandardMaterial color="#666" metalness={0.8} roughness={0.2} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
});

export const Stage3DTab = ({ fixtures, channels }: Stage3DTabProps) => {
  const [selectedFixtureId, setSelectedFixtureId] = useState<number | null>(null);
  const [roomPanelOpen, setRoomPanelOpen] = useState(false);
  const {
    positions,
    updatePosition,
    resetAllPositions,
    resetUnit,
  } = useStagePositions(fixtures);

  const [decorSettings, setDecorSettings] = useState<DecorSettings>(() => {
    try {
      const saved = localStorage.getItem('stage_decor_settings');
      return saved ? { ...DEFAULT_DECOR, ...JSON.parse(saved) } : DEFAULT_DECOR;
    } catch {
      return DEFAULT_DECOR;
    }
  });

  useEffect(() => {
    setLocalStorageJsonDebounced('stage_decor_settings', decorSettings);
  }, [decorSettings]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedFixtureId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (
      selectedFixtureId != null &&
      !fixtures.some((f) => sameFixtureId(f.id, selectedFixtureId))
    ) {
      setSelectedFixtureId(null);
    }
  }, [fixtures, selectedFixtureId]);

  const toggleSetting = (key: keyof DecorSettings) => {
    if (typeof decorSettings[key] === 'boolean') {
      setDecorSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const updateDecorPos = (key: keyof DecorSettings, val: number) => {
    setDecorSettings((prev) => ({ ...prev, [key]: val }));
  };

  const selectedFixture = useMemo(
    () => fixtures.find((f) => sameFixtureId(f.id, selectedFixtureId ?? -1)),
    [fixtures, selectedFixtureId]
  );

  const selectedPos = useMemo(
    () => positions.find((p) => sameFixtureId(p.id, selectedFixtureId ?? -1)),
    [positions, selectedFixtureId]
  );

  const handleSelect = (id: number) => setSelectedFixtureId(id);

  return (
    <div className="h-[calc(100vh-200px)] w-full flex gap-4">
      <div className="flex-1 bg-[#020408] rounded-[2.5rem] overflow-hidden relative border border-white/5 shadow-2xl">
        <div className="absolute top-6 left-6 right-6 z-10 flex justify-between items-start pointer-events-none">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">
              Visualiseur 3D <span className="text-cyan-500 italic">Pro</span>
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
              <Box className="w-3 h-3" /> Positions sync avec le plan 2D · Esc pour désélectionner
            </p>
          </div>

          <div className="flex flex-col gap-2 pointer-events-auto items-end">
            <div className="bg-black/60 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 flex gap-1">
              {[
                { key: 'showFloor' as const, label: 'Sol', icon: Square },
                { key: 'showWalls' as const, label: 'Murs', icon: Layout },
                { key: 'showCeiling' as const, label: 'Plafond', icon: Box },
                { key: 'showTruss' as const, label: 'Pont', icon: Layers },
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
                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
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
                  <div className="px-4 pb-4 flex flex-col gap-4">
                    {(
                      [
                        { key: 'backWallPos' as const, label: 'Fond', min: 5, max: 50 },
                        { key: 'leftWallPos' as const, label: 'Gauche', min: 10, max: 60 },
                        { key: 'rightWallPos' as const, label: 'Droite', min: 10, max: 60 },
                        { key: 'frontWallPos' as const, label: 'Public', min: 10, max: 60 },
                      ] as const
                    ).map((slider) => (
                      <div key={slider.key} className="space-y-1.5">
                        <div className="flex justify-between text-[8px] font-black uppercase text-slate-500">
                          <span>Mur {slider.label}</span>
                          <span className="text-cyan-400">
                            {decorSettings[slider.key]}m
                          </span>
                        </div>
                        <input
                          type="range"
                          min={slider.min}
                          max={slider.max}
                          value={decorSettings[slider.key]}
                          onChange={(e) =>
                            updateDecorPos(slider.key, parseInt(e.target.value, 10))
                          }
                          className="w-full h-1 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-500"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <Canvas
          shadows={false}
          dpr={[1, 1.5]}
          gl={{ antialias: true, powerPreference: 'high-performance', stencil: false }}
          onPointerMissed={() => setSelectedFixtureId(null)}
        >
          <PerspectiveCamera makeDefault position={[0, 8, 18]} fov={45} />
          <OrbitControls
            makeDefault
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 1.8}
            maxDistance={50}
            minDistance={2}
          />

          <color attach="background" args={['#010204']} />
          <Stars radius={100} depth={50} count={800} factor={4} saturation={0} fade speed={0.5} />

          <hemisphereLight intensity={1.2} groundColor="#000000" color="#ffffff" />
          <ambientLight intensity={0.5} />
          <pointLight position={[0, 15, 0]} intensity={3} color="#fff" />
          <pointLight position={[0, 5, 20]} intensity={2.5} color="#fff" />

          <StageDecor settings={decorSettings} />

          {decorSettings.showFloor && (
            <Grid
              infiniteGrid
              fadeDistance={40}
              fadeStrength={5}
              cellSize={1}
              sectionSize={5}
              sectionColor="#1a1a1a"
              cellColor="#080808"
              position={[0, 0.01, 0]}
            />
          )}

          {fixtures.map((fixture) => {
            const pos =
              positions.find((p) => sameFixtureId(p.id, fixture.id)) || {
                id: fixture.id,
                x: 50,
                y: 50,
                z: 100,
              };
            return (
              <Fixture3D
                key={fixture.id}
                fixture={fixture}
                position={pos}
                channels={channels}
                isSelected={
                  selectedFixtureId != null &&
                  sameFixtureId(selectedFixtureId, fixture.id)
                }
                onSelect={handleSelect}
              />
            );
          })}

          <ContactShadows
            resolution={512}
            scale={30}
            blur={2}
            opacity={0.35}
            far={10}
            color="#000000"
          />
        </Canvas>

        <div className="absolute bottom-6 left-6 flex gap-4">
          <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-[9px] text-slate-300 font-black uppercase tracking-widest">
              {fixtures.length} fixture{fixtures.length !== 1 ? 's' : ''}
              {selectedFixtureId != null ? ` · #${selectedFixtureId}` : ''}
            </span>
          </div>
        </div>

        <div className="absolute bottom-6 right-6 bg-black/50 backdrop-blur-md p-3 rounded-xl border border-white/10 text-[9px] text-slate-500 font-bold uppercase pointer-events-none space-y-1">
          <p>Rotation : clic gauche</p>
          <p>Déplacement : clic droit</p>
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
                    <span>Pont</span>
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
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updatePosition(selectedFixtureId, { z: 0 })}
                    className="py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[8px] font-black uppercase text-slate-400 transition-all"
                  >
                    Au sol
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePosition(selectedFixtureId, { z: 100 })}
                    className="py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[8px] font-black uppercase text-slate-400 transition-all"
                  >
                    Au pont
                  </button>
                </div>
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
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Forme du faisceau
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'round' as BeamShape, icon: Circle, label: 'Rond' },
                      { id: 'square' as BeamShape, icon: Square, label: 'Carré' },
                      { id: 'rect' as BeamShape, icon: RectangleHorizontal, label: 'Rect.' },
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
                        <shape.icon className={`w-4 h-4 ${isCurrent ? 'scale-110' : ''}`} />
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

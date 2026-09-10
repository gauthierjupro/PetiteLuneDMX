import React, { useState, useRef, useEffect } from 'react';
import { Sun, Move, Zap, Wind, Maximize2, RefreshCw } from 'lucide-react';
import type { Fixture, StageFixturePosition } from '../../types';
import { useStagePositions } from '../../hooks/useStagePositions';
import { sameFixtureId } from '../../utils/stagePositions';

interface StageTabProps {
  fixtures: Fixture[];
  channels: number[];
}

export const StageTab = ({ fixtures, channels }: StageTabProps) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const positionsRef = useRef<StageFixturePosition[]>([]);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [selectedFixtureId, setSelectedFixtureId] = useState<number | null>(null);
  const { positions, savePositions, setPositionsLocal, resetAllPositions } =
    useStagePositions(fixtures);

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  const handleResetPositions = () => {
    if (confirm('Réinitialiser toutes les positions et hauteurs des projecteurs ?')) {
      resetAllPositions();
    }
  };

  const handleDragStart = (id: number) => {
    setDraggingId(id);
    setSelectedFixtureId(id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingId === null || !stageRef.current) return;

    const rect = stageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newPos = positionsRef.current.map((p) =>
      sameFixtureId(p.id, draggingId)
        ? { ...p, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
        : p
    );
    positionsRef.current = newPos;
    setPositionsLocal(newPos);
  };

  const handleMouseUp = () => {
    if (draggingId !== null) {
      savePositions(positionsRef.current);
      setDraggingId(null);
    }
  };

  const handleStageClick = (e: React.MouseEvent) => {
    if (e.target === stageRef.current) {
      setSelectedFixtureId(null);
    }
  };

  const getFixtureStyle = (fixture: Fixture) => {
    const start = fixture.address - 1;
    let color = 'rgba(255, 255, 255, 0.2)';
    let beamWidth = 0;
    let beamAngle = 0;

    if (!channels || channels.length < fixture.address + fixture.channels) {
      return { color, beamWidth, beamAngle };
    }

    if (fixture.type === 'RGB') {
      const r = channels[start + 1] || 0;
      const g = channels[start + 2] || 0;
      const b = channels[start + 3] || 0;
      const dim = (channels[start] || 0) / 255;
      color = `rgba(${r}, ${g}, ${b}, ${(dim * 0.8 + 0.2).toFixed(2)})`;
      beamWidth = dim * 100;
    } else if (fixture.type === 'Moving Head') {
      const dimVal = Math.max(channels[start + 5] || 0, channels[start + 7] || 0);
      const dim = dimVal / 255;
      color = `rgba(255, 255, 255, ${(dim * 0.8 + 0.2).toFixed(2)})`;
      beamWidth = dim * 150;
      beamAngle = (channels[start] - 127) * 0.2;
    }

    if (isNaN(beamWidth)) beamWidth = 0;
    if (isNaN(beamAngle)) beamAngle = 0;

    return { color, beamWidth, beamAngle };
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center px-4 py-2 bg-slate-900/50 rounded-2xl border border-white/5">
        <div className="flex items-center gap-3">
          <Move className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest">Plan de Feu (2D)</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase">
              Disposez vos machines sur le plateau · sync Vue 3D
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleResetPositions}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-cyan-400 transition-all"
            title="Réinitialiser les positions"
          >
            <RefreshCw className="w-3 h-3" />
            Réinitialiser Positions
          </button>
          <div className="h-4 w-px bg-white/10 mx-2" />
          <p className="text-[10px] text-slate-600 italic">
            Hauteur / angles / faisceau : onglet Vue 3D
          </p>
        </div>
      </div>

      <div
        ref={stageRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleStageClick}
        className="flex-1 min-h-[500px] bg-[#0a0c10] rounded-[2.5rem] border border-white/5 relative overflow-hidden shadow-inner cursor-crosshair"
        style={{
          backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      >
        {fixtures.length > 0 ? (
          fixtures.map((fixture) => {
            const pos = positions.find((p) => sameFixtureId(p.id, fixture.id)) || {
              id: fixture.id,
              x: 50,
              y: 50,
              z: 100,
            };
            const posX = pos.x ?? 50;
            const posY = pos.y ?? 50;
            const posZ = pos.z ?? 100;
            const { color, beamWidth, beamAngle } = getFixtureStyle(fixture);
            const isSelected =
              selectedFixtureId !== null && sameFixtureId(selectedFixtureId, fixture.id);

            return (
              <div
                key={fixture.id}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleDragStart(fixture.id);
                }}
                className={`absolute group transition-transform duration-75 ease-out cursor-move ${isSelected ? 'z-50' : 'z-10'}`}
                style={{
                  left: `${posX}%`,
                  top: `${posY}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div
                  className="absolute left-1/2 -translate-x-1/2 rounded-full bg-black/40 blur-md transition-all"
                  style={{
                    bottom: -10,
                    width: isSelected ? 30 : 20,
                    height: 10,
                    opacity: ((100 - posZ) / 100) * 0.5 + 0.1,
                    transform: `translate(-50%, 0) scale(${1 + posZ / 100})`,
                  }}
                />

                <div
                  className="absolute inset-0 blur-2xl rounded-full opacity-60 pointer-events-none transition-all duration-100"
                  style={{
                    backgroundColor: color,
                    width: `${beamWidth}px`,
                    height: `${beamWidth}px`,
                    transform: `translate(-50%, -50%) rotate(${beamAngle}deg)`,
                  }}
                />

                <div
                  className={`relative w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? 'border-cyan-400 scale-125 shadow-lg bg-slate-800'
                      : 'border-white/10 bg-slate-900/80 group-hover:border-white/30'
                  }`}
                  style={{ transform: `rotate(${pos.rotationY || 0}deg)` }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-1 h-2 bg-cyan-500 rounded-full opacity-50" />

                  {fixture.type === 'RGB' && <Sun className="w-5 h-5 text-slate-400" />}
                  {fixture.type === 'Moving Head' && (
                    <Move className="w-5 h-5 text-slate-400" />
                  )}
                  {fixture.type === 'Laser' && <Zap className="w-5 h-5 text-slate-400" />}
                  {fixture.type === 'Effect' && <Wind className="w-5 h-5 text-slate-400" />}

                  <div
                    className={`absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border border-white/5 transition-opacity ${isSelected ? 'opacity-100 bg-cyan-500/20 text-cyan-400' : 'opacity-0 group-hover:opacity-100 bg-black/40 text-slate-500'}`}
                  >
                    {fixture.name} {pos.z !== undefined && `(H: ${pos.z}%)`}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700 opacity-30">
            <Maximize2 className="w-16 h-16 mb-4" />
            <p className="text-sm font-black uppercase tracking-widest">
              Aucun projecteur patché
            </p>
            <p className="text-[10px] font-bold mt-2">
              Allez dans l&apos;onglet Patch pour ajouter des machines
            </p>
          </div>
        )}

        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase text-slate-800 tracking-[0.5em] pointer-events-none">
          FOND DE SCÈNE
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase text-slate-800 tracking-[0.5em] pointer-events-none">
          FACE / PUBLIC
        </div>
      </div>
    </div>
  );
};

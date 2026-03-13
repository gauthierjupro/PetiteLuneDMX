import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Sun, Move, Zap, Wind, Maximize2 } from 'lucide-react';

interface Fixture {
  id: number;
  name: string;
  manufacturer: string;
  model: string;
  address: number;
  channels: number;
  type: string;
}

interface FixturePosition {
  id: number;
  x: number;
  y: number;
}

interface StageTabProps {
  fixtures: Fixture[];
  channels: number[];
}

export const StageTab = ({ fixtures, channels }: StageTabProps) => {
  const [positions, setPositions] = useState<FixturePosition[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  // Charger les positions sauvegardées
  useEffect(() => {
    const saved = localStorage.getItem('stage_positions');
    if (saved) {
      setPositions(JSON.parse(saved));
    } else {
      // Positions par défaut en ligne
      const initial = fixtures.map((f, i) => ({
        id: f.id,
        x: 10 + (i % 6) * 15,
        y: 10 + Math.floor(i / 6) * 20
      }));
      setPositions(initial);
    }
  }, [fixtures]);

  const savePositions = (newPos: FixturePosition[]) => {
    setPositions(newPos);
    localStorage.setItem('stage_positions', JSON.stringify(newPos));
  };

  const handleDragStart = (id: number) => {
    setDraggingId(id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingId === null || !stageRef.current) return;

    const rect = stageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newPos = positions.map(p => 
      p.id === draggingId ? { ...p, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } : p
    );
    setPositions(newPos);
  };

  const handleMouseUp = () => {
    if (draggingId !== null) {
      savePositions(positions);
      setDraggingId(null);
    }
  };

  const getFixtureStyle = (fixture: Fixture) => {
    const start = fixture.address - 1;
    let color = 'rgba(255, 255, 255, 0.2)';
    let beamWidth = 0;
    let beamAngle = 0;

    if (fixture.type === 'RGB') {
      const r = channels[start + 1] || 0;
      const g = channels[start + 2] || 0;
      const b = channels[start + 3] || 0;
      const dim = (channels[start] || 0) / 255;
      color = `rgba(${r}, ${g}, ${b}, ${dim * 0.8 + 0.2})`;
      beamWidth = dim * 100;
    } else if (fixture.type === 'Moving Head') {
      const dim = (channels[start + 5] || 0) / 255; // CH6 Dimmer pour PicoSpot
      color = `rgba(255, 255, 255, ${dim * 0.8 + 0.2})`;
      beamWidth = dim * 150;
      // Simulation simple de l'angle (Pan/Tilt)
      beamAngle = (channels[start] - 127) * 0.2; // Pan influence l'angle visuel
    }

    return { color, beamWidth, beamAngle };
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center px-4 py-2 bg-slate-900/50 rounded-2xl border border-white/5">
        <div className="flex items-center gap-3">
          <Maximize2 className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest">Vue 2D Plateau</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Positionnez vos projecteurs et visualisez le show</p>
          </div>
        </div>
        <p className="text-[10px] text-slate-600 italic">Drag & Drop pour déplacer les projecteurs</p>
      </div>

      <div 
        ref={stageRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="flex-1 bg-[#0a0c10] rounded-[2.5rem] border border-white/5 relative overflow-hidden shadow-inner cursor-crosshair"
        style={{ 
          backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }}
      >
        {/* Scène (Zone de rendu) */}
        {fixtures.map(fixture => {
          const pos = positions.find(p => p.id === fixture.id) || { x: 50, y: 50 };
          const { color, beamWidth, beamAngle } = getFixtureStyle(fixture);

          return (
            <div 
              key={fixture.id}
              onMouseDown={() => handleDragStart(fixture.id)}
              className="absolute group transition-transform duration-75 ease-out"
              style={{ 
                left: `${pos.x}%`, 
                top: `${pos.y}%`, 
                transform: 'translate(-50%, -50%)',
                zIndex: draggingId === fixture.id ? 50 : 10
              }}
            >
              {/* Halo / Faisceau Lumineux */}
              <div 
                className="absolute inset-0 blur-2xl rounded-full opacity-60 pointer-events-none transition-all duration-100"
                style={{ 
                  backgroundColor: color, 
                  width: `${beamWidth}px`, 
                  height: `${beamWidth}px`,
                  transform: `translate(-50%, -50%) rotate(${beamAngle}deg)`
                }}
              />

              {/* Icône du Projecteur */}
              <div className={`relative w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all ${
                draggingId === fixture.id ? 'border-cyan-400 scale-125 shadow-lg bg-slate-800' : 'border-white/10 bg-slate-900/80 group-hover:border-white/30'
              }`}>
                {fixture.type === 'RGB' && <Sun className="w-5 h-5 text-slate-400" />}
                {fixture.type === 'Moving Head' && <Move className="w-5 h-5 text-slate-400" />}
                {fixture.type === 'Laser' && <Zap className="w-5 h-5 text-slate-400" />}
                {fixture.type === 'Effect' && <Wind className="w-5 h-5 text-slate-400" />}
                
                {/* Étiquette d'adresse */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-black uppercase text-slate-500 bg-black/40 px-1.5 py-0.5 rounded-md border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {fixture.name}
                </div>
              </div>
            </div>
          );
        })}

        {/* Repères Scène */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase text-slate-800 tracking-[0.5em] pointer-events-none">FOND DE SCÈNE</div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase text-slate-800 tracking-[0.5em] pointer-events-none">FACE / PUBLIC</div>
      </div>
    </div>
  );
};

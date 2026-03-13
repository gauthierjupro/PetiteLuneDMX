import React, { useState, useEffect } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ControlSlider } from '../ui/ControlSlider';
import { Activity, Move, Zap, Circle, Infinity, Sliders } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';

interface EffectsTabProps {
  fixtures: any[];
}

export const EffectsTab = ({ fixtures }: EffectsTabProps) => {
  const [activeMotion, setActiveMotion] = useState<string | null>(null);
  const [amplitude, setAmplitude] = useState(0.2);
  const [speed, setSpeed] = useState(0.5);
  const [centerX, setCenterX] = useState(0.5);
  const [centerY, setCenterY] = useState(0.5);
  const [motionFixtures, setMotionFixtures] = useState<number[]>([]);

  const lyres = fixtures.filter(f => f.type === 'Moving Head');

  const toggleFixture = (id: number) => {
    setMotionFixtures(prev => 
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  const handleMotionChange = async (mode: string | null) => {
    setActiveMotion(mode);
    try {
      await invoke('set_motion_mode', { mode });
    } catch (e) {
      console.error(e);
    }
  };

  const updateAmplitude = async (val: string) => {
    const v = parseFloat(val) / 255;
    setAmplitude(v);
    await invoke('set_motion_amplitude', { amplitude: v });
  };

  const updateSpeed = async (val: string) => {
    const v = parseFloat(val) / 255;
    setSpeed(v);
    await invoke('set_motion_speed', { speed: v });
  };

  const updateCenter = async (x: number, y: number) => {
    setCenterX(x);
    setCenterY(y);
    await invoke('set_motion_center', { x, y });
  };

  useEffect(() => {
    const syncFixtures = async () => {
      const addresses = motionFixtures.map(id => fixtures.find(f => f.id === id)?.address).filter(Boolean);
      await invoke('set_motion_fixtures', { addresses });
    };
    syncFixtures();
  }, [motionFixtures, fixtures]);

  return (
    <div className="grid grid-cols-12 gap-8">
      {/* Colonne Gauche : Sélection du Mouvement */}
      <div className="col-span-4 space-y-6">
        <GlassCard title="Générateur de Mouvements" icon={Activity}>
          <div className="space-y-4">
            {[
              { id: 'circle', label: 'Cercle Parfait', icon: Circle },
              { id: 'streak', label: 'Figure en Huit', icon: Infinity },
              { id: 'ellipse', label: 'Ellipse Large', icon: Activity },
            ].map(mode => (
              <button 
                key={mode.id} 
                onClick={() => handleMotionChange(activeMotion === mode.id ? null : mode.id)}
                className={`w-full py-4 px-5 rounded-2xl border transition-all flex items-center justify-between group ${
                  activeMotion === mode.id 
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.15)]' 
                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${activeMotion === mode.id ? 'bg-cyan-500/20' : 'bg-slate-800'}`}>
                    <mode.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest">{mode.label}</span>
                </div>
                {activeMotion === mode.id && <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
              </button>
            ))}
            
            <button 
              onClick={() => handleMotionChange(null)}
              className="w-full py-3 text-[10px] font-bold uppercase text-slate-500 hover:text-red-400 transition-colors"
            >
              Arrêter tous les mouvements
            </button>
          </div>
        </GlassCard>

        <GlassCard title="Paramètres du Mouvement" icon={Sliders}>
          <div className="space-y-8">
            <ControlSlider 
              label="Vitesse" 
              value={Math.round(speed * 255)} 
              onChange={updateSpeed} 
            />
            <ControlSlider 
              label="Amplitude" 
              value={Math.round(amplitude * 255)} 
              onChange={updateAmplitude} 
            />
            
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Centre du Mouvement (X/Y)</label>
              <div className="aspect-square bg-slate-950 rounded-2xl border border-white/10 relative cursor-crosshair overflow-hidden group"
                   onClick={(e) => {
                     const rect = e.currentTarget.getBoundingClientRect();
                     const x = (e.clientX - rect.left) / rect.width;
                     const y = (e.clientY - rect.top) / rect.height;
                     updateCenter(x, y);
                   }}>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                <div 
                  className="absolute w-4 h-4 border-2 border-cyan-400 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_#22d3ee]"
                  style={{ left: `${centerX * 100}%`, top: `${centerY * 100}%` }}
                />
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Colonne Droite : Sélection des Fixtures */}
      <div className="col-span-8 space-y-6">
        <GlassCard title="Appliquer aux Lyres" icon={Move}>
          <div className="grid grid-cols-4 gap-4">
            {lyres.map(lyre => (
              <button
                key={lyre.id}
                onClick={() => toggleFixture(lyre.id)}
                className={`p-6 rounded-3xl border transition-all flex flex-col items-center gap-4 ${
                  motionFixtures.includes(lyre.id)
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.1)]'
                    : 'bg-slate-900/50 border-white/5 text-slate-500 hover:border-white/10'
                }`}
              >
                <Move className={`w-8 h-8 ${motionFixtures.includes(lyre.id) ? 'text-cyan-400' : 'text-slate-700'}`} />
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-tighter">{lyre.name}</p>
                  <p className="text-[8px] opacity-50 font-mono mt-1">DMX: {lyre.address}</p>
                </div>
              </button>
            ))}
          </div>
          
          {lyres.length === 0 && (
            <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
              <p className="text-slate-500 text-sm italic">Aucune lyre (Moving Head) détectée dans le patch.</p>
            </div>
          )}
        </GlassCard>

        <div className="aspect-video bg-slate-900/50 rounded-[2.5rem] border border-white/5 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          {activeMotion ? (
            <div className="text-center z-10">
              <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-cyan-500/30 animate-pulse">
                <Activity className="text-cyan-400 w-8 h-8" />
              </div>
              <p className="text-cyan-400 font-black uppercase tracking-widest text-xl">Mouvement Actif</p>
              <p className="text-slate-500 text-xs mt-2 uppercase font-bold tracking-tighter">Synchronisation 40Hz en cours...</p>
            </div>
          ) : (
            <p className="text-slate-600 font-bold uppercase tracking-widest text-sm">Aperçu des trajectoires</p>
          )}
        </div>
      </div>
    </div>
  );
};

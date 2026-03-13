import React from 'react';
import { Zap, Wind } from 'lucide-react';
import { Tooltip } from '../../ui/Tooltip';
import { ControlSlider } from '../../ui/ControlSlider';

interface RythmeSectionProps {
  fixtures: any[];
  channels: number[];
  updateDmx: (ch: number, val: number) => void;
}

export const RythmeSection = ({
  fixtures,
  channels,
  updateDmx
}: RythmeSectionProps) => {
  const effectFixtures = fixtures.filter(f => f.type === 'Laser' || f.type === 'Effect');

  if (effectFixtures.length === 0) return null;

  return (
    <section className="space-y-4">
      {/* Cartes Effets Spécifiques */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none items-start">
        {effectFixtures.map(f => (
          <div key={f.id} className="min-w-[240px] bg-[#111317] border border-white/5 rounded-[2rem] p-5 space-y-4 shadow-lg group hover:border-white/10 transition-all">
            <div className="flex items-center gap-2">
              {f.type === 'Laser' ? <Zap className="w-3.5 h-3.5 text-rose-400" /> : <Wind className="w-3.5 h-3.5 text-amber-400" />}
              <h3 className="text-xs font-black uppercase text-slate-300 truncate">{f.name}</h3>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {['DMX', 'AUTO', 'SOUND', 'JUMP'].map(mode => (
                <Tooltip key={mode} text={`Passer en mode ${mode}`}>
                  <button key={mode} className="w-full py-2 bg-slate-800/50 border border-white/5 rounded-lg text-[10px] font-black text-slate-500 hover:text-cyan-400 hover:border-cyan-500/30 uppercase transition-all active:scale-95">{mode}</button>
                </Tooltip>
              ))}
            </div>
            <div className="space-y-3 pt-2">
              <ControlSlider 
                label="Vitesse / Réactivité" 
                value={channels[f.address-1]} 
                onChange={(v) => updateDmx(f.address-1, v)} 
                color="bg-cyan-500" 
              />
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                 <div className="h-full bg-cyan-400 w-1/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

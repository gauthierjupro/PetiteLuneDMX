import React from 'react';
import { Move, Activity, HeartPulse } from 'lucide-react';
import { ControlSlider } from '../../ui/ControlSlider';
import { XYPad } from '../../ui/XYPad';
import { Tooltip as UiTooltip } from '../../ui/Tooltip';

interface MovingHeadCardProps {
  group: any;
  onMacro: (fixtureIds: number[], macro: string, groupId: string) => void;
  onIntensityChange: (fixtureIds: number[], type: 'dim' | 'str', val: number, groupId: string) => void;
  onColorChange: (fixtureIds: number[], r: number, g: number, b: number, groupId: string) => void;
  pan: number;
  tilt: number;
  handlePanChange: (val: string) => void;
  handleTiltChange: (val: string) => void;
}

export const MovingHeadCard = ({
  group,
  onMacro,
  onIntensityChange,
  onColorChange,
  pan,
  tilt,
  handlePanChange,
  handleTiltChange
}: MovingHeadCardProps) => {
  return (
    <div className="bg-[#111317] border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden">
      <div className="flex gap-8">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
              <Move className="w-3 h-3" /> {group.name}
            </h3>
          </div>
          <XYPad 
            x={pan} y={tilt} 
            onChange={(x, y) => {
              handlePanChange(Math.round(x).toString());
              handleTiltChange(Math.round(y).toString());
            }} 
          />
          <div className="flex gap-2">
            <UiTooltip text="Intensité maximale immédiate pour ce groupe">
              <button onClick={() => onIntensityChange(group.fixtureIds, 'dim', 255, group.id)} className="px-8 h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[12px] font-black uppercase shadow-[0_0_20px_rgba(37,99,235,0.5)] transition-all active:scale-95">FULL (100%)</button>
            </UiTooltip>
            <UiTooltip text="Éteindre ce groupe">
              <button onClick={() => onIntensityChange(group.fixtureIds, 'dim', 0, group.id)} className="flex-1 h-12 bg-slate-800 hover:bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase border border-white/5 transition-all active:scale-95">0%</button>
            </UiTooltip>
          </div>
        </div>

        <div className="flex-1 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-l-2 border-purple-500 pl-2">Couleurs</p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                {[
                  { l: 'W',  r: 255, g: 255, b: 255, hex: '#ffffff' },
                  { l: 'R',  r: 255, g: 0,   b: 0,   hex: '#ff0000' },
                  { l: 'Or', r: 255, g: 128, b: 0,   hex: '#ff8000' },
                  { l: 'Ja', r: 255, g: 255, b: 0,   hex: '#ffff00' },
                  { l: 'V',  r: 0,   g: 255, b: 0,   hex: '#00ff00' },
                  { l: 'B',  r: 0,   g: 0,   b: 255, hex: '#0000ff' },
                  { l: 'Cy', r: 0,   g: 255, b: 255, hex: '#00ffff' },
                  { l: 'Li', r: 255, g: 0,   b: 255, hex: '#ff00ff' },
                  { l: 'UV', r: 128, g: 0,   b: 255, hex: '#8000ff' },
                  { l: 'Ct', r: 255, g: 200, b: 100, hex: '#ffc864' }
                ].map(c => (
                  <button 
                    key={c.l} 
                    onClick={() => onColorChange(group.fixtureIds, c.r, c.g, c.b, group.id)}
                    style={{ backgroundColor: c.hex }}
                    className="w-12 h-12 rounded-lg border border-white/20 hover:scale-110 transition-all shadow-xl active:scale-90 flex items-center justify-center"
                  >
                    <span className="text-[10px] font-black text-white mix-blend-difference">{c.l}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-l-2 border-cyan-500 pl-2">Effets & Mouvements</p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <UiTooltip text="Cycle de couleurs automatique pour ces lyres" className="w-full">
                  <button 
                    onClick={() => onMacro(group.fixtureIds, 'U1', group.id)}
                    className="w-full h-12 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-[10px] font-black text-cyan-400 uppercase transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Activity className="w-3 h-3" /> Auto Color
                  </button>
                </UiTooltip>
                <UiTooltip text="Effet de pulsation rythmique pour ces lyres" className="w-full">
                  <button 
                    onClick={() => onMacro(group.fixtureIds, 'U3', group.id)}
                    className="w-full h-12 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-[10px] font-black text-amber-400 uppercase transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <HeartPulse className="w-3 h-3" /> Pulse
                  </button>
                </UiTooltip>
                <UiTooltip text="Mouvement circulaire automatique" className="col-span-2">
                  <button className="w-full h-12 bg-cyan-500/10 border-2 border-cyan-500/30 rounded-xl text-[10px] font-black text-cyan-400 uppercase hover:bg-cyan-500/20 active:scale-95">Circle</button>
                </UiTooltip>
                <UiTooltip text="Mouvement en ellipse automatique" className="col-span-2">
                  <button className="w-full h-12 bg-purple-500/10 border-2 border-purple-500/30 rounded-xl text-[10px] font-black text-purple-400 uppercase hover:bg-purple-500/20 active:scale-95">Ellipse</button>
                </UiTooltip>
              </div>
              <div className="space-y-4 pt-2">
                <ControlSlider label="Vitesse" value={0} onChange={() => {}} />
                <ControlSlider label="Taille" value={0} onChange={() => {}} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

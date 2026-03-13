import React from 'react';
import { Move, Activity, HeartPulse } from 'lucide-react';
import { ControlSlider } from '../../ui/ControlSlider';
import { XYPad } from '../../ui/XYPad';
import { Tooltip } from '../../ui/Tooltip';
import { VerticalSlider } from '../../ui/VerticalSlider';

interface MovementSectionProps {
  groups: any[];
  fixtures: any[];
  pan: number;
  tilt: number;
  handlePanChange: (val: string) => void;
  handleTiltChange: (val: string) => void;
  handleMultiFixtureAction: (ids: number[], action: any, val: any) => void;
  groupColors: Record<string, {r: number, g: number, b: number}>;
  groupIntensities: Record<string, {dim: number, str: number}>;
  currentMasterIntensity: number;
  isPulseActive: boolean;
  isAutoColorActive: boolean;
  sendIntensity: (ids: number[], type: 'dim' | 'str', val: number, groupId?: string) => void;
  sendColor: (ids: number[], r: number, g: number, b: number, groupId?: string) => void;
  handleMacro: (ids: number[], macro: string, groupId?: string) => void;
  channels: number[];
  updateDmx: (ch: number, val: number) => void;
}

export const MovementSection = ({
  groups,
  fixtures,
  pan,
  tilt,
  handlePanChange,
  handleTiltChange,
  handleMultiFixtureAction,
  groupColors,
  groupIntensities,
  currentMasterIntensity,
  isPulseActive,
  isAutoColorActive,
  sendIntensity,
  sendColor,
  handleMacro,
  channels,
  updateDmx
}: MovementSectionProps) => {
  const movingHeadGroups = groups.filter(g => fixtures.some(f => g.fixtureIds.includes(f.id) && f.type === 'Moving Head'));

  if (movingHeadGroups.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
        <Move className="w-3 h-3" /> MOUVEMENTS
      </h2>
      <div className="grid grid-cols-2 gap-6">
        {movingHeadGroups.map(group => (
          <div key={group.id} className="bg-[#111317] border border-white/5 rounded-[2.5rem] p-7 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] pointer-events-none" />
            
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">{group.name}</h3>
                <div className="flex gap-2">
                  {isPulseActive && <span className="px-1.5 py-0.5 bg-amber-500/20 text-[7px] font-black text-amber-500 rounded border border-amber-500/30">PULSE</span>}
                  {isAutoColorActive && <span className="px-1.5 py-0.5 bg-cyan-500/20 text-[7px] font-black text-cyan-400 rounded border border-cyan-500/30">AUTO-RAINBOW</span>}
                </div>
              </div>
              <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div 
                       className="w-4 h-4 rounded-full border border-white/20 shadow-lg"
                       style={{ 
                         backgroundColor: `rgb(${groupColors[group.id]?.r || 255}, ${groupColors[group.id]?.g || 255}, ${groupColors[group.id]?.b || 255})`,
                         boxShadow: `0 0 10px rgb(${groupColors[group.id]?.r || 0}, ${groupColors[group.id]?.g || 0}, ${groupColors[group.id]?.b || 0})`
                       }}
                    />
                    {/* VU-MÈTRE LOCAL HORIZONTAL */}
                    <div className="w-24 h-1.5 bg-slate-900 rounded-full overflow-hidden relative">
                       <div 
                         className="absolute left-0 h-full bg-blue-400 shadow-[0_0_10px_#60a5fa] transition-all duration-75"
                         style={{ width: `${( (groupIntensities[group.id]?.dim || 0) / 255 ) * (currentMasterIntensity / 255) * 100}%` }}
                       />
                    </div>
                  </div>
                  <Tooltip text="Intensité maximale immédiate pour ce groupe">
                    <button onClick={() => sendIntensity(group.fixtureIds, 'dim', 255, group.id)} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[12px] font-black uppercase shadow-[0_0_20px_rgba(37,99,235,0.5)] transition-all active:scale-95">FULL (100%)</button>
                  </Tooltip>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-8">
              {/* Colonne Lumière & Couleurs & Gobos */}
              <div className="col-span-4 space-y-8">
                <div className="space-y-3">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-l-2 border-blue-500 pl-2">Lumière</p>
                  <div className="flex gap-4 justify-center pt-2">
                    <VerticalSlider 
                      value={groupIntensities[group.id]?.dim || 0} 
                      onChange={(v) => sendIntensity(group.fixtureIds, 'dim', v, group.id)} 
                      label="Dim" 
                      height="h-32" 
                      color="bg-blue-500" 
                    />
                    <VerticalSlider 
                      value={groupIntensities[group.id]?.str || 0} 
                      onChange={(v) => sendIntensity(group.fixtureIds, 'str', v, group.id)} 
                      label="Str" 
                      height="h-32" 
                      color="bg-emerald-500" 
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-l-2 border-purple-500 pl-2">Couleurs</p>
                  <div className="grid grid-cols-5 gap-1.5 pt-2">
                    {[
                      { l: 'W',  r: 255, g: 255, b: 255 },
                      { l: 'R',  r: 255, g: 0,   b: 0   },
                      { l: 'Or', r: 255, g: 128, b: 0   },
                      { l: 'Ja', r: 255, g: 255, b: 0   },
                      { l: 'V',  r: 0,   g: 255, b: 0   },
                      { l: 'B',  r: 0,   g: 0,   b: 255 },
                      { l: 'Cy', r: 0,   g: 255, b: 255 },
                      { l: 'Li', r: 255, g: 0,   b: 255 },
                      { l: 'UV', r: 128, g: 0,   b: 255 },
                      { l: 'Ct', r: 255, g: 200, b: 100 }
                    ].map(c => (
                      <button 
                        key={c.l} 
                        onClick={() => sendColor(group.fixtureIds, c.r, c.g, c.b, group.id)}
                        className="aspect-square bg-slate-800/80 border border-white/5 rounded-md text-[9px] font-black text-slate-400 hover:text-white hover:border-white/20 transition-all active:scale-90"
                      >
                        {c.l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Colonne Gobos & Mouvement */}
              <div className="col-span-8 flex gap-8">
                <div className="space-y-3 shrink-0">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-l-2 border-amber-500 pl-2">Gobos</p>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {[0,1,2,3,4,5,6,7].map(g => (
                      <button key={g} className="w-10 h-10 bg-slate-800/80 border border-white/5 rounded-xl text-[10px] font-black text-slate-500 hover:text-white transition-all">{g || '∅'}</button>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 pt-2 cursor-pointer group">
                    <input type="checkbox" className="w-3 h-3 accent-amber-500" />
                    <span className="text-[8px] font-black text-slate-500 uppercase group-hover:text-slate-300">Auto-Gobo</span>
                  </label>
                </div>

                <div className="flex-1 space-y-3">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-l-2 border-cyan-500 pl-2">Mouvement</p>
                  <div className="flex gap-6 pt-2">
                    <div className="space-y-4">
                      <XYPad x={pan} y={tilt} onChange={(nx, ny) => {
                        handlePanChange(nx.toString());
                        handleTiltChange(ny.toString());
                        handleMultiFixtureAction(group.fixtureIds, 'pan', nx);
                        handleMultiFixtureAction(group.fixtureIds, 'tilt', ny);
                      }} size={180} />
                      <div className="flex justify-between gap-2">
                         <Tooltip text="Recentrer le faisceau" className="flex-1">
                           <button className="w-full py-3 bg-slate-800 rounded-xl text-[9px] font-black text-slate-400 border border-white/5 uppercase hover:bg-slate-700 active:scale-95">Center</button>
                         </Tooltip>
                         <Tooltip text="Rotation à 180°" className="flex-1">
                           <button className="w-full py-3 bg-slate-800 rounded-xl text-[9px] font-black text-slate-400 border border-white/5 uppercase hover:bg-slate-700 active:scale-95">180°</button>
                         </Tooltip>
                      </div>
                    </div>

                    <div className="flex-1 space-y-4">
                       <div className="grid grid-cols-2 gap-2">
                          <Tooltip text="Cycle de couleurs automatique pour ces lyres" className="w-full">
                            <button 
                               onClick={() => handleMacro(group.fixtureIds, 'U1', group.id)}
                               className="w-full py-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-[10px] font-black text-cyan-400 uppercase transition-all flex items-center justify-center gap-2 active:scale-95"
                             >
                               <Activity className="w-3 h-3" /> Auto Color
                             </button>
                          </Tooltip>
                          <Tooltip text="Mode Pulse synchronisé sur le BPM" className="w-full">
                            <button 
                               onClick={() => handleMacro(group.fixtureIds, 'U2', group.id)}
                               className="w-full py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-[10px] font-black text-amber-500 uppercase transition-all flex items-center justify-center gap-2 active:scale-95"
                             >
                               <HeartPulse className="w-3 h-3" /> Pulse
                             </button>
                          </Tooltip>
                       </div>
                       
                       <div className="space-y-4 pt-2">
                          <ControlSlider label="Vitesse Rotation" value={0} onChange={() => {}} />
                          <ControlSlider label="Taille" value={0} onChange={() => {}} />
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

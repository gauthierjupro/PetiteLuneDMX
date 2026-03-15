import React from 'react';
import { Move, Activity, HeartPulse, RefreshCw, Settings2, Sparkles } from 'lucide-react';
import { ControlSlider } from '../../ui/ControlSlider';
import { XYPad } from '../../ui/XYPad';
import { Tooltip } from '../../ui/Tooltip';
import { VerticalSlider } from '../../ui/VerticalSlider';

interface MovementSectionProps {
  groups: any[];
  fixtures: any[];
  handlePanChange: (val: string) => void;
  handleTiltChange: (val: string) => void;
  handleMultiFixtureAction: (ids: number[], action: any, val: any) => void;
  groupColors: Record<string, {r: number, g: number, b: number, v?: number}>;
  groupIntensities: Record<string, {dim: number, str: number}>;
  currentMasterIntensity: number;
  groupPulseActive: Record<string, boolean>;
  groupAutoColorActive: Record<string, boolean>;
  groupAutoGoboActive: Record<string, boolean>;
  groupGobos: Record<string, number>;
  groupPan: Record<string, number>;
  groupTilt: Record<string, number>;
  liveGroupPositions: Record<string, { pan: number, tilt: number }>;
  liveGroupColors: Record<string, number>;
  liveGroupGobos: Record<string, number>;
  sendIntensity: (ids: number[], type: 'dim' | 'str', val: number, groupId?: string) => void;
  sendColor: (ids: number[], r: number, g: number, b: number, groupId?: string, isAuto?: boolean, wheelValue?: number) => void;
  sendMovement: (ids: number[], pan: number, tilt: number, groupId: string) => void;
  handleMacro: (ids: number[], macro: string, groupId?: string) => void;
  onStrobeEdit: (groupId: string | null) => void;
  groupStrobeValues: Record<string, number>;
  channels: any[];
  updateDmx: (channel: number, value: number) => void;
  onOpenCalibration: () => void;
  onOpenEffects: (groupId: string, groupName: string, fixtureIds: number[]) => void;
}

export const MovementSection = ({
  groups,
  fixtures,
  handlePanChange,
  handleTiltChange,
  handleMultiFixtureAction,
  groupColors,
  groupIntensities,
  currentMasterIntensity,
  groupPulseActive,
  groupAutoColorActive,
  groupAutoGoboActive,
  groupGobos,
  groupPan,
  groupTilt,
  liveGroupPositions,
  liveGroupColors,
  liveGroupGobos,
  sendIntensity,
  sendColor,
  sendMovement,
  handleMacro,
  onStrobeEdit,
  groupStrobeValues,
  channels,
  updateDmx,
  onOpenCalibration,
  onOpenEffects
}: MovementSectionProps) => {
  const getLiveIntensity = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group || !group.fixtureIds || group.fixtureIds.length === 0) return 0;
    
    // On prend le premier projecteur du groupe comme référence
    const firstFixtureId = group.fixtureIds[0];
    const fixture = fixtures.find(f => f.id === firstFixtureId);
    
    if (!fixture) return 0;
    
    const address = fixture.address - 1;
    let dmxValue = 0;
    
    if (fixture.type === 'RGB') {
      dmxValue = channels[address] || 0;
    } else if (fixture.type === 'Moving Head') {
      // Pour PicoSpot 20, le dimmer est au canal 6 (address + 5)
      dmxValue = channels[address + 5] || 0;
    } else if (fixture.type === 'Effect') {
      dmxValue = channels[address] || 0;
    }
    
    return (dmxValue / 255) * 100;
  };

  const movingHeadGroups = groups.filter(g => fixtures.some(f => g.fixtureIds.includes(f.id) && f.type === 'Moving Head'));

  if (movingHeadGroups.length === 0) return null;

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-lg shadow-blue-500/5">
            <Move className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tighter uppercase italic">Mouvements</h2>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-0.5">Contrôle des lyres & Calibration</p>
          </div>
        </div>

        <button 
          onClick={onOpenCalibration}
          className="flex items-center gap-3 px-6 py-3 bg-slate-800/50 hover:bg-slate-700/50 border border-white/5 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest transition-all hover:text-cyan-400 hover:border-cyan-500/30 active:scale-95 group"
        >
          <Settings2 className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-500" />
          Paramétrage des lyres
        </button>
      </div>
      <div className="grid grid-cols-2 gap-6">
        {movingHeadGroups.map(group => {
          const liveHeight = getLiveIntensity(group.id);
          const firstFixtureId = group.fixtureIds[0];
          const fixture = fixtures.find(f => f.id === firstFixtureId);
          const isPicoSpot = fixture?.model === 'PicoSpot 20';
          
          return (
            <div key={group.id} className="bg-[#111317] border-2 border-blue-500/20 rounded-[2rem] p-5 space-y-5 shadow-[0_0_40px_rgba(0,0,0,0.5),0_0_20px_rgba(59,130,246,0.1)] relative overflow-hidden group/card">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] pointer-events-none group-hover/card:bg-blue-500/20 transition-colors duration-500" />
              
              <div className="flex justify-between items-center border-b border-white/10 pb-3 relative z-10">
                <div className="flex items-center gap-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">{group.name}</h3>
                  <div className="flex gap-2">
                    {groupPulseActive[group.id] && <span className="px-1.5 py-0.5 bg-amber-500/20 text-[8px] font-black text-amber-500 rounded border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]">PULSE</span>}
                    {groupAutoColorActive[group.id] && <span className="px-1.5 py-0.5 bg-cyan-500/20 text-[8px] font-black text-cyan-400 rounded border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]">AUTO-RAINBOW</span>}
                    {groupAutoGoboActive[group.id] && <span className="px-1.5 py-0.5 bg-indigo-500/20 text-[8px] font-black text-indigo-400 rounded border border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.2)]">AUTO-GOBO</span>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div 
                       className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-lg"
                       style={{ 
                         backgroundColor: `rgb(${groupColors[group.id]?.r || 255}, ${groupColors[group.id]?.g || 255}, ${groupColors[group.id]?.b || 255})`,
                         boxShadow: `0 0 10px rgb(${groupColors[group.id]?.r || 0}, ${groupColors[group.id]?.g || 0}, ${groupColors[group.id]?.b || 0})`
                       }}
                    />
                    <div className="w-20 h-1 bg-slate-900 rounded-full overflow-hidden relative shadow-inner">
                       <div 
                         className="absolute left-0 h-full bg-blue-400 shadow-[0_0_10px_#60a5fa] transition-all duration-75"
                         style={{ width: `${liveHeight}%` }}
                       />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-7 flex gap-3">
                  <div className="space-y-3 w-fit shrink-0">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-l-2 border-blue-500 pl-2">Lumière</p>
                    <div className="flex gap-2 pt-1">
                      <div className="flex flex-col items-center gap-2">
                        <VerticalSlider 
                          value={groupIntensities[group.id]?.dim || 0} 
                          onChange={(v) => sendIntensity(group.fixtureIds, 'dim', v, group.id)} 
                          label="Dim" 
                          height="h-28" 
                          color="bg-blue-500" 
                        />
                        <div className="flex flex-col gap-1 w-full pt-1">
                          <Tooltip text="100%" className="w-full">
                            <button onClick={() => sendIntensity(group.fixtureIds, 'dim', 255, group.id)} className="w-full py-1.5 bg-blue-500 hover:bg-blue-400 text-[#05070a] rounded-lg text-[9px] font-black uppercase transition-all active:scale-90 shadow-lg">100%</button>
                          </Tooltip>
                          <Tooltip text="0%" className="w-full">
                            <button onClick={() => sendIntensity(group.fixtureIds, 'dim', 0, group.id)} className="w-full py-1.5 bg-slate-800 hover:bg-rose-600 text-white rounded-lg text-[9px] font-black uppercase border border-white/5 transition-all active:scale-90">0%</button>
                          </Tooltip>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <VerticalSlider 
                          value={groupIntensities[group.id]?.str || 0} 
                          onChange={(v) => sendIntensity(group.fixtureIds, 'str', v, group.id)} 
                          label="Str" 
                          height="h-28" 
                          color="bg-emerald-500" 
                        />
                        <div className="flex flex-col gap-1 w-full pt-1">
                          <Tooltip text={`Strobe ${Math.round(((groupStrobeValues[group.id] || 255) / 255) * 100)}% (Clic droit pour régler)`} className="w-full">
                            <button 
                              onClick={() => sendIntensity(group.fixtureIds, 'str', groupStrobeValues[group.id] || 255, group.id)} 
                              onContextMenu={(e) => {
                                e.preventDefault();
                                onStrobeEdit(group.id);
                              }}
                              className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-400 text-[#05070a] rounded-lg text-[9px] font-black uppercase transition-all active:scale-90 shadow-lg"
                            >
                              {Math.round(((groupStrobeValues[group.id] || 255) / 255) * 100)}%
                            </button>
                          </Tooltip>
                          <Tooltip text="Strobe 0%" className="w-full">
                            <button onClick={() => sendIntensity(group.fixtureIds, 'str', 0, group.id)} className="w-full py-1.5 bg-slate-800 hover:bg-rose-600 text-white rounded-lg text-[9px] font-black uppercase border border-white/5 transition-all active:scale-90">0%</button>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 w-fit shrink-0">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-l-2 border-purple-500 pl-2">Couleurs</p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {[
                        { l: 'W',  r: 255, g: 255, b: 255, hex: '#ffffff', v: 5 },
                        { l: 'R',  r: 255, g: 0,   b: 0,   hex: '#ff0000', v: 16 },
                        { l: 'Or', r: 255, g: 128, b: 0,   hex: '#ff8000', v: 27 },
                        { l: 'Ja', r: 255, g: 255, b: 0,   hex: '#ffff00', v: 38 },
                        { l: 'V',  r: 0,   g: 255, b: 0,   hex: '#00ff00', v: 49 },
                        { l: 'B',  r: 0,   g: 0,   b: 255, hex: '#0000ff', v: 60 },
                        { l: 'Cy', r: 0,   g: 255, b: 255, hex: '#00ffff', v: 71 },
                        { l: 'Li', r: 255, g: 0,   b: 255, hex: '#ff00ff', v: 82 }
                      ].map(c => (
                        <button 
                          key={c.l} 
                          onClick={() => sendColor(group.fixtureIds, c.r, c.g, c.b, group.id, false, c.v)}
                          style={{ backgroundColor: c.hex }}
                          className={`w-10 h-10 rounded-lg border transition-all shadow-xl active:scale-90 flex items-center justify-center ${
                            groupAutoColorActive[group.id]
                            ? (liveGroupColors[group.id] === c.v ? 'border-white border-[3px] scale-105 shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'border-white/20 hover:scale-105')
                            : (groupColors[group.id]?.v === c.v ? 'border-white border-[3px] scale-105 shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'border-white/20 hover:scale-105')
                          }`}
                          title={c.l}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 shrink-0">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-l-2 border-amber-500 pl-2">Gobos</p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {[0, 1, 2, 3, 4, 5, 6, 7].map(g => (
                        <button 
                          key={g} 
                          onClick={() => handleMacro(group.fixtureIds, `G${g}`, group.id)}
                          className={`w-10 h-10 border rounded-lg text-[9px] font-black transition-all ${
                            groupAutoGoboActive[group.id]
                            ? (liveGroupGobos[group.id] === g ? 'bg-amber-500 text-[#05070a] border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-105' : 'bg-slate-800/80 border-white/5 text-slate-500 hover:text-white')
                            : (groupGobos[group.id] === g ? 'bg-amber-500 text-[#05070a] border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-105' : 'bg-slate-800/80 border-white/5 text-slate-500 hover:text-white')
                          }`}
                        >
                          {g || '∅'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 shrink-0">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-l-2 border-indigo-500 pl-2">Modes</p>
                    <div className="flex flex-col gap-2 pt-1">
                      <Tooltip text="Cycle automatique des couleurs" className="w-full">
                        <button 
                          onClick={() => handleMacro(group.fixtureIds, 'U1', group.id)}
                          className={`w-24 h-10 border rounded-lg text-[9px] font-black uppercase transition-all flex items-center justify-center gap-2 active:scale-90 duration-75 ${groupAutoColorActive[group.id] ? 'bg-cyan-500 text-[#05070a] border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-400'}`}
                        >
                          <Activity className={`w-3 h-3 ${groupAutoColorActive[group.id] ? 'animate-pulse' : ''}`} /> Auto
                        </button>
                      </Tooltip>
                      <Tooltip text="Effet de pulsation rythmique" className="w-full">
                        <button 
                          onClick={() => handleMacro(group.fixtureIds, 'U3', group.id)}
                          className={`w-24 h-10 border rounded-lg text-[9px] font-black uppercase transition-all flex items-center justify-center gap-2 active:scale-90 duration-75 ${groupPulseActive[group.id] ? 'bg-amber-500 text-[#05070a] border-amber-400 shadow-[0_0_15_px_rgba(245,158,11,0.4)]' : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-400'}`}
                        >
                          <HeartPulse className={`w-3 h-3 ${groupPulseActive[group.id] ? 'animate-bounce' : ''}`} /> Pulse
                        </button>
                      </Tooltip>
                      <Tooltip text="Cycle automatique des gobos" className="w-full">
                        <button 
                          onClick={() => handleMacro(group.fixtureIds, 'U6', group.id)}
                          className={`w-24 h-10 border rounded-lg text-[9px] font-black uppercase transition-all flex items-center justify-center gap-2 active:scale-90 duration-75 ${groupAutoGoboActive[group.id] ? 'bg-indigo-500 text-[#05070a] border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/30 text-indigo-400'}`}
                        >
                          <RefreshCw className={`w-3 h-3 ${groupAutoGoboActive[group.id] ? 'animate-spin' : ''}`} /> Auto Gobo
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </div>

                <div className="col-span-5 flex gap-3 pt-0.5 border-l border-white/5 pl-3">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between pr-1">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-l-2 border-cyan-500 pl-2">Mouvement</p>
                      <Tooltip text="Ouvrir les effets de mouvement">
                        <button 
                          onClick={() => onOpenEffects(group.id, group.name, group.fixtureIds)}
                          className="px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg text-[9px] font-black text-purple-400 uppercase transition-all flex items-center justify-center gap-1.5 active:scale-90 duration-75 group/eff"
                        >
                          <Sparkles className="w-2.5 h-2.5 group-hover/eff:animate-pulse" /> Effets
                        </button>
                      </Tooltip>
                    </div>
                    <div className="flex gap-3 pt-1">
                      <div className="space-y-3 shrink-0 relative">
                        <XYPad 
                          x={groupPan[group.id] ?? 127} 
                          y={groupTilt[group.id] ?? 127} 
                          onChange={(nx, ny) => {
                            sendMovement(group.fixtureIds, nx, ny, group.id);
                          }} 
                          size={160} 
                        />
                        
                        {/* Point de mouvement LIVE si actif */}
                        {liveGroupPositions[group.id] && (
                          <div 
                            className="absolute pointer-events-none w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee] border border-white/50 transition-all duration-75 z-20"
                            style={{
                              left: `${(liveGroupPositions[group.id].pan / 255) * 160}px`,
                              top: `${(liveGroupPositions[group.id].tilt / 255) * 160}px`,
                              transform: 'translate(-50%, -50%)'
                            }}
                          />
                        )}
                        
                        <div className="flex gap-1">
                           <Tooltip text="Recentrer le faisceau (127, 127)" className="flex-1">
                             <button 
                               onClick={() => sendMovement(group.fixtureIds, 127, 127, group.id)}
                               className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-[8px] font-black text-slate-500 uppercase rounded-lg border border-white/5 transition-all"
                             >
                               Center
                             </button>
                           </Tooltip>
                           <Tooltip text="Inverser la position (Rotation 180°)" className="flex-1">
                             <button 
                               onClick={() => sendMovement(group.fixtureIds, 255 - (groupPan[group.id] || 127), 255 - (groupTilt[group.id] || 127), group.id)}
                               className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-[8px] font-black text-slate-500 uppercase rounded-lg border border-white/5 transition-all"
                             >
                               180°
                             </button>
                           </Tooltip>
                         </div>
                      </div>

                      <div className="flex-1 space-y-2 pt-1">
                        <div className="bg-black/40 p-2.5 rounded-xl border border-white/5 space-y-2 shadow-inner">
                           <div className="flex justify-between items-center border-b border-white/10 pb-1">
                             <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Pan</span>
                             <span className="text-[10px] font-mono font-black text-cyan-400">{Math.round(liveGroupPositions[group.id]?.pan ?? groupPan[group.id] ?? 127)}</span>
                           </div>
                           <div className="flex justify-between items-center">
                             <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Tilt</span>
                             <span className="text-[10px] font-mono font-black text-indigo-400">{Math.round(liveGroupPositions[group.id]?.tilt ?? groupTilt[group.id] ?? 127)}</span>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

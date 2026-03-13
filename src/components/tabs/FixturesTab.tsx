import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { ControlSlider } from '../ui/ControlSlider';
import { Layout, Settings as SettingsIcon, Sun, Move, Zap, Wind } from 'lucide-react';

interface Fixture {
  id: number;
  name: string;
  manufacturer: string;
  model: string;
  address: number;
  channels: number;
  type: string;
  channelMap?: string[];
}

interface FixturesTabProps {
  fixtures: Fixture[];
  selectedFixture: number | null;
  setSelectedFixture: (id: number | null) => void;
  getFixtureById: (id: number | null) => Fixture | undefined;
  channels: number[];
  updateDmx: (ch: number, val: string | number) => void;
  onIdentify?: (fixtureId: number) => void;
}

export const FixturesTab = ({ 
  fixtures, 
  selectedFixture, 
  setSelectedFixture, 
  getFixtureById, 
  channels, 
  updateDmx,
  onIdentify
}: FixturesTabProps) => {
  const current = getFixtureById(selectedFixture);

  const getSliderColor = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('rouge') || l.includes('red')) return 'bg-red-500';
    if (l.includes('vert') || l.includes('green')) return 'bg-green-500';
    if (l.includes('bleu') || l.includes('blue')) return 'bg-blue-500';
    if (l.includes('blanc') || l.includes('white')) return 'bg-slate-100';
    if (l.includes('ambre') || l.includes('amber')) return 'bg-orange-400';
    if (l.includes('uv')) return 'bg-purple-600';
    if (l.includes('pan') || l.includes('tilt')) return 'bg-cyan-500';
    if (l.includes('dimmer') || l.includes('intensité')) return 'bg-white/80';
    return undefined;
  };

  const renderDynamicSliders = (fixture: Fixture) => {
    if (!fixture.channelMap) return null;

    return (
      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {fixture.channelMap.map((func, index) => (
          <ControlSlider 
            key={index}
            label={func.charAt(0).toUpperCase() + func.slice(1)} 
            value={channels[fixture.address - 1 + index]} 
            onChange={(v) => updateDmx(fixture.address - 1 + index, v)}
            color={getSliderColor(func)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-12 gap-8 h-[calc(100vh-200px)]">
      <div className="col-span-9 flex flex-col h-full">
        <GlassCard title="Patch & Sélection" icon={Layout} className="flex-1 overflow-hidden">
          <div className="grid grid-cols-8 gap-4 overflow-y-auto pr-2 custom-scrollbar h-full">
            {fixtures.map((fixture) => (
              <div 
                key={fixture.id} 
                onClick={() => setSelectedFixture(fixture.id)}
                className={`aspect-square border rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all group ${
                  selectedFixture === fixture.id 
                    ? 'bg-cyan-500/20 border-cyan-500/50' 
                    : 'bg-slate-800 border-white/5 hover:border-cyan-500/50 hover:bg-cyan-500/5'
                }`}
              >
                <span className={`text-[10px] font-mono ${selectedFixture === fixture.id ? 'text-cyan-400' : 'text-slate-500'}`}>#{fixture.id}</span>
                {fixture.type === 'RGB' && <Sun className={`w-4 h-4 ${selectedFixture === fixture.id ? 'text-cyan-400' : 'text-slate-600 group-hover:text-cyan-400'}`} />}
                {fixture.type === 'Moving Head' && <Move className={`w-4 h-4 ${selectedFixture === fixture.id ? 'text-cyan-400' : 'text-slate-600 group-hover:text-cyan-400'}`} />}
                {fixture.type === 'Laser' && <Zap className={`w-4 h-4 ${selectedFixture === fixture.id ? 'text-cyan-400' : 'text-slate-600 group-hover:text-cyan-400'}`} />}
                {fixture.type === 'Effect' && <Wind className={`w-4 h-4 ${selectedFixture === fixture.id ? 'text-cyan-400' : 'text-slate-600 group-hover:text-cyan-400'}`} />}
                <span className={`text-[8px] font-bold uppercase text-center px-1 truncate w-full ${selectedFixture === fixture.id ? 'text-cyan-400' : 'text-slate-400'}`}>
                  {fixture.name}
                </span>
                <span className="text-[7px] opacity-30 font-mono">CH {fixture.address}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
      <div className="col-span-3 flex flex-col h-full">
        <GlassCard title="Propriétés" icon={SettingsIcon} className="flex-1 overflow-hidden flex flex-col">
          {selectedFixture !== null && current ? (
            <div className="flex flex-col h-full">
              <div className="pb-4 border-b border-white/5 shrink-0">
                <h3 className="text-xs font-bold text-cyan-400 uppercase mb-1 truncate">{current.name}</h3>
                <p className="text-[10px] text-slate-500 truncate">{current.manufacturer} {current.model}</p>
                <p className="text-[10px] text-slate-500">DMX: {current.address} ({current.channels} CH)</p>
              </div>

              <div className="flex-1 overflow-hidden pt-4">
                {current.channelMap ? (
                  renderDynamicSliders(current)
                ) : (
                  <div className="space-y-6">
                    {current.type === 'RGB' && (
                      <div className="space-y-4">
                        <ControlSlider label="Intensité" value={channels[current.address - 1]} onChange={(v) => updateDmx(current.address - 1, v)} />
                        <ControlSlider label="Rouge" value={channels[current.address]} onChange={(v) => updateDmx(current.address, v)} color="bg-red-500" />
                        <ControlSlider label="Vert" value={channels[current.address + 1]} onChange={(v) => updateDmx(current.address + 1, v)} color="bg-green-500" />
                        <ControlSlider label="Bleu" value={channels[current.address + 2]} onChange={(v) => updateDmx(current.address + 2, v)} color="bg-blue-500" />
                        <ControlSlider label="Strobe" value={channels[current.address + 3]} onChange={(v) => updateDmx(current.address + 3, v)} />
                      </div>
                    )}

                    {current.type === 'Moving Head' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <ControlSlider label="Pan" value={channels[current.address - 1]} onChange={(v) => updateDmx(current.address - 1, v)} />
                          <ControlSlider label="Tilt" value={channels[current.address + 1]} onChange={(v) => updateDmx(current.address + 1, v)} />
                        </div>
                        <ControlSlider label="Vitesse" value={channels[current.address + 3]} onChange={(v) => updateDmx(current.address + 3, v)} />
                        <ControlSlider label="Intensité" value={channels[current.address + 4]} onChange={(v) => updateDmx(current.address + 4, v)} />
                        <ControlSlider label="Gobo" value={channels[current.address + 5]} onChange={(v) => updateDmx(current.address + 5, v)} />
                        <ControlSlider label="Couleur" value={channels[current.address + 6]} onChange={(v) => updateDmx(current.address + 6, v)} />
                      </div>
                    )}

                    {current.type === 'Laser' && (
                      <div className="space-y-4">
                        <ControlSlider label="Mode" value={channels[current.address - 1]} onChange={(v) => updateDmx(current.address - 1, v)} />
                        <ControlSlider label="Pattern" value={channels[current.address]} onChange={(v) => updateDmx(current.address, v)} />
                        <ControlSlider label="Intensité" value={channels[current.address + 2]} onChange={(v) => updateDmx(current.address + 2, v)} />
                        <div className="grid grid-cols-2 gap-4">
                          <ControlSlider label="Pan" value={channels[current.address + 3]} onChange={(v) => updateDmx(current.address + 3, v)} />
                          <ControlSlider label="Tilt" value={channels[current.address + 4]} onChange={(v) => updateDmx(current.address + 4, v)} />
                        </div>
                      </div>
                    )}

                    {current.type === 'Effect' && (
                      <div className="space-y-4">
                        <ControlSlider label="Mode" value={channels[current.address - 1]} onChange={(v) => updateDmx(current.address - 1, v)} />
                        <ControlSlider label="Vitesse" value={channels[current.address]} onChange={(v) => updateDmx(current.address, v)} />
                        <ControlSlider label="Couleur/Effet" value={channels[current.address + 1]} onChange={(v) => updateDmx(current.address + 1, v)} />
                        <ControlSlider label="Moteur" value={channels[current.address + 3]} onChange={(v) => updateDmx(current.address + 3, v)} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button 
                onClick={() => onIdentify && onIdentify(current.id)}
                className="w-full py-2 mt-4 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-[10px] font-bold uppercase text-cyan-400 transition-all shrink-0"
              >
                Identifier (Flash 1.5s)
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">Sélectionnez un projecteur pour voir ses propriétés...</p>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

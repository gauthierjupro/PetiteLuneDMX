import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Zap, Lock, Unlock } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';

interface Fixture {
  id: number;
  name: string;
  manufacturer: string;
  model: string;
  address: number;
  channels: number;
  type: string;
}

interface DmxConsoleTabProps {
  fixtures: Fixture[];
  channels: number[];
  updateDmx: (ch: number, val: string | number) => void;
  onIdentify?: (fixtureId: number) => void;
}

const getChannelLabel = (type: string, index: number) => {
  if (type === 'RGB') {
    const labels = ['Intensité', 'Rouge', 'Vert', 'Bleu', 'Strobe', 'Programme', 'ID', 'Fonction'];
    return labels[index] || '-';
  }
  if (type === 'Moving Head') {
    const labels = ['Pan', 'Pan Fine', 'Tilt', 'Tilt Fine', 'Vitesse', 'Intensité', 'Gobo', 'Couleur', 'Strobe'];
    return labels[index] || '-';
  }
  return `CH ${index + 1}`;
};

const getChannelColor = (label: string) => {
  if (label === 'Rouge' || label === 'R') return 'bg-red-500';
  if (label === 'Vert' || label === 'V') return 'bg-green-500';
  if (label === 'Bleu' || label === 'B') return 'bg-blue-500';
  if (label === 'Intensité' || label === 'I') return 'bg-yellow-500';
  if (label === 'Strobe' || label === 'S') return 'bg-white';
  if (label === 'Programme' || label === 'M') return 'bg-purple-500';
  return 'bg-slate-600';
};

// --- Sous-composant pour un canal individuel (Optimisé) ---
const DmxChannelSlider = React.memo(({ 
  chAddr, 
  value, 
  label, 
  updateDmx,
  isManualMode 
}: { 
  chAddr: number, 
  value: number, 
  label: string, 
  updateDmx: (ch: number, val: number) => void,
  isManualMode: boolean
}) => {
  const [localVal, setLocalVal] = React.useState(value);
  const [isDragging, setIsDragging] = React.useState(false);
  const lastSentVal = React.useRef(value);

  // Synchronisation forcée avec l'univers DMX global
  React.useEffect(() => {
    if (!isManualMode && !isDragging) {
      setLocalVal(value);
    }
  }, [value, isManualMode, isDragging]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = parseInt(e.target.value);
    setLocalVal(newVal); // Mise à jour UI instantanée (60fps)
    
    // Si on est en mode manuel, on envoie les valeurs à Rust
    if (isManualMode && newVal !== lastSentVal.current) {
      lastSentVal.current = newVal;
      updateDmx(chAddr - 1, newVal);
    }
  };

  return (
    <div className="flex flex-col items-center min-w-[50px] space-y-3">
      <div className="relative h-32 w-10 bg-slate-950/80 rounded-full border border-white/5 flex items-center justify-center p-1 group/slider">
        <input
          type="range"
          min="0"
          max="255"
          value={localVal}
          onChange={handleChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          className="absolute h-28 w-1 accent-blue-500 appearance-none bg-transparent cursor-pointer vertical-range z-20"
          style={{ transform: 'rotate(-90deg)', width: '112px' }}
        />
        <div 
          className="absolute w-8 h-8 bg-blue-600 rounded-full shadow-lg border border-white/20 pointer-events-none flex items-center justify-center transition-transform duration-75 ease-out"
          style={{ transform: `translateY(${-((localVal / 255) * 80 - 40)}px)` }}
        >
          <div className="w-1 h-4 bg-white/30 rounded-full" />
        </div>
      </div>

      <div className="text-center space-y-1">
        <span className="text-[10px] font-mono font-bold text-slate-300 block">{localVal}</span>
        <div className={`h-1 w-full rounded-full ${getChannelColor(label)}`} />
        <span className="text-[8px] font-black uppercase text-slate-500 block truncate w-full">{label}</span>
        <span className="text-[10px] font-mono text-slate-600 block">{chAddr}</span>
      </div>
    </div>
  );
});

DmxChannelSlider.displayName = 'DmxChannelSlider';

export const DmxConsoleTab = ({ fixtures, channels, updateDmx, onIdentify }: DmxConsoleTabProps) => {
  const [isManualMode, setIsManualMode] = React.useState(false);

  const toggleManualMode = async () => {
    const newState = !isManualMode;
    setIsManualMode(newState);
    try {
      await invoke('set_manual_override', { overrideActive: newState });
    } catch (e) {
      console.error(e);
    }
  };

  // On wrappe updateDmx pour être sûr qu'elle soit stable pour React.memo
  const stableUpdateDmx = React.useCallback((ch: number, val: number) => {
    updateDmx(ch, val);
  }, [updateDmx]);

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Barre d'outils de la Console */}
      <div className="flex items-center justify-between bg-slate-900/50 backdrop-blur-xl border border-white/5 p-4 rounded-3xl shadow-2xl">
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-xl ${isManualMode ? 'bg-orange-500/20 text-orange-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
            {isManualMode ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest">
              Mode: {isManualMode ? 'Pilotage Manuel (Override)' : 'Visualisation Univers'}
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase">
              {isManualMode ? 'Les mouvements automatiques sont désactivés' : 'Affiche les valeurs réelles calculées par le moteur'}
            </p>
          </div>
        </div>

        <button 
          onClick={toggleManualMode}
          className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all border ${
            isManualMode 
              ? 'bg-orange-500 text-[#05070a] border-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.3)]' 
              : 'bg-slate-800 text-slate-400 border-white/10 hover:border-cyan-500/50 hover:text-cyan-400'
          }`}
        >
          {isManualMode ? 'Désactiver Manuel' : 'Activer Pilotage Manuel'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6 overflow-y-auto max-h-[calc(100vh-260px)] pr-2 custom-scrollbar">
        {fixtures.map((fixture) => (
          <div key={fixture.id} className="relative group">
            <div className={`absolute inset-0 rounded-3xl opacity-20 bg-gradient-to-br ${
              fixture.type === 'RGB' ? 'from-emerald-500 to-teal-600' : 
              fixture.type === 'Moving Head' ? 'from-blue-500 to-indigo-600' : 'from-slate-500 to-slate-600'
            }`} />
            
            <GlassCard 
              title={`${fixture.name} [Addr ${fixture.address}]`} 
              className="border-white/5 relative overflow-hidden"
            >
              <button 
                onClick={() => onIdentify && onIdentify(fixture.id)}
                className="absolute top-4 right-6 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg transition-colors z-10"
              >
                ID
              </button>

              <div className="flex gap-2 overflow-x-auto pb-2 pt-2 scrollbar-none">
                {Array.from({ length: fixture.channels }).map((_, idx) => {
                  const chAddr = fixture.address + idx;
                  const label = getChannelLabel(fixture.type, idx);
                  
                  return (
                    <DmxChannelSlider
                      key={idx}
                      chAddr={chAddr}
                      value={channels[chAddr - 1] || 0}
                      label={label}
                      updateDmx={stableUpdateDmx}
                      isManualMode={isManualMode}
                    />
                  );
                })}
              </div>
            </GlassCard>
          </div>
        ))}
      </div>
    </div>
  );
};

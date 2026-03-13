import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Zap, Lock, Unlock } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';
import { ValuePromptModal } from '../ui/ValuePromptModal';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isManualMode) return;
    setIsModalOpen(true);
  };

  const handleModalSubmit = (input: string) => {
    if (input !== "") {
      let newVal: number;
      if (input.includes('%')) {
        const percent = parseFloat(input.replace('%', ''));
        if (!isNaN(percent)) {
          newVal = Math.round((percent / 100) * 255);
        } else return;
      } else {
        newVal = parseInt(input);
      }

      if (!isNaN(newVal)) {
        const finalVal = Math.min(255, Math.max(0, newVal));
        setLocalVal(finalVal);
        updateDmx(chAddr - 1, finalVal);
      }
    }
  };

  return (
    <>
      <div 
        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${isManualMode ? 'bg-white/5 border border-white/5 shadow-inner ring-1 ring-white/10' : 'opacity-40 grayscale group-hover:grayscale-0'}`}
        onContextMenu={handleContextMenu}
      >
        <div className="relative h-24 w-6 flex items-center justify-center">
          <div className="absolute inset-0 w-1.5 left-1/2 -translate-x-1/2 bg-black/40 rounded-full" />
          <div 
            className={`absolute bottom-0 w-1.5 left-1/2 -translate-x-1/2 rounded-full transition-all ${getChannelColor(label)}`}
            style={{ height: `${(localVal / 255) * 100}%` }}
          />
          <input
            type="range"
            min="0"
            max="255"
            value={localVal}
            disabled={!isManualMode}
            onChange={handleChange}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default"
            style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
          />
          <div 
            className="absolute left-1/2 -translate-x-1/2 w-4 h-2 bg-white rounded-sm shadow-lg pointer-events-none"
            style={{ bottom: `calc(${(localVal / 255) * 100}% - 4px)` }}
          />
        </div>
        <span className="text-[9px] font-mono font-black text-cyan-400">{localVal}</span>
        <span className="text-[9px] font-black uppercase tracking-tighter text-slate-500 max-w-[40px] truncate">{label}</span>
        <span className="text-[8px] font-mono font-black text-slate-500">CH{chAddr}</span>
      </div>

      <ValuePromptModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        title={`Canal ${chAddr}`}
        defaultValue={localVal.toString()}
        label={`Entrez la valeur pour ${label} (0-255 ou 0-100%) :`}
      />
    </>
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

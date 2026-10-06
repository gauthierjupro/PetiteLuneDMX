import React, { useState } from 'react';
import { ValuePromptModal } from './ValuePromptModal';

interface VerticalSliderProps {
  value: number;
  onChange: (val: number) => void;
  label?: string;
  color?: string;
  min?: number;
  max?: number;
  height?: string;
}

export const VerticalSlider = ({ 
  value, 
  onChange, 
  label, 
  color = "bg-cyan-500",
  min = 0,
  max = 255,
  height = "h-32"
}: VerticalSliderProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const percentage = ((value - min) / (max - min)) * 100;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsModalOpen(true);
  };

  const handleModalSubmit = (input: string) => {
    if (input !== "") {
      let newVal: number;
      if (input.includes('%')) {
        const percent = parseFloat(input.replace('%', ''));
        if (!isNaN(percent)) {
          newVal = Math.round((percent / 100) * (max - min) + min);
        } else return;
      } else {
        newVal = parseInt(input);
      }

      if (!isNaN(newVal)) {
        onChange(Math.min(max, Math.max(min, newVal)));
      }
    }
  };

  return (
    <>
      <div className="flex flex-col items-center gap-2 group" onContextMenu={handleContextMenu}>
        {/* Conteneur élargi pour faciliter le clic */}
        <div className={`${height} w-6 relative flex items-center justify-center`}>
          
          {/* Rail visuel */}
          <div className="pl-fader-rail h-full w-1.5">
            <div
              className={`pl-fader-rail-fill pl-fader-fill ${color === 'bg-cyan-500' ? 'bg-[var(--pl-fader-fill)]' : color}`}
              style={{ height: `${percentage}%` }}
            />
          </div>

          {/* L'input invisible qui capture les mouvements */}
          <input 
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
            style={{ 
              writingMode: 'vertical-lr', 
              direction: 'rtl',
              WebkitAppearance: 'none'
            }}
          />

          {/* Le Bouton (Handle) visuel */}
          <div
            className="pl-fader-handle z-10 flex flex-col items-center justify-center gap-0.5 transition-all duration-75"
            style={{ bottom: `calc(${percentage}% - 6px)` }}
          >
            <div className="w-3 h-[1px] bg-[var(--pl-muted)]" />
            <div className="w-3 h-[1px] bg-[var(--pl-muted)]" />
          </div>
        </div>
        
        {label && (
          <span className="text-[8px] font-black text-[var(--pl-muted)] uppercase tracking-tighter">
            {label}
          </span>
        )}
        <span className="text-[9px] font-mono text-cyan-500 font-bold">{value}</span>
      </div>

      <ValuePromptModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        title={`Réglage ${label || 'ce fader'}`}
        defaultValue={value.toString()}
        label={`Entrez la valeur (0-255 ou 0-100%) :`}
      />
    </>
  );
};

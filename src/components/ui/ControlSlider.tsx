import React, { useState } from 'react';
import { ValuePromptModal } from './ValuePromptModal';

interface ControlSliderProps {
  label: string;
  value: number;
  onChange: (val: string) => void;
  color?: string;
  min?: number;
  max?: number;
}

export const ControlSlider = ({ 
  label, 
  value, 
  onChange, 
  color = "bg-slate-800",
  min = 0,
  max = 255
}: ControlSliderProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
        onChange(Math.min(max, Math.max(min, newVal)).toString());
      }
    }
  };

  return (
    <>
      <div className="group" onContextMenu={handleContextMenu}>
        <div className="flex justify-between mb-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase">{label}</label>
          <span className="text-cyan-400 font-mono text-[10px]">{value}</span>
        </div>
        <input 
          type="range" 
          min={min} 
          max={max} 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full h-1 ${color} rounded-lg appearance-none cursor-pointer accent-cyan-500`}
        />
      </div>

      <ValuePromptModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        title={`Réglage ${label}`}
        defaultValue={value.toString()}
        label={`Entrez la valeur (0-255 ou 0-100%) :`}
      />
    </>
  );
};

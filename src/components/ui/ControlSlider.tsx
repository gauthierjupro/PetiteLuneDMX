import React, { useState } from 'react';
import { ValuePromptModal } from './ValuePromptModal';

interface ControlSliderProps {
  label: string;
  value: number;
  onChange: (val: string) => void;
  color?: string;
  min?: number;
  max?: number;
  /** Masque la ligne label + valeur DMX (déjà affichée ailleurs). */
  hideHeader?: boolean;
}

const DEFAULT_FILL = 'pl-fader-fill bg-[var(--pl-fader-fill)]';

export const ControlSlider = ({
  label,
  value,
  onChange,
  color,
  min = 0,
  max = 255,
  hideHeader = false,
}: ControlSliderProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fillClass = color ? `${color} pl-fader-fill` : DEFAULT_FILL;
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsModalOpen(true);
  };

  const handleModalSubmit = (input: string) => {
    if (input !== '') {
      let newVal: number;
      if (input.includes('%')) {
        const percent = parseFloat(input.replace('%', ''));
        if (!isNaN(percent)) {
          newVal = Math.round((percent / 100) * (max - min) + min);
        } else return;
      } else {
        newVal = parseInt(input, 10);
      }

      if (!isNaN(newVal)) {
        onChange(Math.min(max, Math.max(min, newVal)).toString());
      }
    }
  };

  return (
    <>
      <div className="group" onContextMenu={handleContextMenu}>
        {!hideHeader && (
          <div className="flex justify-between mb-2">
            <label className="text-[10px] font-bold text-[var(--pl-muted)] uppercase">
              {label || 'Valeur'}
            </label>
            <span className="text-cyan-500 font-mono text-[10px] font-bold">{value}</span>
          </div>
        )}
        <div className="relative h-7 flex items-center">
          <div className="pl-range-track w-full">
            <div className={`pl-range-fill ${fillClass}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="pl-range-thumb" style={{ left: `${pct}%` }} aria-hidden />
          <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="pl-range-hit"
            aria-label={label || 'Curseur'}
          />
        </div>
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

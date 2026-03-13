import React from 'react';
import { Modal } from '../../ui/Modal';
import { RGB, HSV, rgbToHsv, hsvToRgb } from '../../../utils/colorUtils';

interface ColorPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  tempColor: RGB;
  tempHue: number;
  tempSat: number;
  tempLum: number;
  onColorChange: (color: RGB) => void;
  onHueChange: (hue: number) => void;
  onSatChange: (sat: number) => void;
  onLumChange: (lum: number) => void;
  onSave: () => void;
  colorWheelRef: React.RefObject<HTMLDivElement>;
  hueSliderRef: React.RefObject<HTMLDivElement>;
  handleSpectrumAction: (x: number, y: number) => void;
  handleHueAction: (x: number) => void;
  setIsDraggingColor: (val: boolean) => void;
  setIsDraggingHue: (val: boolean) => void;
  activePresetToEdit: string | null;
}

export const ColorPickerModal = ({
  isOpen,
  onClose,
  title,
  tempColor,
  tempHue,
  tempSat,
  tempLum,
  onColorChange,
  onHueChange,
  onSatChange,
  onLumChange,
  onSave,
  colorWheelRef,
  hueSliderRef,
  handleSpectrumAction,
  handleHueAction,
  setIsDraggingColor,
  setIsDraggingHue,
  activePresetToEdit
}: ColorPickerModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6 p-2">
        <div className="flex gap-4">
          <div 
            ref={colorWheelRef}
            className="w-64 h-64 rounded-lg relative cursor-crosshair border border-white/10 overflow-hidden"
            style={{ backgroundColor: `hsl(${tempHue}, 100%, 50%)` }}
            onMouseDown={(e) => {
              setIsDraggingColor(true);
              handleSpectrumAction(e.clientX, e.clientY);
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
            <div 
              className="absolute w-4 h-4 border-2 border-white rounded-full shadow-lg pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10"
              style={{ 
                left: `${tempSat}%`, 
                top: `${100 - tempLum}%`,
                backgroundColor: `rgb(${tempColor.r}, ${tempColor.g}, ${tempColor.b})`,
                boxShadow: '0 0 10px rgba(0,0,0,0.5)'
              }}
            />
          </div>

          <div className="flex flex-col gap-4 w-24">
            <div 
              className="flex-1 rounded-xl border border-white/10 shadow-inner"
              style={{ backgroundColor: `rgb(${tempColor.r}, ${tempColor.g}, ${tempColor.b})` }}
            />
            <div className="bg-slate-900/50 border border-white/5 rounded-xl p-2 text-center">
              <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">HEX</span>
              <span className="text-[10px] font-mono font-black text-white uppercase">
                {`#${tempColor.r.toString(16).padStart(2, '0')}${tempColor.g.toString(16).padStart(2, '0')}${tempColor.b.toString(16).padStart(2, '0')}`}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
            <span>Teinte (Hue)</span>
            <span>{Math.round(tempHue)}°</span>
          </div>
          <div 
            ref={hueSliderRef}
            className="w-full h-6 rounded-lg relative cursor-pointer border border-white/10 overflow-hidden shadow-inner"
            style={{ background: 'linear-gradient(to right, red, #ff0, #0f0, #0ff, #00f, #f0f, red)' }}
            onMouseDown={(e) => {
              setIsDraggingHue(true);
              handleHueAction(e.clientX);
            }}
          >
            <div 
              className="absolute w-2 h-full bg-white border-x border-slate-900/50 shadow-[0_0_10px_rgba(255,255,255,0.5)] -translate-x-1/2 pointer-events-none"
              style={{ left: `${(tempHue / 360) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'ROUGE', key: 'r', color: 'text-red-500' },
            { label: 'VERT', key: 'g', color: 'text-green-500' },
            { label: 'BLEU', key: 'b', color: 'text-blue-500' }
          ].map((chan) => (
            <div key={chan.key} className="bg-slate-900/50 border border-white/5 rounded-xl p-3">
              <span className={`text-[8px] font-black ${chan.color}`}>{chan.label}</span>
              <input 
                type="number" min="0" max="255"
                value={(tempColor as any)[chan.key]}
                onChange={(e) => {
                  const newVal = Math.min(255, Math.max(0, parseInt(e.target.value) || 0));
                  const newColor = { ...tempColor, [chan.key]: newVal };
                  onColorChange(newColor);
                  const hsv = rgbToHsv(newColor.r, newColor.g, newColor.b);
                  onHueChange(hsv.h);
                  onSatChange(hsv.s);
                  onLumChange(hsv.v);
                }}
                className="w-full bg-transparent text-lg font-mono font-black text-white focus:outline-none"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-4">
          <button onClick={onClose} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl text-[10px] font-black uppercase transition-all">Annuler</button>
          <button onClick={onSave} className="flex-1 py-4 bg-cyan-500 hover:bg-cyan-400 text-[#05070a] rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-cyan-500/20 transition-all active:scale-95">
            {activePresetToEdit ? `Enregistrer dans ${activePresetToEdit}` : 'Valider'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

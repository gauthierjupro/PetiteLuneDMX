import React from 'react';
import { Modal } from '../../ui/Modal';
import { Settings2, RotateCcw, Info } from 'lucide-react';

interface CalibrationSettings {
  invertPan: boolean;
  invertTilt: boolean;
  offsetPan: number;
  offsetTilt: number;
}

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  fixtures: any[];
  calibration: Record<number, CalibrationSettings>;
  onUpdateCalibration: (fixtureId: number, settings: Partial<CalibrationSettings>) => void;
  onReset: (fixtureId: number) => void;
}

export const CalibrationModal = ({ 
  isOpen, 
  onClose, 
  fixtures, 
  calibration, 
  onUpdateCalibration,
  onReset
}: CalibrationModalProps) => {
  const movingHeads = fixtures.filter(f => f.type === 'Moving Head');

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="CALIBRATION DES LYRES"
      maxWidth="max-w-7xl"
    >
      <div className="space-y-10 max-h-[80vh] overflow-y-auto pr-8 pl-4 py-4 custom-scrollbar">
        {/* SECTION AIDE */}
        <div className="p-10 bg-blue-500/10 border border-blue-500/20 rounded-[3rem] flex gap-8 items-center">
          <div className="shrink-0">
            <div className="p-4 bg-blue-500/20 rounded-2xl">
              <Info className="w-10 h-10 text-blue-400" />
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-lg font-black text-blue-400 uppercase tracking-[0.2em]">Guide de calibration avancée</h4>
            <div className="grid grid-cols-2 gap-x-16 gap-y-4 text-[13px] text-slate-300 leading-relaxed font-semibold">
              <p>• <span className="text-white font-black uppercase">Inversion Pan :</span> Inverse la rotation horizontale (gauche/droite).</p>
              <p>• <span className="text-white font-black uppercase">Inversion Tilt :</span> Inverse la rotation verticale (haut/bas).</p>
              <p>• <span className="text-white font-black uppercase">Offset :</span> Ajuste le point zéro (valeur de -255 à +255).</p>
              <p>• <span className="text-white font-black uppercase">Alignement :</span> Utilisez le bouton "Center" du PAD pour aligner.</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="grid grid-cols-12 gap-10 px-10">
            <div className="col-span-4" />
            <div className="col-span-2 text-center text-[12px] font-black text-slate-500 uppercase tracking-[0.3em]">Inv. Pan</div>
            <div className="col-span-2 text-center text-[12px] font-black text-slate-500 uppercase tracking-[0.3em]">Inv. Tilt</div>
            <div className="col-span-2 text-center text-[12px] font-black text-slate-500 uppercase tracking-[0.3em]">Off. Pan</div>
            <div className="col-span-2 text-center text-[12px] font-black text-slate-500 uppercase tracking-[0.3em]">Off. Tilt</div>
          </div>

          <div className="space-y-6">
            {movingHeads.map(fixture => {
              const settings = calibration[fixture.id] || { invertPan: false, invertTilt: false, offsetPan: 0, offsetTilt: 0 };
              
              return (
                <div key={fixture.id} className="grid grid-cols-12 gap-10 items-center p-10 bg-white/5 rounded-[4rem] border border-white/5 group hover:border-cyan-500/30 transition-all relative">
                  <div className="col-span-4 flex flex-col gap-3">
                    <span className="text-2xl font-black text-white uppercase tracking-tighter leading-none italic">{fixture.name}</span>
                    <div className="flex items-center gap-4">
                      <span className="px-3 py-1 bg-slate-800 text-[11px] font-black text-slate-500 rounded-lg border border-white/5 tracking-[0.2em] uppercase">ADRESSE: {fixture.address}</span>
                      <span className="px-3 py-1 bg-cyan-500/10 text-[11px] font-black text-cyan-500/70 rounded-lg border border-cyan-500/20 tracking-[0.2em] uppercase">{fixture.model}</span>
                    </div>
                  </div>

                  <div className="col-span-2 flex justify-center">
                    <input 
                      type="checkbox" 
                      checked={settings.invertPan}
                      onChange={(e) => onUpdateCalibration(fixture.id, { invertPan: e.target.checked })}
                      className="w-12 h-12 rounded-2xl border-white/10 bg-slate-950 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900 cursor-pointer transition-all hover:scale-125 active:scale-95 shadow-2xl"
                    />
                  </div>

                  <div className="col-span-2 flex justify-center">
                    <input 
                      type="checkbox" 
                      checked={settings.invertTilt}
                      onChange={(e) => onUpdateCalibration(fixture.id, { invertTilt: e.target.checked })}
                      className="w-12 h-12 rounded-2xl border-white/10 bg-slate-950 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900 cursor-pointer transition-all hover:scale-125 active:scale-95 shadow-2xl"
                    />
                  </div>

                  <div className="col-span-2">
                    <div className="relative">
                      <input 
                        type="number" 
                        value={settings.offsetPan}
                        onChange={(e) => onUpdateCalibration(fixture.id, { offsetPan: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-950 border border-white/10 rounded-[2rem] px-6 py-6 text-3xl font-mono font-black text-center text-cyan-400 focus:outline-none focus:border-cyan-500 shadow-2xl transition-all"
                      />
                    </div>
                  </div>

                  <div className="col-span-2">
                    <div className="relative">
                      <input 
                        type="number" 
                        value={settings.offsetTilt}
                        onChange={(e) => onUpdateCalibration(fixture.id, { offsetTilt: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-950 border border-white/10 rounded-[2rem] px-6 py-6 text-3xl font-mono font-black text-center text-cyan-400 focus:outline-none focus:border-cyan-500 shadow-2xl transition-all"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={() => onReset(fixture.id)}
                    className="absolute -right-6 top-1/2 -translate-y-1/2 p-6 bg-slate-800 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-2xl border border-white/5 z-20 active:scale-90"
                    title="Réinitialiser cette machine"
                  >
                    <RotateCcw className="w-6 h-6" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-10 flex justify-end">
          <button 
            onClick={onClose}
            className="px-20 py-6 bg-cyan-500 hover:bg-cyan-400 text-[#05070a] rounded-[2.5rem] text-sm font-black uppercase tracking-[0.4em] transition-all shadow-2xl shadow-cyan-500/30 active:scale-95"
          >
            Appliquer la calibration
          </button>
        </div>
      </div>
    </Modal>
  );
};

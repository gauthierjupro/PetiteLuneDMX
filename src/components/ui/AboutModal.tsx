import React from 'react';
import { Modal } from './Modal';
import { Github, Heart, Info, Code, Zap, Globe } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  version: string;
}

export const AboutModal = ({ isOpen, onClose, version }: AboutModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="À PROPOS DE PETITELUNE DMX">
      <div className="space-y-6 text-slate-300">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-cyan-500/20">
            <Zap className="w-10 h-10 text-white fill-current" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tighter uppercase">
              PETITELUNE<span className="text-cyan-400">DMX</span>
            </h2>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Version {version}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
              <Info className="w-3 h-3" /> Description
            </h3>
            <p className="text-sm leading-relaxed text-slate-400">
              Console DMX professionnelle nouvelle génération, conçue pour la performance live et la synchronisation audio réactive. Architecture modulaire basée sur Tauri et Rust.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2 mb-2">
                <Code className="w-3 h-3" /> Stack
              </h3>
              <ul className="text-[11px] space-y-1 font-bold text-slate-500 uppercase">
                <li>• Tauri / Rust</li>
                <li>• React / Vite</li>
                <li>• Tailwind CSS</li>
              </ul>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-2 mb-2">
                <Globe className="w-3 h-3" /> Dépôt
              </h3>
              <a 
                href="https://github.com/gauthierjupro/PetiteLuneDMX" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 text-[11px] font-bold text-slate-400 hover:text-white transition-colors uppercase"
              >
                <Github className="w-3 h-3" /> GitHub Repo
              </a>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/5 flex justify-between items-center text-[10px] font-bold text-slate-600 uppercase tracking-widest">
          <div className="flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-rose-500 fill-current" /> by Gauthier
          </div>
          <div>© 2026</div>
        </div>
      </div>
    </Modal>
  );
};

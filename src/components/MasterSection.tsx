import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { ValuePromptModal } from "./ui/ValuePromptModal";

const MasterSection: React.FC = () => {
  const [dimmer, setDimmer] = useState(100);
  const [blackout, setBlackout] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleBlackout = async () => {
    const newVal = !blackout;
    setBlackout(newVal);
    await invoke("blackout");
  };

  const handleDimmerContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsModalOpen(true);
  };

  const handleModalSubmit = (input: string) => {
    if (input !== "") {
      const val = parseInt(input.replace('%', ''));
      if (!isNaN(val)) {
        setDimmer(Math.min(100, Math.max(0, val)));
      }
    }
  };

  return (
    <>
      <div className="column left-column">
        <h2 className="panel-header">Master Control</h2>
        
        <div className="card" onContextMenu={handleDimmerContextMenu}>
          <label>Master Dimmer: {dimmer}%</label>
          <input 
            type="range" 
            min="0" 
            max="100" 
            className="slider-full"
            value={dimmer} 
            onChange={(e) => setDimmer(parseInt(e.target.value))} 
          />
        </div>

        <div className="card">
          <button 
            className={`btn-blackout ${blackout ? 'active' : ''}`}
            onClick={toggleBlackout}
          >
            {blackout ? 'BLACKOUT ON' : 'BLACKOUT OFF'}
          </button>
        </div>

        <div className="card">
          <div className="status-indicator">
            <span className={`status-dot ${isConnected ? 'online' : 'offline'}`}></span>
            <span>{isConnected ? 'Interface Connectée (COM3)' : 'Interface Déconnectée'}</span>
          </div>
        </div>
      </div>

      <ValuePromptModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        title="Master Dimmer"
        defaultValue={dimmer.toString()}
        label="Entrez la valeur du Master Dimmer (0-100%) :"
      />
    </>
  );
};

export default MasterSection;

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod dmx_engine;
mod motion_manager;

use std::sync::{Arc, Mutex};
use dmx_engine::{DmxEngine, AppState, DMX_CHANNELS};

fn main() {
    // Port série par défaut (COM3 d'après main.py)
    let dmx_port = "COM3";
    let engine = DmxEngine::new(dmx_port);
    
    // On récupère les buffers partagés
    let universe = engine.get_universe_clone();
    let motion_mode = engine.get_motion_mode_clone();
    let motion_manager = engine.get_motion_manager_clone();
    let motion_fixtures = engine.get_motion_fixtures_clone();
    let motion_speed = Arc::new(Mutex::new(0.5)); // Par défaut
    let manual_override = engine.get_manual_override_clone();
    let bpm = engine.get_bpm_clone();
    let last_beat = engine.get_last_beat_clone();
    let sound_to_light = Arc::new(Mutex::new(false)); // Initialisation par défaut
    let target_universe = Arc::new(Mutex::new([0; DMX_CHANNELS]));
    let fade_speed = Arc::new(Mutex::new(1.0));
    
    // On démarre le thread d'envoi à 40Hz
    engine.start();

    // Initialisation de Tauri avec l'état partagé
    tauri::Builder::default()
        .manage(AppState {
            universe: Arc::clone(&universe),
            engine: Mutex::new(engine),
            motion_mode: Arc::clone(&motion_mode),
            motion_manager: Arc::clone(&motion_manager),
            motion_fixtures: Arc::clone(&motion_fixtures),
            motion_speed: Arc::clone(&motion_speed),
            manual_override: Arc::clone(&manual_override),
            bpm: Arc::clone(&bpm),
            last_beat: Arc::clone(&last_beat),
            sound_to_light: Arc::clone(&sound_to_light),
            target_universe: Arc::clone(&target_universe),
            fade_speed: Arc::clone(&fade_speed),
        })
        .invoke_handler(tauri::generate_handler![
            dmx_engine::set_channel,
            dmx_engine::update_dmx,
            dmx_engine::get_connection_status,
            dmx_engine::blackout,
            dmx_engine::get_universe,
            dmx_engine::set_motion_mode,
            dmx_engine::set_motion_center,
            dmx_engine::set_motion_amplitude,
            dmx_engine::set_motion_speed,
            dmx_engine::set_motion_fixtures,
            dmx_engine::set_manual_override,
            dmx_engine::set_sound_to_light,
            dmx_engine::set_bpm,
            dmx_engine::trigger_beat,
            dmx_engine::trigger_peak,
            dmx_engine::reset_motion_time,
            dmx_engine::get_motion_cycle_index,
            dmx_engine::apply_preset,
            dmx_engine::stop_engine,
        ])
        .run(tauri::generate_context!())
        .expect("Erreur lors du lancement de l'application Tauri");
}

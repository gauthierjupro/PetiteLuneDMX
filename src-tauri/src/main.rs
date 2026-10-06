// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod dmx_engine;
mod motion_manager;
mod file_io;

use std::sync::{Arc, Mutex};
use tauri::Manager;
use dmx_engine::{DmxEngine, AppState};

fn main() {
    let dmx_port = "COM3";
    let engine = DmxEngine::new(dmx_port);

    let universe = engine.get_universe_clone();
    let motion_manager = engine.get_motion_manager_clone();
    let manual_override = engine.get_manual_override_clone();
    let bpm = engine.get_bpm_clone();
    let last_beat = engine.get_last_beat_clone();
    let sound_to_light = Arc::new(Mutex::new(false));
    let target_universe = engine.get_target_universe_clone();
    let fade_speed = engine.get_fade_speed_clone();
    let port_name = engine.get_port_name_clone();
    let force_reconnect = engine.get_force_reconnect_clone();
    let blackout_on_disconnect = engine.get_blackout_on_disconnect_clone();
    let last_error = engine.get_last_error_clone();
    let connected = engine.get_connected_clone();
    let actual_hz = engine.get_actual_hz_clone();
    let latency_ms = engine.get_latency_ms_clone();

    tauri::Builder::default()
        .manage(AppState {
            universe: Arc::clone(&universe),
            engine: Mutex::new(engine),
            motion_manager: Arc::clone(&motion_manager),
            manual_override: Arc::clone(&manual_override),
            bpm: Arc::clone(&bpm),
            last_beat: Arc::clone(&last_beat),
            sound_to_light: Arc::clone(&sound_to_light),
            target_universe: Arc::clone(&target_universe),
            fade_speed: Arc::clone(&fade_speed),
            port_name: Arc::clone(&port_name),
            force_reconnect: Arc::clone(&force_reconnect),
            blackout_on_disconnect: Arc::clone(&blackout_on_disconnect),
            last_error: Arc::clone(&last_error),
            connected: Arc::clone(&connected),
            actual_hz: Arc::clone(&actual_hz),
            latency_ms: Arc::clone(&latency_ms),
        })
        .setup(move |app| {
            let state = app.state::<AppState>();
            let engine = state.engine.lock().unwrap();
            engine.start(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            dmx_engine::set_channel,
            dmx_engine::update_dmx,
            dmx_engine::get_connection_status,
            dmx_engine::get_connection_info,
            dmx_engine::set_port,
            dmx_engine::force_reconnect,
            dmx_engine::set_blackout_on_disconnect,
            dmx_engine::blackout,
            dmx_engine::get_universe,
            dmx_engine::sync_live_motions,
            dmx_engine::get_motion_preview,
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
            dmx_engine::open_pdf,
            dmx_engine::open_pdf_folder,
            file_io::save_text_file,
            file_io::save_binary_file,
            file_io::load_text_file,
        ])
        .run(tauri::generate_context!())
        .expect("Erreur lors du lancement de l'application Tauri");
}

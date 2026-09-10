use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use std::io::Write;
use serialport;
use serde::Serialize;
use tauri::Manager;
use crate::motion_manager::{
    GroupMotionConfig, LegacyMotionMode, MotionManager, MotionPreview,
};

pub const DMX_CHANNELS: usize = 512;
/// Univers unique aujourd'hui ; `Fixture.universeId` prépare le multi-univers (P2-05).
pub const DMX_UNIVERSE_ID: u32 = 1;
pub const REFRESH_RATE_HZ: u64 = 40;
pub const TICK_DURATION: Duration = Duration::from_millis(1000 / REFRESH_RATE_HZ);
pub const RECONNECT_DELAY: Duration = Duration::from_secs(1);

pub struct DmxEngine {
    universe: Arc<Mutex<[u8; DMX_CHANNELS]>>,
    port_name: Arc<Mutex<String>>,
    running: Arc<Mutex<bool>>,
    connected: Arc<Mutex<bool>>,
    force_reconnect: Arc<Mutex<bool>>,
    blackout_on_disconnect: Arc<Mutex<bool>>,
    last_error: Arc<Mutex<Option<String>>>,
    /// Fréquence réelle mesurée (EMA) des trames envoyées avec succès.
    actual_hz: Arc<Mutex<f32>>,
    /// Durée du dernier envoi série (break + write), en millisecondes.
    latency_ms: Arc<Mutex<f32>>,
    motion_manager: Arc<Mutex<MotionManager>>,
    manual_override: Arc<Mutex<bool>>,
    bpm: Arc<Mutex<f32>>,
    last_beat: Arc<Mutex<Instant>>,
    sound_to_light: Arc<Mutex<bool>>,
    target_universe: Arc<Mutex<[u8; DMX_CHANNELS]>>,
    fade_speed: Arc<Mutex<f32>>,
}

fn zero_universe(buf: &Arc<Mutex<[u8; DMX_CHANNELS]>>) {
    let mut data = buf.lock().unwrap();
    for val in data.iter_mut() {
        *val = 0;
    }
}

fn try_send_frame(port: &mut Box<dyn serialport::SerialPort>, universe: &Arc<Mutex<[u8; DMX_CHANNELS]>>) -> Result<(), String> {
    port.set_break().map_err(|e| format!("break: {}", e))?;
    thread::sleep(Duration::from_micros(100));
    port.clear_break().map_err(|e| format!("clear_break: {}", e))?;
    thread::sleep(Duration::from_micros(12));

    let mut frame = Vec::with_capacity(DMX_CHANNELS + 1);
    frame.push(0x00);
    {
        let universe_data = universe.lock().unwrap();
        frame.extend_from_slice(&*universe_data);
    }
    port.write_all(&frame).map_err(|e| format!("write: {}", e))?;
    Ok(())
}

impl DmxEngine {
    pub fn new(port_name: &str) -> Self {
        Self {
            universe: Arc::new(Mutex::new([0; DMX_CHANNELS])),
            port_name: Arc::new(Mutex::new(port_name.to_string())),
            running: Arc::new(Mutex::new(false)),
            connected: Arc::new(Mutex::new(false)),
            force_reconnect: Arc::new(Mutex::new(false)),
            blackout_on_disconnect: Arc::new(Mutex::new(true)),
            last_error: Arc::new(Mutex::new(None)),
            actual_hz: Arc::new(Mutex::new(0.0)),
            latency_ms: Arc::new(Mutex::new(0.0)),
            motion_manager: Arc::new(Mutex::new(MotionManager::new())),
            manual_override: Arc::new(Mutex::new(false)),
            bpm: Arc::new(Mutex::new(120.0)),
            last_beat: Arc::new(Mutex::new(Instant::now())),
            sound_to_light: Arc::new(Mutex::new(false)),
            target_universe: Arc::new(Mutex::new([0; DMX_CHANNELS])),
            fade_speed: Arc::new(Mutex::new(1.0)),
        }
    }

    pub fn get_universe_clone(&self) -> Arc<Mutex<[u8; DMX_CHANNELS]>> {
        Arc::clone(&self.universe)
    }

    pub fn get_motion_manager_clone(&self) -> Arc<Mutex<MotionManager>> {
        Arc::clone(&self.motion_manager)
    }

    pub fn get_manual_override_clone(&self) -> Arc<Mutex<bool>> {
        Arc::clone(&self.manual_override)
    }

    pub fn get_bpm_clone(&self) -> Arc<Mutex<f32>> {
        Arc::clone(&self.bpm)
    }

    pub fn get_last_beat_clone(&self) -> Arc<Mutex<Instant>> {
        Arc::clone(&self.last_beat)
    }

    pub fn get_connected_clone(&self) -> Arc<Mutex<bool>> {
        Arc::clone(&self.connected)
    }

    pub fn get_port_name_clone(&self) -> Arc<Mutex<String>> {
        Arc::clone(&self.port_name)
    }

    pub fn get_force_reconnect_clone(&self) -> Arc<Mutex<bool>> {
        Arc::clone(&self.force_reconnect)
    }

    pub fn get_blackout_on_disconnect_clone(&self) -> Arc<Mutex<bool>> {
        Arc::clone(&self.blackout_on_disconnect)
    }

    pub fn get_last_error_clone(&self) -> Arc<Mutex<Option<String>>> {
        Arc::clone(&self.last_error)
    }

    pub fn get_actual_hz_clone(&self) -> Arc<Mutex<f32>> {
        Arc::clone(&self.actual_hz)
    }

    pub fn get_latency_ms_clone(&self) -> Arc<Mutex<f32>> {
        Arc::clone(&self.latency_ms)
    }

    pub fn get_target_universe_clone(&self) -> Arc<Mutex<[u8; DMX_CHANNELS]>> {
        Arc::clone(&self.target_universe)
    }

    pub fn get_fade_speed_clone(&self) -> Arc<Mutex<f32>> {
        Arc::clone(&self.fade_speed)
    }

    fn apply_disconnect_failsafe(
        port: &mut Option<Box<dyn serialport::SerialPort>>,
        universe: &Arc<Mutex<[u8; DMX_CHANNELS]>>,
        target_universe: &Arc<Mutex<[u8; DMX_CHANNELS]>>,
        blackout_on_disconnect: &Arc<Mutex<bool>>,
        connected: &Arc<Mutex<bool>>,
        last_error: &Arc<Mutex<Option<String>>>,
        error_msg: String,
    ) {
        eprintln!("DMX Engine: {}", error_msg);
        *last_error.lock().unwrap() = Some(error_msg);
        *connected.lock().unwrap() = false;

        if *blackout_on_disconnect.lock().unwrap() {
            zero_universe(universe);
            zero_universe(target_universe);
            if let Some(ref mut p) = port {
                let _ = try_send_frame(p, universe);
            }
        }

        *port = None;
    }

    pub fn start(&self, app_handle: tauri::AppHandle) {
        let mut running_guard = self.running.lock().unwrap();
        if *running_guard {
            return;
        }
        *running_guard = true;

        let universe = Arc::clone(&self.universe);
        let port_name = Arc::clone(&self.port_name);
        let running = Arc::clone(&self.running);
        let connected = Arc::clone(&self.connected);
        let force_reconnect = Arc::clone(&self.force_reconnect);
        let blackout_on_disconnect = Arc::clone(&self.blackout_on_disconnect);
        let last_error = Arc::clone(&self.last_error);
        let actual_hz = Arc::clone(&self.actual_hz);
        let latency_ms = Arc::clone(&self.latency_ms);
        let motion_manager = Arc::clone(&self.motion_manager);
        let manual_override = Arc::clone(&self.manual_override);
        let last_beat = Arc::clone(&self.last_beat);
        let sound_to_light = Arc::clone(&self.sound_to_light);
        let target_universe = Arc::clone(&self.target_universe);
        let fade_speed = Arc::clone(&self.fade_speed);

        thread::spawn(move || {
            println!("DMX Engine: Thread démarré (reconnexion auto activée).");
            let mut port: Option<Box<dyn serialport::SerialPort>> = None;
            let mut next_open_attempt = Instant::now();
            let mut last_ok_frame: Option<Instant> = None;
            let mut last_emitted_universe: Option<[u8; DMX_CHANNELS]> = None;

            while *running.lock().unwrap() {
                let start_tick = Instant::now();

                if *force_reconnect.lock().unwrap() {
                    *force_reconnect.lock().unwrap() = false;
                    port = None;
                    *connected.lock().unwrap() = false;
                    *actual_hz.lock().unwrap() = 0.0;
                    last_ok_frame = None;
                    next_open_attempt = Instant::now();
                }

                if port.is_none() && Instant::now() >= next_open_attempt {
                    let name = port_name.lock().unwrap().clone();
                    println!("DMX Engine: Tentative d'ouverture du port {}", name);

                    match serialport::new(&name, 250_000)
                        .stop_bits(serialport::StopBits::Two)
                        .parity(serialport::Parity::None)
                        .timeout(Duration::from_millis(100))
                        .open()
                    {
                        Ok(p) => {
                            println!("DMX Engine: Port {} ouvert avec succès.", name);
                            *connected.lock().unwrap() = true;
                            *last_error.lock().unwrap() = None;
                            port = Some(p);
                        }
                        Err(e) => {
                            let msg = format!("Impossible d'ouvrir le port {}: {}", name, e);
                            eprintln!("DMX Engine Error: {}", msg);
                            *connected.lock().unwrap() = false;
                            *last_error.lock().unwrap() = Some(msg);
                            *actual_hz.lock().unwrap() = 0.0;
                            last_ok_frame = None;
                            next_open_attempt = Instant::now() + RECONNECT_DELAY;
                        }
                    }
                }

                // --- Moteur de Fondu (Fade Engine) ---
                {
                    let target = target_universe.lock().unwrap();
                    let mut current = universe.lock().unwrap();
                    let speed = *fade_speed.lock().unwrap();

                    if speed >= 1.0 {
                        for i in 0..DMX_CHANNELS {
                            current[i] = target[i];
                        }
                    } else {
                        for i in 0..DMX_CHANNELS {
                            if current[i] != target[i] {
                                let diff = target[i] as f32 - current[i] as f32;
                                let step = diff * speed;

                                if step.abs() < 1.0 {
                                    if diff > 0.0 { current[i] += 1; }
                                    else { current[i] -= 1; }
                                } else {
                                    current[i] = (current[i] as f32 + step).round() as u8;
                                }
                            }
                        }
                    }
                }

                if !*manual_override.lock().unwrap() {
                    if *sound_to_light.lock().unwrap() {
                        let last_beat_time = last_beat.lock().unwrap();
                        let elapsed = last_beat_time.elapsed().as_secs_f32();
                        let decay = (-elapsed * 8.0).exp();
                        let intensity = (decay * 255.0) as u8;

                        let mut target = target_universe.lock().unwrap();
                        for i in 0..DMX_CHANNELS {
                            if i % 16 == 0 {
                                target[i] = intensity;
                            }
                        }
                    }

                    let mm = motion_manager.lock().unwrap();
                    if mm.has_active_motion() {
                        let mut target = target_universe.lock().unwrap();
                        mm.apply_to_universe(&mut *target);
                    }
                }

                {
                    let current = *universe.lock().unwrap();
                    let changed = last_emitted_universe
                        .map(|prev| prev != current)
                        .unwrap_or(true);
                    if changed {
                        let _ = app_handle.emit_all("dmx-universe", current.to_vec());
                        last_emitted_universe = Some(current);
                    }
                }

                let send_result = match port.as_mut() {
                    Some(p) => {
                        let send_start = Instant::now();
                        let result = try_send_frame(p, &universe);
                        let send_ms = send_start.elapsed().as_secs_f32() * 1000.0;
                        *latency_ms.lock().unwrap() = send_ms;
                        result
                    }
                    None => Ok(()),
                };
                if let Err(e) = send_result {
                    Self::apply_disconnect_failsafe(
                        &mut port,
                        &universe,
                        &target_universe,
                        &blackout_on_disconnect,
                        &connected,
                        &last_error,
                        format!("Erreur d'envoi DMX: {}", e),
                    );
                    *actual_hz.lock().unwrap() = 0.0;
                    last_ok_frame = None;
                    next_open_attempt = Instant::now() + RECONNECT_DELAY;
                } else if port.is_some() {
                    let now = Instant::now();
                    if let Some(prev) = last_ok_frame {
                        let dt = now.duration_since(prev).as_secs_f32();
                        if dt > 0.000_1 {
                            let instant_hz = 1.0 / dt;
                            let mut hz = actual_hz.lock().unwrap();
                            *hz = if *hz <= 0.0 {
                                instant_hz
                            } else {
                                *hz * 0.85 + instant_hz * 0.15
                            };
                        }
                    }
                    last_ok_frame = Some(now);
                }

                let elapsed = start_tick.elapsed();
                if elapsed < TICK_DURATION {
                    thread::sleep(TICK_DURATION - elapsed);
                }
            }
            println!("DMX Engine: Arrêt du thread.");
        });
    }

    pub fn stop(&self) {
        let mut running_guard = self.running.lock().unwrap();
        *running_guard = false;
    }
}

#[allow(dead_code)]
pub struct AppState {
    pub universe: Arc<Mutex<[u8; DMX_CHANNELS]>>,
    pub engine: Mutex<DmxEngine>,
    pub motion_manager: Arc<Mutex<MotionManager>>,
    pub manual_override: Arc<Mutex<bool>>,
    pub bpm: Arc<Mutex<f32>>,
    pub last_beat: Arc<Mutex<Instant>>,
    pub sound_to_light: Arc<Mutex<bool>>,
    pub target_universe: Arc<Mutex<[u8; DMX_CHANNELS]>>,
    pub fade_speed: Arc<Mutex<f32>>,
    pub port_name: Arc<Mutex<String>>,
    pub force_reconnect: Arc<Mutex<bool>>,
    pub blackout_on_disconnect: Arc<Mutex<bool>>,
    pub last_error: Arc<Mutex<Option<String>>>,
    pub connected: Arc<Mutex<bool>>,
    pub actual_hz: Arc<Mutex<f32>>,
    pub latency_ms: Arc<Mutex<f32>>,
}

#[derive(Serialize, Clone)]
pub struct ConnectionInfo {
    pub connected: bool,
    pub port: String,
    pub last_error: Option<String>,
    pub blackout_on_disconnect: bool,
    /// Cible moteur (40 Hz).
    pub target_hz: u32,
    /// Fréquence réelle mesurée (EMA).
    pub actual_hz: f32,
    /// Latence du dernier envoi série (ms).
    pub latency_ms: f32,
}

#[tauri::command]
pub fn set_channel(state: tauri::State<AppState>, address: usize, value: u8) -> Result<(), String> {
    if address < 1 || address > DMX_CHANNELS {
        return Err("Adresse DMX invalide (doit être entre 1 et 512)".to_string());
    }
    let mut target = state.target_universe.lock().unwrap();
    target[address - 1] = value;
    Ok(())
}

#[tauri::command]
pub fn blackout(state: tauri::State<AppState>) -> Result<(), String> {
    let mut target = state.target_universe.lock().unwrap();
    for val in target.iter_mut() {
        *val = 0;
    }
    Ok(())
}

#[tauri::command]
pub fn get_universe(state: tauri::State<AppState>) -> Vec<u8> {
    let target = state.target_universe.lock().unwrap();
    target.to_vec()
}

#[tauri::command]
pub fn sync_live_motions(
    state: tauri::State<AppState>,
    groups: Vec<GroupMotionConfig>,
) -> Result<(), String> {
    let mut mm = state.motion_manager.lock().unwrap();
    mm.sync_groups(groups);
    Ok(())
}

#[tauri::command]
pub fn get_motion_preview(state: tauri::State<AppState>) -> HashMap<String, MotionPreview> {
    let mm = state.motion_manager.lock().unwrap();
    mm.preview()
}

#[tauri::command]
pub fn set_motion_mode(state: tauri::State<AppState>, mode: Option<LegacyMotionMode>) -> Result<(), String> {
    let mut mm = state.motion_manager.lock().unwrap();
    mm.set_legacy_mode(mode);
    Ok(())
}

#[tauri::command]
pub fn set_motion_center(state: tauri::State<AppState>, x: f64, y: f64) -> Result<(), String> {
    let mut mm = state.motion_manager.lock().unwrap();
    mm.set_legacy_center(x, y);
    Ok(())
}

#[tauri::command]
pub fn set_motion_amplitude(state: tauri::State<AppState>, amplitude: f64) -> Result<(), String> {
    let mut mm = state.motion_manager.lock().unwrap();
    mm.set_legacy_amplitude(amplitude);
    Ok(())
}

#[tauri::command]
pub fn set_motion_speed(state: tauri::State<AppState>, speed: f64) -> Result<(), String> {
    let mut mm = state.motion_manager.lock().unwrap();
    mm.set_legacy_speed(speed);
    Ok(())
}

#[tauri::command]
pub fn set_motion_fixtures(state: tauri::State<AppState>, addresses: Vec<usize>) -> Result<(), String> {
    let mut mm = state.motion_manager.lock().unwrap();
    mm.set_legacy_fixtures(addresses);
    Ok(())
}

#[tauri::command]
pub fn reset_motion_time(state: tauri::State<AppState>) -> Result<(), String> {
    let mut mm = state.motion_manager.lock().unwrap();
    mm.reset_time();
    Ok(())
}

#[tauri::command]
pub fn get_motion_cycle_index(_state: tauri::State<AppState>, theta_1: f64) -> Result<i64, String> {
    Ok((theta_1 / (2.0 * std::f64::consts::PI)).floor() as i64)
}

#[tauri::command]
pub fn set_manual_override(state: tauri::State<AppState>, override_active: bool) -> Result<(), String> {
    let mut manual_override = state.manual_override.lock().unwrap();
    *manual_override = override_active;
    Ok(())
}

#[tauri::command]
pub fn set_bpm(state: tauri::State<AppState>, bpm: f32) -> Result<(), String> {
    let mut b = state.bpm.lock().unwrap();
    *b = bpm;
    Ok(())
}

#[tauri::command]
pub fn trigger_beat(state: tauri::State<AppState>) -> Result<(), String> {
    let mut last_beat = state.last_beat.lock().unwrap();
    *last_beat = Instant::now();
    Ok(())
}

#[tauri::command]
pub fn trigger_peak(state: tauri::State<AppState>) -> Result<(), String> {
    trigger_beat(state)
}

#[tauri::command]
pub fn stop_engine(state: tauri::State<AppState>) -> Result<(), String> {
    let engine = state.engine.lock().unwrap();
    engine.stop();
    Ok(())
}

#[tauri::command]
pub fn get_connection_status(state: tauri::State<AppState>) -> bool {
    *state.connected.lock().unwrap()
}

#[tauri::command]
pub fn get_connection_info(state: tauri::State<AppState>) -> ConnectionInfo {
    ConnectionInfo {
        connected: *state.connected.lock().unwrap(),
        port: state.port_name.lock().unwrap().clone(),
        last_error: state.last_error.lock().unwrap().clone(),
        blackout_on_disconnect: *state.blackout_on_disconnect.lock().unwrap(),
        target_hz: REFRESH_RATE_HZ as u32,
        actual_hz: *state.actual_hz.lock().unwrap(),
        latency_ms: *state.latency_ms.lock().unwrap(),
    }
}

#[tauri::command]
pub fn set_port(state: tauri::State<AppState>, port: String) -> Result<(), String> {
    {
        let mut name = state.port_name.lock().unwrap();
        *name = port;
    }
    *state.force_reconnect.lock().unwrap() = true;
    Ok(())
}

#[tauri::command]
pub fn force_reconnect(state: tauri::State<AppState>) -> Result<(), String> {
    *state.force_reconnect.lock().unwrap() = true;
    Ok(())
}

#[tauri::command]
pub fn set_blackout_on_disconnect(state: tauri::State<AppState>, enabled: bool) -> Result<(), String> {
    *state.blackout_on_disconnect.lock().unwrap() = enabled;
    Ok(())
}

#[tauri::command]
pub fn update_dmx(state: tauri::State<AppState>, channel: usize, value: u8) -> Result<(), String> {
    set_channel(state, channel, value)
}

#[tauri::command]
pub fn set_sound_to_light(state: tauri::State<AppState>, active: bool) -> Result<(), String> {
    let mut stl = state.sound_to_light.lock().unwrap();
    *stl = active;
    Ok(())
}

#[tauri::command]
pub fn open_pdf_folder(handle: tauri::AppHandle) -> Result<(), String> {
    let resource_path = handle.path_resolver()
        .resolve_resource("resources/pdfs/")
        .ok_or_else(|| "Impossible de trouver le chemin des ressources".to_string())?;

    if !resource_path.exists() {
        std::fs::create_dir_all(&resource_path).map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&resource_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&resource_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&resource_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn open_pdf(handle: tauri::AppHandle, filename: String) -> Result<(), String> {
    let path = if filename.contains(':') || filename.starts_with('/') || filename.starts_with('\\') {
        std::path::PathBuf::from(&filename)
    } else {
        handle.path_resolver()
            .resolve_resource(format!("resources/pdfs/{}", filename))
            .ok_or_else(|| "Impossible de trouver le chemin des ressources".to_string())?
    };

    if !path.exists() {
        return Err(format!("Le fichier {} n'existe pas.", path.display()));
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &path.to_string_lossy()])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn apply_preset(state: tauri::State<AppState>, universe_data: Vec<u8>, fade_time_ms: Option<u32>) -> Result<(), String> {
    if universe_data.len() != DMX_CHANNELS {
        return Err("Taille de preset invalide".to_string());
    }

    let speed = match fade_time_ms {
        Some(ms) if ms > 0 => {
            let ticks = ms as f32 / 25.0;
            1.0 / ticks
        },
        _ => 1.0
    };

    {
        let mut fs = state.fade_speed.lock().unwrap();
        *fs = speed;
    }

    let mut target = state.target_universe.lock().unwrap();
    for (i, &val) in universe_data.iter().enumerate() {
        target[i] = val;
    }
    Ok(())
}

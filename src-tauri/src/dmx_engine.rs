use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use std::io::Write;
use serialport;
use crate::motion_manager::{MotionManager, MotionMode};

pub const DMX_CHANNELS: usize = 512;
pub const REFRESH_RATE_HZ: u64 = 40;
pub const TICK_DURATION: Duration = Duration::from_millis(1000 / REFRESH_RATE_HZ);

pub struct DmxEngine {
    universe: Arc<Mutex<[u8; DMX_CHANNELS]>>,
    port_name: String,
    running: Arc<Mutex<bool>>,
    connected: Arc<Mutex<bool>>,
    motion_manager: Arc<Mutex<MotionManager>>,
    motion_mode: Arc<Mutex<Option<MotionMode>>>,
    motion_fixtures: Arc<Mutex<Vec<usize>>>,
    motion_speed: Arc<Mutex<f64>>,
    manual_override: Arc<Mutex<bool>>,
    bpm: Arc<Mutex<f32>>,
    last_beat: Arc<Mutex<Instant>>,
    sound_to_light: Arc<Mutex<bool>>,
    target_universe: Arc<Mutex<[u8; DMX_CHANNELS]>>, // Nouvel univers cible pour les fondus
    fade_speed: Arc<Mutex<f32>>, // Vitesse de fondu (0.0 a 1.0 par tick)
}

impl DmxEngine {
    pub fn new(port_name: &str) -> Self {
        Self {
            universe: Arc::new(Mutex::new([0; DMX_CHANNELS])),
            port_name: port_name.to_string(),
            running: Arc::new(Mutex::new(false)),
            connected: Arc::new(Mutex::new(false)),
            motion_manager: Arc::new(Mutex::new(MotionManager::new(0.5, 0.5, 0.2))),
            motion_mode: Arc::new(Mutex::new(None)),
            motion_fixtures: Arc::new(Mutex::new(Vec::new())),
            motion_speed: Arc::new(Mutex::new(0.5)),
            manual_override: Arc::new(Mutex::new(false)),
            bpm: Arc::new(Mutex::new(120.0)),
            last_beat: Arc::new(Mutex::new(Instant::now())),
            sound_to_light: Arc::new(Mutex::new(false)),
            target_universe: Arc::new(Mutex::new([0; DMX_CHANNELS])),
            fade_speed: Arc::new(Mutex::new(1.0)), // Par defaut, pas de fondu (vitesse max)
        }
    }

    pub fn get_universe_clone(&self) -> Arc<Mutex<[u8; DMX_CHANNELS]>> {
        Arc::clone(&self.universe)
    }

    pub fn get_motion_manager_clone(&self) -> Arc<Mutex<MotionManager>> {
        Arc::clone(&self.motion_manager)
    }

    pub fn get_motion_mode_clone(&self) -> Arc<Mutex<Option<MotionMode>>> {
        Arc::clone(&self.motion_mode)
    }

    pub fn get_motion_fixtures_clone(&self) -> Arc<Mutex<Vec<usize>>> {
        Arc::clone(&self.motion_fixtures)
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

    pub fn start(&self) {
        let mut running_guard = self.running.lock().unwrap();
        if *running_guard {
            return;
        }
        *running_guard = true;

        let universe = Arc::clone(&self.universe);
        let port_name = self.port_name.clone();
        let running = Arc::clone(&self.running);
        let connected = Arc::clone(&self.connected);
        let motion_manager = Arc::clone(&self.motion_manager);
        let motion_mode = Arc::clone(&self.motion_mode);
        let motion_fixtures = Arc::clone(&self.motion_fixtures);
        let motion_speed = Arc::clone(&self.motion_speed);
        let manual_override = Arc::clone(&self.manual_override);
        let last_beat = Arc::clone(&self.last_beat);
        let sound_to_light = Arc::clone(&self.sound_to_light);
        let target_universe = Arc::clone(&self.target_universe);
        let fade_speed = Arc::clone(&self.fade_speed);

        thread::spawn(move || {
            println!("DMX Engine: Tentative d'ouverture du port {}", port_name);
            
            let mut port = match serialport::new(&port_name, 250_000)
                .stop_bits(serialport::StopBits::Two)
                .parity(serialport::Parity::None)
                .timeout(Duration::from_millis(100))
                .open() 
            {
                Ok(p) => {
                    println!("DMX Engine: Port ouvert avec succès.");
                    *connected.lock().unwrap() = true;
                    Some(p)
                },
                Err(e) => {
                    eprintln!("DMX Engine Error: Impossible d'ouvrir le port {}: {}", port_name, e);
                    *connected.lock().unwrap() = false;
                    None
                }
            };

            while *running.lock().unwrap() {
                let start_tick = Instant::now();

                // --- Moteur de Fondu (Fade Engine) ---
                {
                    let target = target_universe.lock().unwrap();
                    let mut current = universe.lock().unwrap();
                    let speed = *fade_speed.lock().unwrap();

                    if speed >= 1.0 {
                        // Pas de fondu, on applique direct
                        for i in 0..DMX_CHANNELS {
                            current[i] = target[i];
                        }
                    } else {
                        // Calcul du fondu lineaire pour chaque canal
                        for i in 0..DMX_CHANNELS {
                            if current[i] != target[i] {
                                let diff = target[i] as f32 - current[i] as f32;
                                let step = diff * speed;
                                
                                // On s'assure de bouger d'au moins 1 unite si la diff est presente
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

                // On ne calcule les mouvements auto QUE si on n'est pas en override manuel
                if !*manual_override.lock().unwrap() {
                    // --- Effet Sound-to-Light (Pulse) ---
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

                    if let Some(mode) = *motion_mode.lock().unwrap() {
                        let mut mm = motion_manager.lock().unwrap();
                        let speed = *motion_speed.lock().unwrap();
                        let (theta1, theta2) = mm.advance(speed);
                        let (nx1, ny1, nx2, ny2) = mm.get_positions(mode, theta1, theta2);

                        let m_fixtures = motion_fixtures.lock().unwrap();
                        let mut target = target_universe.lock().unwrap();
                        
                        for (i, &start_addr) in m_fixtures.iter().enumerate() {
                            if start_addr == 0 || start_addr > DMX_CHANNELS - 1 { continue; }
                            let idx = start_addr - 1;
                            
                            let (nx, ny) = if i % 2 == 0 { (nx1, ny1) } else { (nx2, ny2) };
                            
                            target[idx] = (nx * 255.0) as u8;     // Pan
                            target[idx + 2] = (ny * 255.0) as u8; // Tilt
                        }
                    }
                }

                if let Some(ref mut p) = port {
                    // --- Protocole DMX Enttec Open DMX ---
                    if let Err(e) = p.set_break() {
                        eprintln!("DMX Engine Error: Impossible d'envoyer le break: {}", e);
                        continue;
                    }
                    thread::sleep(Duration::from_micros(100));
                    if let Err(e) = p.clear_break() {
                        eprintln!("DMX Engine Error: Impossible de terminer le break: {}", e);
                        continue;
                    }
                    thread::sleep(Duration::from_micros(12));

                    let mut frame = Vec::with_capacity(DMX_CHANNELS + 1);
                    frame.push(0x00);
                    
                    {
                        let universe_data = universe.lock().unwrap();
                        frame.extend_from_slice(&*universe_data);
                    }

                    if let Err(e) = p.write_all(&frame) {
                        eprintln!("DMX Engine Error: Erreur d'écriture: {}", e);
                    }
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
    pub motion_mode: Arc<Mutex<Option<MotionMode>>>,
    pub motion_manager: Arc<Mutex<MotionManager>>,
    pub motion_fixtures: Arc<Mutex<Vec<usize>>>,
    pub motion_speed: Arc<Mutex<f64>>,
    pub manual_override: Arc<Mutex<bool>>,
    pub bpm: Arc<Mutex<f32>>,
    pub last_beat: Arc<Mutex<Instant>>,
    pub sound_to_light: Arc<Mutex<bool>>,
    pub target_universe: Arc<Mutex<[u8; DMX_CHANNELS]>>,
    pub fade_speed: Arc<Mutex<f32>>,
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
    // On retourne le target_universe plutôt que l'univers actuel pour que l'UI
    // reflète immédiatement les commandes envoyées, même pendant les fondus.
    let target = state.target_universe.lock().unwrap();
    target.to_vec()
}

#[tauri::command]
pub fn set_motion_mode(state: tauri::State<AppState>, mode: Option<MotionMode>) -> Result<(), String> {
    let mut motion_mode = state.motion_mode.lock().unwrap();
    *motion_mode = mode;
    Ok(())
}

#[tauri::command]
pub fn set_motion_center(state: tauri::State<AppState>, x: f64, y: f64) -> Result<(), String> {
    let mut mm = state.motion_manager.lock().unwrap();
    mm.set_center(x, y);
    Ok(())
}

#[tauri::command]
pub fn set_motion_amplitude(state: tauri::State<AppState>, amplitude: f64) -> Result<(), String> {
    let mut mm = state.motion_manager.lock().unwrap();
    mm.set_amplitude(amplitude);
    Ok(())
}

#[tauri::command]
pub fn set_motion_speed(state: tauri::State<AppState>, speed: f64) -> Result<(), String> {
    let mut motion_speed = state.motion_speed.lock().unwrap();
    *motion_speed = speed;
    Ok(())
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
    // On pourrait déclencher un effet spécifique ici
    trigger_beat(state)
}

#[tauri::command]
pub fn reset_motion_time(state: tauri::State<AppState>) -> Result<(), String> {
    let mut mm = state.motion_manager.lock().unwrap();
    mm.reset_time();
    Ok(())
}

#[tauri::command]
pub fn get_motion_cycle_index(state: tauri::State<AppState>, theta_1: f64) -> Result<i64, String> {
    let mm = state.motion_manager.lock().unwrap();
    Ok(mm.cycle_index(theta_1))
}

#[tauri::command]
pub fn set_motion_fixtures(state: tauri::State<AppState>, addresses: Vec<usize>) -> Result<(), String> {
    let mut motion_fixtures = state.motion_fixtures.lock().unwrap();
    *motion_fixtures = addresses;
    Ok(())
}

#[tauri::command]
pub fn stop_engine(state: tauri::State<AppState>) -> Result<(), String> {
    let engine = state.engine.lock().unwrap();
    engine.stop();
    Ok(())
}

#[tauri::command]
pub fn get_connection_status(state: tauri::State<AppState>) -> bool {
    let engine = state.engine.lock().unwrap();
    let is_connected = *engine.connected.lock().unwrap();
    is_connected
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
pub fn open_pdf(handle: tauri::AppHandle, filename: String) -> Result<(), String> {
    // Si c'est un chemin absolu (commence par une lettre de lecteur ou /)
    let path = if filename.contains(':') || filename.starts_with('/') || filename.starts_with('\\') {
        std::path::PathBuf::from(&filename)
    } else {
        // Sinon c'est un fichier dans les ressources
        handle.path_resolver()
            .resolve_resource(format!("resources/pdfs/{}", filename))
            .ok_or_else(|| "Impossible de trouver le chemin des ressources".to_string())?
    };

    if !path.exists() {
        return Err(format!("Le fichier {} n'existe pas.", path.display()));
    }

    // Ouvrir le PDF avec l'application par défaut du système
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
pub fn apply_preset(state: tauri::State<AppState>, universe_data: Vec<u8>, fade_time_ms: Option<u32>) -> Result<(), String> {
    if universe_data.len() != DMX_CHANNELS {
        return Err("Taille de preset invalide".to_string());
    }
    
    // Calcul de la vitesse de fondu
    // On tourne a 40Hz (25ms par tick)
    // Si fade_time_ms = 1000ms, on veut atteindre la cible en 40 ticks
    // vitesse = 1 / nb_ticks
    let speed = match fade_time_ms {
        Some(ms) if ms > 0 => {
            let ticks = ms as f32 / 25.0;
            1.0 / ticks
        },
        _ => 1.0 // Instantané
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

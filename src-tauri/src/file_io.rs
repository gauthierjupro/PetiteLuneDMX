use std::fs;
use std::path::PathBuf;

#[tauri::command]
pub fn save_text_file(path: String, content: String) -> Result<(), String> {
    let path = PathBuf::from(&path);
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }
    fs::write(&path, content).map_err(|e| format!("Écriture impossible ({}): {}", path.display(), e))
}

#[tauri::command]
pub fn load_text_file(path: String) -> Result<String, String> {
    let path = PathBuf::from(&path);
    fs::read_to_string(&path).map_err(|e| format!("Lecture impossible ({}): {}", path.display(), e))
}

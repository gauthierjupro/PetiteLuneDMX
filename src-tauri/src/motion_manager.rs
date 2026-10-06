use std::collections::HashMap;
use std::f64::consts::PI;
use std::time::Instant;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MotionShape {
    None,
    Circle,
    Square,
    Rectangle,
    Triangle,
    Diamond,
    Pentagon,
    Eight,
    PanSweep,
    TiltSweep,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MotionFixtureConfig {
    /// Canal DMX pan (1–512)
    #[serde(alias = "address")]
    pub pan_address: usize,
    /// Canal DMX tilt (1–512)
    #[serde(default)]
    pub tilt_address: usize,
    /// Index dans le groupe (pour le fan / invert180)
    pub index: usize,
    pub invert_pan: bool,
    pub invert_tilt: bool,
    pub offset_pan: f64,
    pub offset_tilt: f64,
    /// Centre pan de la forme pour cette lyre (0–255).
    #[serde(default = "default_motion_center")]
    pub center_pan: f64,
    /// Centre tilt de la forme pour cette lyre (0–255).
    #[serde(default = "default_motion_center")]
    pub center_tilt: f64,
}

fn default_motion_center() -> f64 {
    127.0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupMotionConfig {
    pub group_id: String,
    pub shape: MotionShape,
    /// Vitesse Live (0-255), phase = elapsed * (speed/50)
    pub speed: f64,
    pub size_pan: f64,
    pub size_tilt: f64,
    pub fan: f64,
    pub invert_180: bool,
    pub center_pan: f64,
    pub center_tilt: f64,
    pub custom_points: Vec<MotionPoint>,
    pub fixtures: Vec<MotionFixtureConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MotionPoint {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct MotionPreview {
    pub pan: u8,
    pub tilt: u8,
}

/// Compatibilité ancienne API EffectsTab (circle / streak / ellipse).
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum LegacyMotionMode {
    #[serde(rename = "streak")]
    Streak,
    #[serde(rename = "circle")]
    Circle,
    #[serde(rename = "ellipse")]
    Ellipse,
}

/// Moteur de mouvement unique (source de vérité Live + backend 40 Hz).
pub struct MotionManager {
    groups: Vec<GroupMotionConfig>,
    started_at: Instant,
    legacy_mode: Option<LegacyMotionMode>,
    legacy_center_x: f64,
    legacy_center_y: f64,
    legacy_amplitude: f64,
    legacy_speed: f64,
    legacy_addresses: Vec<usize>,
}

impl MotionManager {
    pub fn new() -> Self {
        Self {
            groups: Vec::new(),
            started_at: Instant::now(),
            legacy_mode: None,
            legacy_center_x: 0.5,
            legacy_center_y: 0.5,
            legacy_amplitude: 0.2,
            legacy_speed: 0.5,
            legacy_addresses: Vec::new(),
        }
    }

    pub fn sync_groups(&mut self, groups: Vec<GroupMotionConfig>) {
        let legacy = self
            .groups
            .iter()
            .find(|g| g.group_id == "__legacy__")
            .cloned();

        let new_groups: Vec<GroupMotionConfig> = groups
            .into_iter()
            .filter(|g| g.shape != MotionShape::None && !g.fixtures.is_empty())
            .collect();

        let old_sig = Self::motion_signature(
            &self
                .groups
                .iter()
                .filter(|g| g.group_id != "__legacy__")
                .cloned()
                .collect::<Vec<_>>(),
        );
        let new_sig = Self::motion_signature(&new_groups);

        self.groups = new_groups;
        if let Some(leg) = legacy {
            self.groups.push(leg);
        }

        // Ne reset le temps que si la forme / vitesse / fixtures changent (pas le centre XY)
        if old_sig != new_sig {
            self.started_at = Instant::now();
        }
    }

    fn motion_signature(groups: &[GroupMotionConfig]) -> String {
        let mut parts: Vec<String> = groups
            .iter()
            .map(|g| {
                let fixtures: Vec<String> = g
                    .fixtures
                    .iter()
                    .map(|f| format!("{}:{}:{}", f.pan_address, f.tilt_address, f.index))
                    .collect();
                format!(
                    "{}|{:?}|{}|{}|{}|{}|{}|{:?}",
                    g.group_id,
                    g.shape,
                    g.speed,
                    g.size_pan,
                    g.size_tilt,
                    g.fan,
                    g.invert_180,
                    fixtures
                )
            })
            .collect();
        parts.sort();
        parts.join(";")
    }

    fn rebuild_legacy(&mut self) {
        self.groups.retain(|g| g.group_id != "__legacy__");
        let Some(mode) = self.legacy_mode else {
            return;
        };
        if self.legacy_addresses.is_empty() {
            return;
        }

        let shape = match mode {
            LegacyMotionMode::Circle => MotionShape::Circle,
            LegacyMotionMode::Streak => MotionShape::Eight,
            LegacyMotionMode::Ellipse => MotionShape::Circle,
        };

        let size = (self.legacy_amplitude * 128.0).clamp(8.0, 128.0);
        let size_tilt = match mode {
            LegacyMotionMode::Ellipse => size * 0.7,
            _ => size,
        };

        let legacy_pan = (self.legacy_center_x * 255.0).clamp(0.0, 255.0);
        let legacy_tilt = (self.legacy_center_y * 255.0).clamp(0.0, 255.0);
        let fixtures = self
            .legacy_addresses
            .iter()
            .enumerate()
            .map(|(index, &address)| MotionFixtureConfig {
                pan_address: address,
                tilt_address: address.saturating_add(1),
                index,
                invert_pan: false,
                invert_tilt: false,
                offset_pan: 0.0,
                offset_tilt: 0.0,
                center_pan: legacy_pan,
                center_tilt: legacy_tilt,
            })
            .collect();

        self.groups.push(GroupMotionConfig {
            group_id: "__legacy__".to_string(),
            shape,
            speed: (self.legacy_speed * 255.0).clamp(1.0, 255.0),
            size_pan: size,
            size_tilt,
            fan: 0.0,
            invert_180: false,
            center_pan: (self.legacy_center_x * 255.0).clamp(0.0, 255.0),
            center_tilt: (self.legacy_center_y * 255.0).clamp(0.0, 255.0),
            custom_points: Vec::new(),
            fixtures,
        });
        self.started_at = Instant::now();
    }

    pub fn set_legacy_mode(&mut self, mode: Option<LegacyMotionMode>) {
        self.legacy_mode = mode;
        self.rebuild_legacy();
    }

    pub fn set_legacy_center(&mut self, x: f64, y: f64) {
        self.legacy_center_x = x;
        self.legacy_center_y = y;
        self.rebuild_legacy();
    }

    pub fn set_legacy_amplitude(&mut self, amplitude: f64) {
        self.legacy_amplitude = amplitude;
        self.rebuild_legacy();
    }

    pub fn set_legacy_speed(&mut self, speed: f64) {
        self.legacy_speed = speed;
        self.rebuild_legacy();
    }

    pub fn set_legacy_fixtures(&mut self, addresses: Vec<usize>) {
        self.legacy_addresses = addresses;
        self.rebuild_legacy();
    }

    pub fn reset_time(&mut self) {
        self.started_at = Instant::now();
    }

    pub fn has_active_motion(&self) -> bool {
        !self.groups.is_empty()
    }

    fn elapsed_secs(&self) -> f64 {
        self.started_at.elapsed().as_secs_f64()
    }

    /// Point sur le périmètre d’un rectangle centré (±w, ±h), u ∈ [0, 1).
    fn rectangle_perimeter(u: f64, w: f64, h: f64) -> (f64, f64) {
        let w = w.abs().max(1e-6);
        let h = h.abs().max(1e-6);
        let u = u.rem_euclid(1.0);
        let mut d = u * 4.0 * (w + h);
        if d < 2.0 * w {
            return (-w + d, h);
        }
        d -= 2.0 * w;
        if d < 2.0 * h {
            return (w, h - d);
        }
        d -= 2.0 * h;
        if d < 2.0 * w {
            return (w - d, -h);
        }
        d -= 2.0 * w;
        (-w, -h + d)
    }

    /// Périmètre d’un polygone régulier (sommets sur une ellipse pan/tilt).
    fn regular_polygon_perimeter(
        u: f64,
        n: usize,
        size_pan: f64,
        size_tilt: f64,
    ) -> (f64, f64) {
        if n < 3 {
            return (0.0, 0.0);
        }
        let u = u.rem_euclid(1.0);
        let mut verts: Vec<(f64, f64)> = Vec::with_capacity(n);
        for k in 0..n {
            let a = -PI / 2.0 + (2.0 * PI * k as f64) / n as f64;
            verts.push((a.cos() * size_pan, a.sin() * size_tilt));
        }
        let seg = u * n as f64;
        let i = seg.floor() as usize % n;
        let t = seg - seg.floor();
        let (x1, y1) = verts[i];
        let (x2, y2) = verts[(i + 1) % n];
        (x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)
    }

    fn shape_offset(
        shape: MotionShape,
        phase: f64,
        size_pan: f64,
        size_tilt: f64,
        custom_points: &[MotionPoint],
        size_pan_raw: f64,
        size_tilt_raw: f64,
    ) -> (f64, f64) {
        match shape {
            MotionShape::None => (0.0, 0.0),
            MotionShape::Circle => (phase.cos() * size_pan, phase.sin() * size_tilt),
            MotionShape::Square => {
                let s = (size_pan + size_tilt) / 2.0;
                let u = phase / (2.0 * PI);
                Self::rectangle_perimeter(u, s, s)
            }
            MotionShape::Rectangle => {
                let u = phase / (2.0 * PI);
                Self::rectangle_perimeter(u, size_pan, size_tilt)
            }
            MotionShape::Triangle => {
                let u = phase / (2.0 * PI);
                Self::regular_polygon_perimeter(u, 3, size_pan, size_tilt)
            }
            MotionShape::Diamond => {
                let u = phase / (2.0 * PI);
                Self::regular_polygon_perimeter(u, 4, size_pan * 0.70710678, size_tilt * 0.70710678)
            }
            MotionShape::Pentagon => {
                let u = phase / (2.0 * PI);
                Self::regular_polygon_perimeter(u, 5, size_pan, size_tilt)
            }
            MotionShape::Eight => (
                phase.cos() * size_pan,
                (phase * 2.0).sin() * (size_tilt / 2.0),
            ),
            MotionShape::PanSweep => (phase.cos() * size_pan, 0.0),
            MotionShape::TiltSweep => (0.0, phase.sin() * size_tilt),
            MotionShape::Custom => {
                if custom_points.len() < 2 {
                    return (0.0, 0.0);
                }
                let total = custom_points.len() as f64;
                let t = phase.rem_euclid(total);
                let i = t.floor() as usize;
                let next_i = (i + 1) % custom_points.len();
                let frac = t - i as f64;
                let p1 = &custom_points[i];
                let p2 = &custom_points[next_i];
                (
                    (p1.x + (p2.x - p1.x) * frac - 127.0) * (size_pan_raw / 128.0),
                    (p1.y + (p2.y - p1.y) * frac - 127.0) * (size_tilt_raw / 128.0),
                )
            }
        }
    }

    fn clamp_u8(v: f64) -> u8 {
        v.round().clamp(0.0, 255.0) as u8
    }

    /// Applique pan/tilt sur l'univers cible (adresses 1-based → index 0-based).
    pub fn apply_to_universe(&self, target: &mut [u8]) {
        let elapsed = self.elapsed_secs();

        for group in &self.groups {
            let speed = group.speed / 50.0;
            let size_pan = group.size_pan / 2.0;
            let size_tilt = group.size_tilt / 2.0;

            for fixture in &group.fixtures {
                let pan_addr = fixture.pan_address;
                let tilt_addr = if fixture.tilt_address != 0 {
                    fixture.tilt_address
                } else {
                    fixture.pan_address.saturating_add(1)
                };
                if pan_addr == 0 || pan_addr > target.len() {
                    continue;
                }

                let phase =
                    elapsed * speed + (fixture.index as f64) * (group.fan / 255.0) * PI * 2.0;
                let (mut pan_off, mut tilt_off) = Self::shape_offset(
                    group.shape,
                    phase,
                    size_pan,
                    size_tilt,
                    &group.custom_points,
                    group.size_pan,
                    group.size_tilt,
                );

                if group.invert_180 && fixture.index % 2 != 0 {
                    pan_off = -pan_off;
                    tilt_off = -tilt_off;
                }

                let mut pan =
                    (fixture.center_pan + pan_off + fixture.offset_pan).clamp(0.0, 255.0);
                let mut tilt =
                    (fixture.center_tilt + tilt_off + fixture.offset_tilt).clamp(0.0, 255.0);

                if fixture.invert_pan {
                    pan = 255.0 - pan;
                }
                if fixture.invert_tilt {
                    tilt = 255.0 - tilt;
                }

                let pan_idx = pan_addr - 1;
                let tilt_idx = tilt_addr.saturating_sub(1);
                if pan_idx < target.len() {
                    target[pan_idx] = Self::clamp_u8(pan);
                }
                if tilt_idx < target.len() {
                    target[tilt_idx] = Self::clamp_u8(tilt);
                }
            }
        }
    }

    /// Aperçu UI : position "groupe" sans fan (index 0).
    pub fn preview(&self) -> HashMap<String, MotionPreview> {
        let elapsed = self.elapsed_secs();
        let mut out = HashMap::new();

        for group in &self.groups {
            let speed = group.speed / 50.0;
            let size_pan = group.size_pan / 2.0;
            let size_tilt = group.size_tilt / 2.0;
            let phase = elapsed * speed;
            let (pan_off, tilt_off) = Self::shape_offset(
                group.shape,
                phase,
                size_pan,
                size_tilt,
                &group.custom_points,
                group.size_pan,
                group.size_tilt,
            );

            out.insert(
                group.group_id.clone(),
                MotionPreview {
                    pan: Self::clamp_u8(group.center_pan + pan_off),
                    tilt: Self::clamp_u8(group.center_tilt + tilt_off),
                },
            );
        }

        out
    }
}

impl Default for MotionManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_manager_has_no_active_motion() {
        let mm = MotionManager::new();
        assert!(!mm.has_active_motion());
    }

    #[test]
    fn sync_empty_groups_clears_motion() {
        let mut mm = MotionManager::new();
        mm.sync_groups(vec![]);
        assert!(!mm.has_active_motion());
    }

    #[test]
    fn circle_shape_produces_preview_in_range() {
        let mut mm = MotionManager::new();
        mm.sync_groups(vec![GroupMotionConfig {
            group_id: "g1".into(),
            shape: MotionShape::Circle,
            speed: 128.0,
            size_pan: 40.0,
            size_tilt: 40.0,
            fan: 0.0,
            invert_180: false,
            center_pan: 127.0,
            center_tilt: 127.0,
            custom_points: vec![],
            fixtures: vec![MotionFixtureConfig {
                pan_address: 1,
                tilt_address: 2,
                index: 0,
                invert_pan: false,
                invert_tilt: false,
                offset_pan: 0.0,
                offset_tilt: 0.0,
                center_pan: 127.0,
                center_tilt: 127.0,
            }],
        }]);
        assert!(mm.has_active_motion());
        let preview = mm.preview();
        let p = preview.get("g1").expect("preview entry");
        assert!(p.pan <= 255);
        assert!(p.tilt <= 255);
    }
}

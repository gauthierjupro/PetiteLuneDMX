use std::f64::consts::PI;

#[derive(Debug, Clone, Copy, serde::Serialize, serde::Deserialize)]
pub enum MotionMode {
    #[serde(rename = "streak")]
    Streak, // Figure-8
    #[serde(rename = "circle")]
    Circle,
    #[serde(rename = "ellipse")]
    Ellipse,
}

pub struct MotionManager {
    center_x: f64,
    center_y: f64,
    amplitude: f64,
    time_counter: f64,
}

impl MotionManager {
    pub fn new(center_x: f64, center_y: f64, amplitude: f64) -> Self {
        Self {
            center_x,
            center_y,
            amplitude,
            time_counter: 0.0,
        }
    }

    pub fn set_center(&mut self, x: f64, y: f64) {
        self.center_x = x;
        self.center_y = y;
    }

    pub fn set_amplitude(&mut self, amplitude: f64) {
        self.amplitude = amplitude;
    }

    pub fn reset_time(&mut self) {
        self.time_counter = 0.0;
    }

    /// Avance le temps en fonction de la vitesse (0-1)
    pub fn advance(&mut self, speed: f64) -> (f64, f64) {
        let step = (0.5 + speed) * 0.15;
        self.time_counter += step;
        let theta_1 = self.time_counter;
        let theta_2 = theta_1 + PI;
        (theta_1, theta_2)
    }

    /// Calcule les positions (nx1, ny1, nx2, ny2) normalisées [0, 1]
    pub fn get_positions(
        &self,
        mode: MotionMode,
        theta_1: f64,
        theta_2: f64,
    ) -> (f64, f64, f64, f64) {
        let xc = self.center_x;
        let yc = self.center_y;
        let a = self.amplitude;

        let (nx1, ny1, nx2, ny2) = match mode {
            MotionMode::Streak => {
                // Figure-8 : X = Xc + A*sin(θ), Y = Yc + A*0.5*sin(2θ)
                (
                    xc + a * theta_1.sin(),
                    yc + a * 0.5 * (2.0 * theta_1).sin(),
                    xc + a * theta_2.sin(),
                    yc + a * 0.5 * (2.0 * theta_2).sin(),
                )
            }
            MotionMode::Ellipse => {
                // Ellipse : X = Xc + A*1.3*cos(θ), Y = Yc + A*0.7*sin(θ)
                (
                    xc + a * 1.3 * theta_1.cos(),
                    yc + a * 0.7 * theta_1.sin(),
                    xc + a * 1.3 * theta_2.cos(),
                    yc + a * 0.7 * theta_2.sin(),
                )
            }
            MotionMode::Circle => {
                // Circle : X = Xc + A*cos(θ), Y = Yc + A*sin(θ)
                (
                    xc + a * theta_1.cos(),
                    yc + a * theta_1.sin(),
                    xc + a * theta_2.cos(),
                    yc + a * theta_2.sin(),
                )
            }
        };

        (
            nx1.clamp(0.0, 1.0),
            ny1.clamp(0.0, 1.0),
            nx2.clamp(0.0, 1.0),
            ny2.clamp(0.0, 1.0),
        )
    }

    pub fn cycle_index(&self, theta_1: f64) -> i64 {
        (theta_1 / (2.0 * PI)).floor() as i64
    }
}

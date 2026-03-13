export enum MotionMode {
  Streak = "streak",
  Circle = "circle",
  Ellipse = "ellipse",
}

export interface Fixture {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  address: number;
  channels: number;
  universe: number;
}

export interface Preset {
  id: number;
  name: string;
  fixtures: Record<string, number[]>;
}

export interface AppState {
  masterDimmer: number;
  blackout: boolean;
  isConnected: boolean;
  activePreset?: number;
}

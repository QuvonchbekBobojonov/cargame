/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Language = 'uz' | 'en';

export type GameMode = 'world_tour' | 'open_world' | 'stunt_arena';

export type CameraMode = 'chase' | 'cockpit' | 'top_down' | 'cinematic';

export type ShipModel =
  | 'damas'
  | 'matiz'
  | 'spark'
  | 'nexia3'
  | 'gentra'
  | 'cobalt'
  | 'onix'
  | 'monza'
  | 'malibu2'
  | 'tracker2'
  | 'byd_uz'
  | 'gtr_supercar'
  | 'muscle_v8'
  | 'hyper_phantom'
  | 'falcon';

export type ShipColor =
  | 'white'
  | 'black'
  | 'silver'
  | 'cyan'
  | 'crimson'
  | 'violet'
  | 'gold'
  | 'emerald';

export type GameStatus = 'menu' | 'playing' | 'paused' | 'game_over';

export type WorldRegionId = 'tashkent' | 'khorezm' | 'samarkand' | 'm39_highway';

export interface WorldRegion {
  id: WorldRegionId;
  name: { uz: string; en: string };
  flag: string;
  country: { uz: string; en: string };
  city: { uz: string; en: string };
  description: { uz: string; en: string };
  skyColor: number;
  fogColor: number;
  fogDensity: number;
  groundColor: number;
  roadColor: number;
  landmark: { uz: string; en: string };
}

export interface VehicleConfig {
  id: ShipModel;
  category: 'uzbek' | 'supercar';
  badge: string;
  name: { uz: string; en: string };
  description: { uz: string; en: string };
  type: 'car' | 'hover';
  topSpeed: number; // km/h
  acceleration: number;
  handling: number;
  shieldMax: number;
}

export interface ColorScheme {
  id: ShipColor;
  name: { uz: string; en: string };
  primary: number; // hex
  secondary: number;
  glow: number;
  cssGlow: string;
}

export interface PlayerStats {
  score: number;
  highScore: number;
  distance: number;
  speed: number;
  maxSpeedReached: number;
  gear: number;
  rpm: number;
  crystals: number;
  multiplier: number;
  comboCount: number;
  shields: number;
  maxShields: number;
  nitro: number; // 0 to 100
  isNitroActive: boolean;
  lapTime: number;
  bestLapTime: number;
  stuntScore: number;
  lastStuntName: string;
  // O'zbekiston hududlari telemetriyasi
  currentRegion: WorldRegionId;
  regionName: string;
  regionProgress: number; // 0 to 100%
  worldX: number;
  worldZ: number;
  // Poyga reytingi (Raqib moshinalar)
  racePosition: number;
  totalRacers: number;
  // Ochiq dunyo, haydovchi va YPX/GAI holati
  isOnFoot: boolean;
  energy: number; // 0 to 100 (Dam olish)
  hunger: number; // 0 to 100 (Ovqat)
  sirenActive: boolean;
  migalkaActive: boolean;
  nearbyPoi: 'none' | 'choyxona' | 'rest_park' | 'fuel' | 'gai_post';
  nearbyPoiLabel: string;
  nearCar: boolean;
  gaiAlert: number; // 0: tinch, 1: tezlik oshirildi, 2: GAI quvmoqda
  gaiFines: number;
  headlightsOn: boolean;
}

export interface ControlInputState {
  steer: number; // -1 (left) to 1 (right)
  throttle: number; // -1 (brake/reverse), 0 (coast), 1 (gas)
  boost: boolean;
  jump: boolean;
  drift: boolean;
  horn?: boolean;
}

export interface GameSettings {
  language: Language;
  soundEnabled: boolean;
  musicEnabled: boolean;
  volume: number;
  touchControls: 'auto' | 'always' | 'never';
  touchStyle: 'joystick' | 'buttons';
  cameraMode: CameraMode;
  graphicsQuality: 'high' | 'medium' | 'low';
}

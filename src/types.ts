export type FaceType = 'U' | 'D' | 'L' | 'R' | 'F' | 'B';

export type ColorCode = 'W' | 'G' | 'R' | 'B' | 'O' | 'Y' | 'X';

export interface Cubie {
  // Coordinates are -1, 0, 1
  x: number;
  y: number;
  z: number;
  // Face colors in order: +x, -x, +y, -y, +z, -z
  // Indices: 0: Right, 1: Left, 2: Up, 3: Down, 4: Front, 5: Back
  // If a face has no sticker (it's internal), its color value is null
  colors: (ColorCode | null)[];
}

export type FlatCubeState = Record<FaceType, ColorCode[]>;

export interface SolveStep {
  move: string;
  explanation: string;
  phase: string;
}

export const COLOR_HEX: Record<ColorCode, string> = {
  W: '#FFFFFF',
  G: '#10B981', // Emerald Emerald/Green
  R: '#EF4444', // Red
  B: '#3B82F6', // Blue
  O: '#F97316', // Orange
  Y: '#FBBF24', // Amber/Yellow
  X: '#27272A', // Charcoal gray/black for unpainted blank stickers
};

export const COLOR_NAME: Record<ColorCode, string> = {
  W: 'Putih',
  G: 'Hijau',
  R: 'Merah',
  B: 'Biru',
  O: 'Oranye',
  Y: 'Kuning',
  X: 'Kosong (Belum Diwarnai)',
};

export const FACE_NAME: Record<FaceType, string> = {
  U: 'Up (Atas)',
  D: 'Down (Bawah)',
  L: 'Left (Kiri)',
  R: 'Right (Kanan)',
  F: 'Front (Depan)',
  B: 'Back (Belakang)',
};

// Default centers
export const DEFAULT_CENTERS: Record<FaceType, ColorCode> = {
  U: 'Y', // Atas: Kuning
  D: 'W', // Bawah: Putih
  L: 'O', // Kiri: Oranye
  R: 'R', // Kanan: Merah
  F: 'G', // Depan: Hijau
  B: 'B', // Belakang: Biru
};


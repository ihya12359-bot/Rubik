import { FaceType, ColorCode, Cubie, FlatCubeState, DEFAULT_CENTERS } from '../types';

export function getInitialFlatState(): FlatCubeState {
  return {
    U: Array(9).fill('Y'), // Yellow Up
    D: Array(9).fill('W'), // White Down
    L: Array(9).fill('O'), // Orange Left
    R: Array(9).fill('R'), // Red Right
    F: Array(9).fill('G'), // Green Front
    B: Array(9).fill('B'), // Blue Back
  };
}

// Maps flat state indices to Cubie coordinates and face-sticker index
// Output helper maps coord (x,y,z) and face to a specific index in FlatCubeState
export const STICKER_MAPPING: Record<
  FaceType,
  { idx: number; x: number; y: number; z: number; colorIdx: number }[]
> = {
  U: [
    { idx: 0, x: -1, y: 1, z: -1, colorIdx: 2 },
    { idx: 1, x: 0, y: 1, z: -1, colorIdx: 2 },
    { idx: 2, x: 1, y: 1, z: -1, colorIdx: 2 },
    { idx: 3, x: -1, y: 1, z: 0, colorIdx: 2 },
    { idx: 4, x: 0, y: 1, z: 0, colorIdx: 2 },
    { idx: 5, x: 1, y: 1, z: 0, colorIdx: 2 },
    { idx: 6, x: -1, y: 1, z: 1, colorIdx: 2 },
    { idx: 7, x: 0, y: 1, z: 1, colorIdx: 2 },
    { idx: 8, x: 1, y: 1, z: 1, colorIdx: 2 },
  ],
  D: [
    { idx: 0, x: -1, y: -1, z: 1, colorIdx: 3 },
    { idx: 1, x: 0, y: -1, z: 1, colorIdx: 3 },
    { idx: 2, x: 1, y: -1, z: 1, colorIdx: 3 },
    { idx: 3, x: -1, y: -1, z: 0, colorIdx: 3 },
    { idx: 4, x: 0, y: -1, z: 0, colorIdx: 3 },
    { idx: 5, x: 1, y: -1, z: 0, colorIdx: 3 },
    { idx: 6, x: -1, y: -1, z: -1, colorIdx: 3 },
    { idx: 7, x: 0, y: -1, z: -1, colorIdx: 3 },
    { idx: 8, x: 1, y: -1, z: -1, colorIdx: 3 },
  ],
  L: [
    { idx: 0, x: -1, y: 1, z: -1, colorIdx: 1 },
    { idx: 1, x: -1, y: 1, z: 0, colorIdx: 1 },
    { idx: 2, x: -1, y: 1, z: 1, colorIdx: 1 },
    { idx: 3, x: -1, y: 0, z: -1, colorIdx: 1 },
    { idx: 4, x: -1, y: 0, z: 0, colorIdx: 1 },
    { idx: 5, x: -1, y: 0, z: 1, colorIdx: 1 },
    { idx: 6, x: -1, y: -1, z: -1, colorIdx: 1 },
    { idx: 7, x: -1, y: -1, z: 0, colorIdx: 1 },
    { idx: 8, x: -1, y: -1, z: 1, colorIdx: 1 },
  ],
  R: [
    { idx: 0, x: 1, y: 1, z: 1, colorIdx: 0 },
    { idx: 1, x: 1, y: 1, z: 0, colorIdx: 0 },
    { idx: 2, x: 1, y: 1, z: -1, colorIdx: 0 },
    { idx: 3, x: 1, y: 0, z: 1, colorIdx: 0 },
    { idx: 4, x: 1, y: 0, z: 0, colorIdx: 0 },
    { idx: 5, x: 1, y: 0, z: -1, colorIdx: 0 },
    { idx: 6, x: 1, y: -1, z: 1, colorIdx: 0 },
    { idx: 7, x: 1, y: -1, z: 0, colorIdx: 0 },
    { idx: 8, x: 1, y: -1, z: -1, colorIdx: 0 },
  ],
  F: [
    { idx: 0, x: -1, y: 1, z: 1, colorIdx: 4 },
    { idx: 1, x: 0, y: 1, z: 1, colorIdx: 4 },
    { idx: 2, x: 1, y: 1, z: 1, colorIdx: 4 },
    { idx: 3, x: -1, y: 0, z: 1, colorIdx: 4 },
    { idx: 4, x: 0, y: 0, z: 1, colorIdx: 4 },
    { idx: 5, x: 1, y: 0, z: 1, colorIdx: 4 },
    { idx: 6, x: -1, y: -1, z: 1, colorIdx: 4 },
    { idx: 7, x: 0, y: -1, z: 1, colorIdx: 4 },
    { idx: 8, x: 1, y: -1, z: 1, colorIdx: 4 },
  ],
  B: [
    { idx: 0, x: 1, y: 1, z: -1, colorIdx: 5 },
    { idx: 1, x: 0, y: 1, z: -1, colorIdx: 5 },
    { idx: 2, x: -1, y: 1, z: -1, colorIdx: 5 },
    { idx: 3, x: 1, y: 0, z: -1, colorIdx: 5 },
    { idx: 4, x: 0, y: 0, z: -1, colorIdx: 5 },
    { idx: 5, x: -1, y: 0, z: -1, colorIdx: 5 },
    { idx: 6, x: 1, y: -1, z: -1, colorIdx: 5 },
    { idx: 7, x: 0, y: -1, z: -1, colorIdx: 5 },
    { idx: 8, x: -1, y: -1, z: -1, colorIdx: 5 },
  ],
};

// Generates 26 cubies with accurate colors based on a flat state
export function makeCubiesFromFlat(flat: FlatCubeState): Cubie[] {
  const cubies: Cubie[] = [];

  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        if (x === 0 && y === 0 && z === 0) continue; // Skip core

        // Initialize empty face colors (null corresponds to internal black faces)
        const colors: (ColorCode | null)[] = Array(6).fill(null);

        // +x (Right)
        if (x === 1) {
          const mapping = STICKER_MAPPING.R.find((m) => m.x === x && m.y === y && m.z === z);
          if (mapping) colors[0] = flat.R[mapping.idx];
        }
        // -x (Left)
        if (x === -1) {
          const mapping = STICKER_MAPPING.L.find((m) => m.x === x && m.y === y && m.z === z);
          if (mapping) colors[1] = flat.L[mapping.idx];
        }
        // +y (Up)
        if (y === 1) {
          const mapping = STICKER_MAPPING.U.find((m) => m.x === x && m.y === y && m.z === z);
          if (mapping) colors[2] = flat.U[mapping.idx];
        }
        // -y (Down)
        if (y === -1) {
          const mapping = STICKER_MAPPING.D.find((m) => m.x === x && m.y === y && m.z === z);
          if (mapping) colors[3] = flat.D[mapping.idx];
        }
        // +z (Front)
        if (z === 1) {
          const mapping = STICKER_MAPPING.F.find((m) => m.x === x && m.y === y && m.z === z);
          if (mapping) colors[4] = flat.F[mapping.idx];
        }
        // -z (Back)
        if (z === -1) {
          const mapping = STICKER_MAPPING.B.find((m) => m.x === x && m.y === y && m.z === z);
          if (mapping) colors[5] = flat.B[mapping.idx];
        }

        cubies.push({ x, y, z, colors });
      }
    }
  }

  return cubies;
}

// Generates FlatCubeState from standard 26 cubies
export function makeFlatFromCubies(cubies: Cubie[]): FlatCubeState {
  const flat: FlatCubeState = {
    U: Array(9).fill('Y'),
    D: Array(9).fill('W'),
    L: Array(9).fill('O'),
    R: Array(9).fill('R'),
    F: Array(9).fill('G'),
    B: Array(9).fill('B'),
  };

  const faces: FaceType[] = ['U', 'D', 'L', 'R', 'F', 'B'];

  for (const face of faces) {
    const mappings = STICKER_MAPPING[face];
    for (const m of mappings) {
      // Find the cubie at the coordinates
      const cubie = cubies.find((c) => c.x === m.x && c.y === m.y && c.z === m.z);
      if (cubie) {
        flat[face][m.idx] = cubie.colors[m.colorIdx] || DEFAULT_CENTERS[face];
      }
    }
  }

  // Force center pieces to follow standard solver setup (otherwise centers might turn under LBL, which disrupts LBL solvers)
  flat.U[4] = 'Y';
  flat.D[4] = 'W';
  flat.L[4] = 'O';
  flat.R[4] = 'R';
  flat.F[4] = 'G';
  flat.B[4] = 'B';

  return flat;
}

// Low-level mathematical rotation of a single cubie
export function rotateCubie(cubie: Cubie, axis: 'x' | 'y' | 'z', clockwise: boolean): Cubie {
  const result = { ...cubie, colors: [...cubie.colors] };

  if (axis === 'x') {
    // Rotation in YZ plane
    if (clockwise) {
      result.y = -cubie.z;
      result.z = cubie.y;
      // Colors: +y (2) -> -z (5) -> -y (3) -> +z (4) -> +y (2)
      const temp = result.colors[2];
      result.colors[2] = result.colors[4]; // +y receives +z (+z is counter-clockwise shifted)
      result.colors[4] = result.colors[3]; // +z receives -y
      result.colors[3] = result.colors[5]; // -y receives -z
      result.colors[5] = temp;             // -z receives +y
    } else {
      result.y = cubie.z;
      result.z = -cubie.y;
      const temp = result.colors[2];
      result.colors[2] = result.colors[5]; // +y receives -z
      result.colors[5] = result.colors[3]; // -z receives -y
      result.colors[3] = result.colors[4]; // -y receives +z
      result.colors[4] = temp;             // +z receives +y
    }
  } else if (axis === 'y') {
    // Rotation in XZ plane
    if (clockwise) {
      result.x = -cubie.z;
      result.z = cubie.x;
      // Colors: -z (5) -> +x (0) -> +z (4) -> -x (1) -> -z (5)
      const temp = result.colors[5];
      result.colors[5] = result.colors[1]; // -z receives -x
      result.colors[1] = result.colors[4]; // -x receives +z
      result.colors[4] = result.colors[0]; // +z receives +x
      result.colors[0] = temp;             // +x receives -z
    } else {
      result.x = cubie.z;
      result.z = -cubie.x;
      const temp = result.colors[5];
      result.colors[5] = result.colors[0]; // -z receives +x
      result.colors[0] = result.colors[4]; // +x receives +z
      result.colors[4] = result.colors[1]; // +z receives -x
      result.colors[1] = temp;             // -x receives -z
    }
  } else if (axis === 'z') {
    // Rotation in XY plane
    if (clockwise) {
      result.x = -cubie.y;
      result.y = cubie.x;
      // Colors: +y (2) -> +x (0) -> -y (3) -> -x (1) -> +y (2)
      const temp = result.colors[2];
      result.colors[2] = result.colors[1]; // +y receives -x
      result.colors[1] = result.colors[3]; // -x receives -y
      result.colors[3] = result.colors[0]; // -y receives +x
      result.colors[0] = temp;             // +x receives +y
    } else {
      result.x = cubie.y;
      result.y = -cubie.x;
      const temp = result.colors[2];
      result.colors[2] = result.colors[0]; // +y receives +x
      result.colors[0] = result.colors[3]; // +x receives -y
      result.colors[3] = result.colors[1]; // -y receives -x
      result.colors[1] = temp;             // -x receives +y
    }
  }

  return result;
}

// Executes a standard move notation (e.g., "R", "L'", "U2") on cubies representation
export function executeMoveOnCubies(cubies: Cubie[], move: string): Cubie[] {
  // Parse move
  const baseMove = move.charAt(0);
  const modifier = move.slice(1);

  let times = 1;
  let clockwise = true;

  if (modifier === "'") {
    clockwise = false;
  } else if (modifier === '2') {
    times = 2;
  }

  let axis: 'x' | 'y' | 'z' = 'x';
  let layerVal = 1;

  switch (baseMove) {
    case 'R':
      axis = 'x';
      layerVal = 1;
      break;
    case 'L':
      axis = 'x';
      layerVal = -1;
      clockwise = !clockwise; // L clockwise is CCW around +x axis
      break;
    case 'U':
      axis = 'y';
      layerVal = 1;
      break;
    case 'D':
      axis = 'y';
      layerVal = -1;
      clockwise = !clockwise; // D clockwise is CCW around +y axis
      break;
    case 'F':
      axis = 'z';
      layerVal = 1;
      break;
    case 'B':
      axis = 'z';
      layerVal = -1;
      clockwise = !clockwise; // B clockwise is CCW around +z axis
      break;
    default:
      return cubies; // Unknown move
  }

  let current = cubies.map((c) => ({ ...c, colors: [...c.colors] }));

  for (let t = 0; t < times; t++) {
    current = current.map((c) => {
      // Determine if this cubie belongs to the rotated layer
      const belongs =
        (axis === 'x' && c.x === layerVal) ||
        (axis === 'y' && c.y === layerVal) ||
        (axis === 'z' && c.z === layerVal);

      if (belongs) {
        return rotateCubie(c, axis, clockwise);
      }
      return c;
    });
  }

  return current;
}

// Executes a move on the flat representations directly
export function executeMoveOnFlat(flat: FlatCubeState, move: string): FlatCubeState {
  const cubies = makeCubiesFromFlat(flat);
  const afterMove = executeMoveOnCubies(cubies, move);
  return makeFlatFromCubies(afterMove);
}

// Helper: check if FlatCubeState is completely solved
export function isCubeSolved(flat: FlatCubeState): boolean {
  const faces: FaceType[] = ['U', 'D', 'L', 'R', 'F', 'B'];
  for (const f of faces) {
    const color = flat[f][4]; // Center color
    for (let i = 0; i < 9; i++) {
      if (flat[f][i] !== color) return false;
    }
  }
  return true;
}

// Dynamic input validation
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateFlatCube(flat: FlatCubeState): ValidationResult {
  const errors: string[] = [];

  // 1. Check center colors (centers must be unique and match default layout or at least be distinct)
  const centers: Record<FaceType, ColorCode> = {
    U: flat.U[4],
    D: flat.D[4],
    L: flat.L[4],
    R: flat.R[4],
    F: flat.F[4],
    B: flat.B[4],
  };

  const centerSet = new Set(Object.values(centers));
  if (centerSet.size !== 6) {
    errors.push('Warna pusat setiap sisi harus unik! Sisi tengah tidak boleh memiliki warna yang sama.');
  }

  // 2. Counts of each color must be exactly 9 (excluding X which represents empty)
  const counts: Record<Exclude<ColorCode, 'X'>, number> = {
    W: 0,
    G: 0,
    R: 0,
    B: 0,
    O: 0,
    Y: 0,
  };

  let emptyCount = 0;

  const faces: FaceType[] = ['U', 'D', 'L', 'R', 'F', 'B'];
  for (const f of faces) {
    for (let i = 0; i < 9; i++) {
      const col = flat[f][i];
      if (col === 'X') {
        emptyCount++;
      } else if (counts[col] !== undefined) {
        counts[col]++;
      }
    }
  }

  if (emptyCount > 0) {
    errors.push(`Ada ${emptyCount} kotak kosong yang belum diwarnai. Silakan lengkapi semua sisi terlebih dahulu.`);
  }

  for (const [col, count] of Object.entries(counts)) {
    if (count !== 9 && emptyCount === 0) {
      errors.push(`Jumlah warna "${(col as ColorCode)}" adalah ${count}, seharusnya tepat 9.`);
    }
  }

  // 3. Simple edge consistency check: Check edge cubies
  // There are 12 edge cubies, each has exactly 2 stickers. Symmetrical stickers must exist.
  // We can let the solver try to solve or fail elegantly. But simple checks are useful.

  return {
    isValid: errors.length === 0,
    errors,
  };
}

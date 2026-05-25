import { FlatCubeState, SolveStep, ColorCode, Cubie } from '../types';
import {
  makeCubiesFromFlat,
  makeFlatFromCubies,
  executeMoveOnCubies,
  isCubeSolved,
  validateFlatCube,
} from './cubeState';

// Define the LBL Phases
export const PHASES = {
  DAISY: '1. Membuat Daisy (Bunga Aster)',
  CROSS: '2. Menyelesaikan Cross Putih',
  FIRST_LAYER: '3. Menyelesaikan Layer Pertama',
  SECOND_LAYER: '4. Menyelesaikan Layer Kedua',
  YELLOW_CROSS: '5. Membuat Cross Kuning Atas',
  ALIGN_YELLOW_CROSS: '6. Menyelaraskan Sisi Cross Kuning',
  YELLOW_CORNERS_POS: '7. Menempatkan Sudut Kuning',
  YELLOW_CORNERS_ORI: '8. Mengorientasikan Sudut Kuning',
};

// Represents the main solver
export function solveCube(initialFlat: FlatCubeState): SolveStep[] {
  // First, validate if the cube is valid
  const validation = validateFlatCube(initialFlat);
  if (!validation.isValid) {
    throw new Error(validation.errors.join(' | '));
  }

  let cubies = makeCubiesFromFlat(initialFlat);
  const steps: SolveStep[] = [];

  // Helper to execute moves and record them
  const makeMoves = (moves: string[], explanation: string, phase: string) => {
    for (const move of moves) {
      if (!move) continue;
      cubies = executeMoveOnCubies(cubies, move);
      steps.push({ move, explanation, phase });
    }
  };

  // Safe checks to avoid infinite loops in case of parity errors undetected initially
  let safetyCounter = 0;
  const maxMoves = 150; // A beginner solver should take at most 120-130 moves. If more, it's unsafe or unsolvable.

  // ==========================================
  // PHASE 1: DAISY (White edges on Yellow Top)
  // Target: White stickers pointing UP on U layer at (0, 1, 1), (1, 1, 0), (0, 1, -1), (-1, 1, 0)
  // ==========================================
  const daisyPhase = () => {
    let subSafety = 0;
    while (subSafety < 40) {
      subSafety++;
      // Let's check status of the 4 Daisy edges
      const daisyCoords = [
        { x: 0, z: 1, uIdx: 7 },  // Front-Up
        { x: 1, z: 0, uIdx: 5 },  // Right-Up
        { x: 0, z: -1, uIdx: 1 }, // Back-Up
        { x: -1, z: 0, uIdx: 3 }, // Left-Up
      ];

      // Count solved Daisy edges
      const isDaisySolved = daisyCoords.every((coord) => {
        const c = cubies.find((cb) => cb.x === coord.x && cb.y === 1 && cb.z === coord.z);
        return c && c.colors[2] === 'W';
      });

      if (isDaisySolved) break;

      // Find a white edge cubie that is not currently oriented on U with White Up
      const wEdge = cubies.find((c) => {
        // Is edge? count non-null colors
        const colorCount = c.colors.filter((cl) => cl !== null).length;
        if (colorCount !== 2) return false;
        // Has white?
        if (!c.colors.includes('W')) return false;
        // Is already safely placed on U with White pointing Up?
        if (c.y === 1 && c.colors[2] === 'W') return false;
        return true;
      });

      if (!wEdge) {
        // Should not happen unless state is corrupt
        break;
      }

      // Helper: Rotates the top layer (U) to make the target destination slot empty (not containing a White sticker on U)
      // Destination we want to rotate to can be configured based on rotation target
      const clearSlot = (targetX: number, targetZ: number) => {
        let uTurns = 0;
        while (uTurns < 4) {
          const slotCubie = cubies.find((cb) => cb.x === targetX && cb.y === 1 && cb.z === targetZ);
          if (slotCubie && slotCubie.colors[2] === 'W') {
            makeMoves(['U'], 'Memutar sisi atas untuk mengosongkan slot Daisy', PHASES.DAISY);
            uTurns++;
          } else {
            break;
          }
        }
      };

      // Now move the found white edge onto the U layer based on its current location:
      // Case A: Its on the bottom layer (y = -1)
      if (wEdge.y === -1) {
        // Find which face contains the white sticker of this edge
        const whiteFaceIdx = wEdge.colors.indexOf('W');
        if (whiteFaceIdx === 3) {
          // White is on the bottom (D) face
          // We can just rotate this face by 180 degrees!
          // But check which face it is on
          if (wEdge.z === 1) { // Front
            clearSlot(0, 1);
            makeMoves(['F2'], 'Memutar sisi depan 180 derajat untuk menaikkan edge putih ke atas', PHASES.DAISY);
          } else if (wEdge.x === 1) { // Right
            clearSlot(1, 0);
            makeMoves(['R2'], 'Memutar sisi kanan 180 derajat untuk menaikkan edge putih ke atas', PHASES.DAISY);
          } else if (wEdge.z === -1) { // Back
            clearSlot(0, -1);
            makeMoves(['B2'], 'Memutar sisi belakang 180 derajat untuk menaikkan edge putih ke atas', PHASES.DAISY);
          } else if (wEdge.x === -1) { // Left
            clearSlot(-1, 0);
            makeMoves(['L2'], 'Memutar sisi kiri 180 derajat untuk menaikkan edge putih ke atas', PHASES.DAISY);
          }
        } else {
          // White is on the side on bottom layer
          // We can rotate the side face by 90 degrees to move it to middle layer, then solve from there
          if (wEdge.z === 1) { // Front
            clearSlot(1, 0);
            makeMoves(['F'], 'Menaikkan edge putih ke layer tengah', PHASES.DAISY);
          } else if (wEdge.x === 1) { // Right
            clearSlot(0, -1);
            makeMoves(['R'], 'Menaikkan edge putih ke layer tengah', PHASES.DAISY);
          } else if (wEdge.z === -1) { // Back
            clearSlot(-1, 0);
            makeMoves(['B'], 'Menaikkan edge putih ke layer tengah', PHASES.DAISY);
          } else if (wEdge.x === -1) { // Left
            clearSlot(0, 1);
            makeMoves(['L'], 'Menaikkan edge putih ke layer tengah', PHASES.DAISY);
          }
        }
      }
      // Case B: In the middle layer (y = 0)
      else if (wEdge.y === 0) {
        // The 4 positions:
        // FR: (1, 0, 1)
        // FL: (-1, 0, 1)
        // BR: (1, 0, -1)
        // BL: (-1, 0, -1)
        const whiteFaceIdx = wEdge.colors.indexOf('W');
        if (wEdge.x === 1 && wEdge.z === 1) { // FR
          if (whiteFaceIdx === 4) { // White is Front
            clearSlot(1, 0);
            makeMoves(["R"], 'Memutar sisi kanan untuk menaikkan edge putih ke atas', PHASES.DAISY);
          } else { // White is Right
            clearSlot(0, 1);
            makeMoves(["F'"], 'Memutar sisi depan untuk menaikkan edge putih ke atas', PHASES.DAISY);
          }
        } else if (wEdge.x === -1 && wEdge.z === 1) { // FL
          if (whiteFaceIdx === 4) { // White is Front
            clearSlot(-1, 0);
            makeMoves(["L'"], 'Memutar sisi kiri untuk menaikkan edge putih ke atas', PHASES.DAISY);
          } else { // White is Left
            clearSlot(0, 1);
            makeMoves(["F"], 'Memutar sisi depan untuk menaikkan edge putih ke atas', PHASES.DAISY);
          }
        } else if (wEdge.x === 1 && wEdge.z === -1) { // BR
          if (whiteFaceIdx === 5) { // White is Back
            clearSlot(1, 0);
            makeMoves(["R'"], 'Memutar sisi kanan untuk menaikkan edge putih ke atas', PHASES.DAISY);
          } else { // White is Right
            clearSlot(0, -1);
            makeMoves(["B"], 'Memutar sisi belakang untuk menaikkan edge putih ke atas', PHASES.DAISY);
          }
        } else if (wEdge.x === -1 && wEdge.z === -1) { // BL
          if (whiteFaceIdx === 5) { // White is Back
            clearSlot(-1, 0);
            makeMoves(["L"], 'Memutar sisi kiri untuk menaikkan edge putih ke atas', PHASES.DAISY);
          } else { // White is Left
            clearSlot(0, -1);
            makeMoves(["B'"], 'Memutar sisi belakang untuk menaikkan edge putih ke atas', PHASES.DAISY);
          }
        }
      }
      // Case C: On the Top layer (y = 1) but white is on the side instead of looking up
      else if (wEdge.y === 1) {
        // Rotate the side face to bring it to middle layer, then use middle layer logic
        if (wEdge.z === 1) { // Front
          clearSlot(1, 0);
          makeMoves(['F'], 'Memutar sisi depan untuk mengarahkan kembali edge putih', PHASES.DAISY);
        } else if (wEdge.x === 1) { // Right
          clearSlot(0, -1);
          makeMoves(['R'], 'Memutar sisi kanan untuk mengarahkan kembali edge putih', PHASES.DAISY);
        } else if (wEdge.z === -1) { // Back
          clearSlot(-1, 0);
          makeMoves(['B'], 'Memutar sisi belakang untuk mengarahkan kembali edge putih', PHASES.DAISY);
        } else if (wEdge.x === -1) { // Left
          clearSlot(0, 1);
          makeMoves(['L'], 'Memutar sisi kiri untuk mengarahkan kembali edge putih', PHASES.DAISY);
        }
      }
    }
  };

  // ==========================================
  // PHASE 2: WHITE CROSS (Align and rotate 180 deg)
  // Target: White sticker point DOWN on D, matching their side centers
  // ==========================================
  const crossPhase = () => {
    // For each of the four side faces (F=Green, R=Red, B=Blue, L=Orange)
    // We rotate U until the core edge color matches the face center, then rotate that face by 180 degrees.
    const order: { face: 'F' | 'R' | 'B' | 'L'; centerColor: ColorCode; x: number; z: number }[] = [
      { face: 'F', centerColor: 'G', x: 0, z: 1 },
      { face: 'R', centerColor: 'R', x: 1, z: 0 },
      { face: 'B', centerColor: 'B', x: 0, z: -1 },
      { face: 'L', centerColor: 'O', x: -1, z: 0 },
    ];

    for (const item of order) {
      let subSafety = 0;
      while (subSafety < 4) {
        subSafety++;
        // Find the cubie at the U layer at this specific direction (e.g., U-F which is (0,1,1))
        const c = cubies.find((cb) => cb.x === item.x && cb.y === 1 && cb.z === item.z);
        if (c && c.colors[2] === 'W') {
          // Check non-white color
          const otherCol = c.colors.find((col) => col !== null && col !== 'W');
          if (otherCol === item.centerColor) {
            // Match! Execute double turn of the side face
            makeMoves(
              [item.face + '2'],
              `Menyelesaikan cross putih bagian ${item.face}: warna ${otherCol} selaras dengan pusat`,
              PHASES.CROSS
            );
            break;
          }
        }
        // Rotate U to find it
        makeMoves(['U'], 'Memutar sisi atas untuk menyelaraskan warna edge dengan pusat sisi', PHASES.CROSS);
      }
    }
  };

  // ==========================================
  // PHASE 3: FIRST LAYER (White Corners)
  // Target: Placed and oriented White corners.
  // We look for White corners and put them into correct slots.
  // ==========================================
  const firstLayerPhase = () => {
    // Standard insert algorithm: R U R' U' (Sextuple/Sexy move)
    let subSafety = 0;
    while (subSafety < 40) {
      subSafety++;

      // Check if first-layer corners are solved
      const cornerCoords = [
        { x: 1, z: 1, colors: ['W', 'G', 'R'] },   // D-F-R corner (R, G, W)
        { x: -1, z: 1, colors: ['W', 'G', 'O'] },  // D-F-L corner (L, G, W)
        { x: 1, z: -1, colors: ['W', 'B', 'R'] },  // D-B-R corner (R, B, W)
        { x: -1, z: -1, colors: ['W', 'B', 'O'] }, // D-B-L corner (L, B, W)
      ];

      const allSolved = cornerCoords.every((coord) => {
        const c = cubies.find((cb) => cb.x === coord.x && cb.y === -1 && cb.z === coord.z);
        return c && c.colors[3] === 'W' && // white facing down
          (coord.x === 1 ? c.colors[0] === 'R' : c.colors[1] === 'O') &&
          (coord.z === 1 ? c.colors[4] === 'G' : c.colors[5] === 'B');
      });

      if (allSolved) break;

      // Find a corner cubie with White
      const wCorner = cubies.find((c) => {
        const nonNulls = c.colors.filter((cl) => cl !== null);
        if (nonNulls.length !== 3) return false; // Not corner
        if (!c.colors.includes('W')) return false; // No white
        // Check if already solved in bottom layer
        if (c.y === -1 && c.colors[3] === 'W') {
          // Check if coordinates and matching colors are correct
          const exactX = c.x === 1 ? 'R' : 'O';
          const exactZ = c.z === 1 ? 'G' : 'B';
          const matchXIdx = c.x === 1 ? 0 : 1;
          const matchZIdx = c.z === 1 ? 4 : 5;
          if (c.colors[matchXIdx] === exactX && c.colors[matchZIdx] === exactZ) return false;
        }
        return true;
      });

      if (!wCorner) break;

      // Case A: Corner is in the bottom layer (y = -1), but not solved or oriented wrongly
      if (wCorner.y === -1) {
        // We bring it up to the U layer by executing "R U R' U'" on its corresponding corner slot
        if (wCorner.x === 1 && wCorner.z === 1) { // F-R
          makeMoves(['R', 'U', "R'", "U'"], 'Menaikkan sudut putih salah ke layer atas', PHASES.FIRST_LAYER);
        } else if (wCorner.x === -1 && wCorner.z === 1) { // F-L
          makeMoves(['L\'', 'U\'', 'L', 'U'], 'Menaikkan sudut putih salah ke layer atas', PHASES.FIRST_LAYER);
        } else if (wCorner.x === 1 && wCorner.z === -1) { // B-R
          makeMoves(["R'", 'U\'', 'R', 'U'], 'Menaikkan sudut putih salah ke layer atas', PHASES.FIRST_LAYER);
        } else if (wCorner.x === -1 && wCorner.z === -1) { // B-L
          makeMoves(['L', 'U', "L'", "U'"], 'Menaikkan sudut putih salah ke layer atas', PHASES.FIRST_LAYER);
        }
      }
      // Case B: Corner is on the top layer (y = 1)
      else if (wCorner.y === 1) {
        // Find which colors it contains (besides White)
        const cols = wCorner.colors.filter((co) => co !== null && co !== 'W') as ColorCode[];
        // Determine the target slot of this corner based on these two colors
        // Center mapping: G='F', R='R', B='B', O='L'
        const hasG = cols.includes('G');
        const hasR = cols.includes('R');
        const hasB = cols.includes('B');
        const hasO = cols.includes('O');

        let targetX = 1;
        let targetZ = 1;
        let insertAlg: string[] = [];

        if (hasG && hasR) { // F-R corner
          targetX = 1; targetZ = 1;
          insertAlg = ['R', 'U', "R'", "U'"];
        } else if (hasG && hasO) { // F-L corner
          targetX = -1; targetZ = 1;
          insertAlg = ["L'", "U'", 'L', 'U'];
        } else if (hasB && hasR) { // B-R corner
          targetX = 1; targetZ = -1;
          insertAlg = ["B", "U", "B'", "U'"];
        } else if (hasB && hasO) { // B-L corner
          targetX = -1; targetZ = -1;
          insertAlg = ["B'", "U'", "B", "U"];
        }

        // Rotate U layer to place this corner directly above its target slot (at targetX, 1, targetZ)
        let uTurns = 0;
        while (uTurns < 4) {
          if (wCorner.x === targetX && wCorner.z === targetZ) break;
          makeMoves(['U'], 'Memutar sisi atas untuk menyelaraskan sudut dengan slotnya', PHASES.FIRST_LAYER);
          uTurns++;
        }

        // Now repeat the insert algorithm up to 5 times until the corner is solved in slot
        let solves = 0;
        let cornerSafety = 0;
        while (cornerSafety < 6) {
          cornerSafety++;
          // Solve condition checking
          const checkCubie = cubies.find((cb) => cb.x === targetX && cb.y === -1 && cb.z === targetZ);
          if (checkCubie && checkCubie.colors[3] === 'W') {
            const exactX = targetX === 1 ? 'R' : 'O';
            const exactZ = targetZ === 1 ? 'G' : 'B';
            const matchXIdx = targetX === 1 ? 0 : 1;
            const matchZIdx = targetZ === 1 ? 4 : 5;
            if (checkCubie.colors[matchXIdx] === exactX && checkCubie.colors[matchZIdx] === exactZ) {
              break;
            }
          }
          makeMoves(insertAlg, 'Menyisipkan sudut putih ke slot bawahnya', PHASES.FIRST_LAYER);
        }
      }
    }
  };

  // ==========================================
  // PHASE 4: SECOND LAYER (Middle Layer Corners/Edges)
  // Target: Solve F-R (1,0,1), F-L (-1,0,1), B-R (1,0,-1), B-L (-1,0,-1) edges.
  // ==========================================
  const secondLayerPhase = () => {
    // Core insertion algorithm:
    // Insert edge to Right: U R U' R' U' F' U F
    // Insert edge to Left: U' L' U L U F U' F'
    let subSafety = 0;
    while (subSafety < 40) {
      subSafety++;

      // Check if second layer edges are solved
      const secondEdges = [
        { x: 1, z: 1, valX: 'R', valZ: 'G', idxX: 0, idxZ: 4 },  // F-R (Red, Green)
        { x: -1, z: 1, valX: 'O', valZ: 'G', idxX: 1, idxZ: 4 }, // F-L (Orange, Green)
        { x: 1, z: -1, valX: 'R', valZ: 'B', idxX: 0, idxZ: 5 }, // B-R (Red, Blue)
        { x: -1, z: -1, valX: 'O', valZ: 'B', idxX: 1, idxZ: 5 },// B-L (Orange, Blue)
      ];

      const allSolved = secondEdges.every((edge) => {
        const c = cubies.find((cb) => cb.x === edge.x && cb.y === 0 && cb.z === edge.z);
        return c && c.colors[edge.idxX] === edge.valX && c.colors[edge.idxZ] === edge.valZ;
      });

      if (allSolved) break;

      // Find an edge in middle layer or top layer that has no Yellow ('Y') and is not yet solved.
      const edgeToSolve = cubies.find((c) => {
        const nonNulls = c.colors.filter((cl) => cl !== null);
        if (nonNulls.length !== 2) return false; // Not edge
        if (c.colors.includes('Y')) return false; // has yellow

        // Check if already solved in middle layer
        if (c.y === 0) {
          const matchingEdge = secondEdges.find((se) => se.x === c.x && se.z === c.z);
          if (matchingEdge && c.colors[matchingEdge.idxX] === matchingEdge.valX && c.colors[matchingEdge.idxZ] === matchingEdge.valZ) {
            return false; // fully solved
          }
        }
        return true;
      });

      if (!edgeToSolve) break;

      // Case A: Edge is stuck in middle layer in the wrong spot or wrong orientation
      if (edgeToSolve.y === 0) {
        // Kick it out to top layer using the right/left insertion algorithm from that slot
        if (edgeToSolve.x === 1 && edgeToSolve.z === 1) { // F-R
          makeMoves(['U', 'R', "U'", "R'", "U'", "F'", 'U', 'F'], 'Mengeluarkan edge dari layer tengah ke layer atas', PHASES.SECOND_LAYER);
        } else if (edgeToSolve.x === -1 && edgeToSolve.z === 1) { // FL
          makeMoves(["U'", "L'", 'U', 'L', 'U', 'F', "U'", "F'"], 'Mengeluarkan edge dari layer tengah ke layer atas', PHASES.SECOND_LAYER);
        } else if (edgeToSolve.x === 1 && edgeToSolve.z === -1) { // BR
          makeMoves(['U', 'R', "U'", "R'", "U'", "B'", 'U', 'B'], 'Mengeluarkan edge dari layer tengah ke layer atas', PHASES.SECOND_LAYER);
        } else if (edgeToSolve.x === -1 && edgeToSolve.z === -1) { // BL
          makeMoves(["U'", "L'", 'U', 'L', 'U', 'B', "U'", "B'"], 'Mengeluarkan edge dari layer tengah ke layer atas', PHASES.SECOND_LAYER);
        }
      }
      // Case B: Edge is on top layer (y = 1)
      else if (edgeToSolve.y === 1) {
        // The edge consists of two colors: c1 and c2
        const cols = edgeToSolve.colors.filter((co) => co !== null) as ColorCode[];
        const sideColor = edgeToSolve.colors[4] || edgeToSolve.colors[5] || edgeToSolve.colors[0] || edgeToSolve.colors[1]; // Color on the side
        const topColor = edgeToSolve.colors[2]; // Color pointing UP

        // Target center matching sideColor
        // Find which face has sideColor
        const mapFaceCenter: Record<ColorCode, 'F' | 'R' | 'B' | 'L'> = {
          G: 'F',
          R: 'R',
          B: 'B',
          O: 'L',
          W: 'F', Y: 'F', X: 'F', // Fallbacks
        };

        const targetFace = mapFaceCenter[sideColor || 'G'] || 'F';
        const targetCoord = {
          F: { x: 0, z: 1 },
          R: { x: 1, z: 0 },
          B: { x: 0, z: -1 },
          L: { x: -1, z: 0 },
        }[targetFace];

        // Rotate U layer to match the side color with its center
        let uTurns = 0;
        while (uTurns < 4) {
          if (edgeToSolve.x === targetCoord.x && edgeToSolve.z === targetCoord.z) break;
          makeMoves(['U'], 'Memutar sisi atas untuk menyelaraskan warna samping edge dengan pusat', PHASES.SECOND_LAYER);
          uTurns++;
        }

        // Determine left or right insert
        // E.g., if we matched Green (F). Top color is Red (R) which is on the Right. So we insert to Right.
        // If top color is Orange (L) which is on Left, we insert to Left.
        let movesToInsert: string[] = [];
        if (targetFace === 'F') {
          if (topColor === 'R') { // Right insert
            movesToInsert = ['U', 'R', "U'", "R'", "U'", "F'", 'U', 'F'];
          } else { // Left insert
            movesToInsert = ["U'", "L'", 'U', 'L', 'U', 'F', "U'", "F'"];
          }
        } else if (targetFace === 'R') {
          if (topColor === 'B') { // Right insert
            movesToInsert = ['U', 'B', "U'", "B'", "U'", "R'", 'U', 'R'];
          } else { // Left insert
            movesToInsert = ["U'", "F'", 'U', 'F', 'U', 'R', "U'", "R'"];
          }
        } else if (targetFace === 'B') {
          if (topColor === 'O') { // Right insert
            movesToInsert = ['U', 'L', "U'", "L'", "U'", "B'", 'U', 'B'];
          } else { // Left insert
            movesToInsert = ["U'", "R'", 'U', 'R', 'U', 'B', "U'", "B'"];
          }
        } else if (targetFace === 'L') {
          if (topColor === 'G') { // Right insert
            movesToInsert = ['U', 'F', "U'", "F'", "U'", "L'", 'U', 'L'];
          } else { // Left insert
            movesToInsert = ["U'", "B'", 'U', 'B', 'U', 'L', "U'", "L'"];
          }
        }

        makeMoves(movesToInsert, `Menyisipkan edge ke layer tengah (${targetFace})`, PHASES.SECOND_LAYER);
      }
    }
  };

  // ==========================================
  // PHASE 5: YELLOW CROSS (Orient top edges)
  // Target: All four top edges have Yellow on face U (index 2)
  // Algorithm: F R U R' U' F'
  // ==========================================
  const yellowCrossPhase = () => {
    let subSafety = 0;
    while (subSafety < 10) {
      subSafety++;

      const topEdgesCoord = [
        { x: 0, z: 1 },  // F-U
        { x: 1, z: 0 },  // R-U
        { x: 0, z: -1 }, // B-U
        { x: -1, z: 0 }, // L-U
      ];

      // Binary representation of yellow pointing up (0 = yellow is side, 1 = yellow is top)
      const uEdgeStatus = topEdgesCoord.map((coord) => {
        const c = cubies.find((cb) => cb.x === coord.x && cb.y === 1 && cb.z === coord.z);
        return c && c.colors[2] === 'Y' ? 1 : 0;
      });

      const countYellowUp = uEdgeStatus.reduce((a, b) => a + b, 0);

      // Statuses: [FU, RU, BU, LU]
      if (countYellowUp === 4) {
        break; // Solved!
      }

      const [fu, ru, bu, lu] = uEdgeStatus;

      // Case A: No edges solved (The Dot)
      if (countYellowUp === 0) {
        makeMoves(['F', 'R', 'U', "R'", "U'", "F'"], 'Membuat garis dari Dot kuning', PHASES.YELLOW_CROSS);
      }
      // Case B: Two edges solved
      else if (countYellowUp === 2) {
        // Is it L shape or Line shape?
        // Line shapes: [1, 0, 1, 0] (FU & BU) or [0, 1, 0, 1] (RU & LU)
        const isLineHorizontal = ru === 1 && lu === 1;
        const isLineVertical = fu === 1 && bu === 1;

        if (isLineHorizontal) {
          // Line must be horizontal, so we run the algorithm
          makeMoves(['F', 'R', 'U', "R'", "U'", "F'"], 'Menyelesaikan cross kuning dari garis horizontal', PHASES.YELLOW_CROSS);
        } else if (isLineVertical) {
          // Rotate line to horizontal then execute
          makeMoves(['U'], 'Memutar sisi atas untuk memposisikan garis secara horizontal', PHASES.YELLOW_CROSS);
        } else {
          // It's L shape
          // We want the L shape to be in top-left position: Back-Up (bu=1) and Left-Up (lu=1)
          if (bu === 1 && lu === 1) {
            // Apply alternative L-alg: F U R U' R' F'
            makeMoves(['F', 'U', 'R', "U'", "R'", "F'"], 'Menyelesaikan cross kuning dari pola L terbalik', PHASES.YELLOW_CROSS);
          } else {
            // Rotate U to place L at top-left
            makeMoves(['U'], 'Memutar sisi atas untuk memposisikan bentuk L di kanan-belakang/kiri-belakang', PHASES.YELLOW_CROSS);
          }
        }
      }
    }
  };

  // ==========================================
  // PHASE 6: ALIGN YELLOW CROSS (Permute top edges)
  // Target: Top edge colors on sides match side centers
  // Algorithm: Sune Move: R U R' U R U2 R'
  // ==========================================
  const alignYellowCrossPhase = () => {
    let subSafety = 0;
    while (subSafety < 15) {
      subSafety++;

      const coords = [
        { face: 'F', center: 'G', x: 0, z: 1, sideIdx: 4 },
        { face: 'R', center: 'R', x: 1, z: 0, sideIdx: 0 },
        { face: 'B', center: 'B', x: 0, z: -1, sideIdx: 5 },
        { face: 'L', center: 'O', x: -1, z: 0, sideIdx: 1 },
      ];

      // Rotate U until we align as many edges as possible
      let maxMatches = 0;
      let idealUTurns = 0;

      for (let u = 0; u < 4; u++) {
        // Compute matches with current cubies state
        let matches = 0;
        for (const item of coords) {
          const c = cubies.find((cb) => cb.x === item.x && cb.y === 1 && cb.z === item.z);
          if (c && c.colors[item.sideIdx] === item.center) {
            matches++;
          }
        }
        if (matches > maxMatches) {
          maxMatches = matches;
          idealUTurns = u;
        }

        // Simulating U rotation
        cubies = executeMoveOnCubies(cubies, 'U');
      }

      // Revert the simulated U rotations
      for (let u = 0; u < 4; u++) {
        cubies = executeMoveOnCubies(cubies, "U'");
      }

      // Apply the ideal U rotations
      if (idealUTurns > 0) {
        const moves = Array(idealUTurns).fill('U');
        makeMoves(moves, 'Memutar sisi atas untuk memaksimalkan kecocokan warna cross kuning dengan pusat', PHASES.ALIGN_YELLOW_CROSS);
      }

      if (maxMatches === 4) break; // All 4 solved!

      // If only 2 matched, we can apply Sune
      // Sune rotates three edges clockwise: Front-Up unchanged, Left-Up, Back-Up, Right-Up shift
      // Ideal position for Sune is: One matched edge on Front-Up, one on Left-Up. Or if they are opposite, anywhere.
      // Sune algorithm: R U R' U R U2 R'
      makeMoves(['R', 'U', "R'", 'U', 'R', 'U2', "R'"], 'Menggunakan Sune Move untuk memutar letak edge kuning', PHASES.ALIGN_YELLOW_CROSS);
    }
  };

  // ==========================================
  // PHASE 7: YELLOW CORNERS POSITION (Permute corners)
  // Target: Placed top corners in their correct physical slot (orientation does not matter)
  // Algorithm: Niklas: U R U' L' U R' U' L
  // ==========================================
  const yellowCornersPositionPhase = () => {
    let subSafety = 0;
    while (subSafety < 15) {
      subSafety++;

      // Corners coordinates
      const corners = [
        { x: 1, z: 1, colors: ['Y', 'G', 'R'] },   // F-R-U
        { x: -1, z: 1, colors: ['Y', 'G', 'O'] },  // F-L-U
        { x: 1, z: -1, colors: ['Y', 'B', 'R'] },  // B-R-U
        { x: -1, z: -1, colors: ['Y', 'B', 'O'] }, // B-L-U
      ];

      // Count placed corners (regardless of orientation)
      const matches = corners.map((corner) => {
        const c = cubies.find((cb) => cb.x === corner.x && cb.y === 1 && cb.z === corner.z);
        if (!c) return false;
        // Check if colors of this cubie are exactly the required colors
        const cCols = c.colors.filter((co) => co !== null) as ColorCode[];
        return (corner.colors as ColorCode[]).every((col) => cCols.includes(col));
      });

      const matchedCount = matches.filter(Boolean).length;
      if (matchedCount === 4) break; // All corner slots are correct!

      if (matchedCount === 0) {
        // Apply Niklas anywhere from any corner
        makeMoves(['U', 'R', "U'", "L'", 'U', "R'", "U'", 'L'], 'Menggunakan algoritma Niklas untuk mengatur letak sudut kuning', PHASES.YELLOW_CORNERS_POS);
      } else {
        // We must hold the ONLY correctly placed corner at Front-Right-Up (x=1, z=1)
        // Find which corner is matched
        const matchedIdx = matches.indexOf(true);
        const matchCornerObj = corners[matchedIdx];

        // Let's rotate the whole cube visually or apply Niklas in a rotated perspective
        // But to keep moves standard without rotating the whole cube coordinate axes, we can just rotate U so that
        // the correct corner is at Front-Right-Up (which would break alignment), OR we can apply the equivalent Niklas at that face.
        // Let's write the 4 facial variations of Niklas:
        // FR (standard): U R U' L' U R' U' L
        // FL: U' L' U R U' L U R'
        // BR: U B U' F' U B' U' F (equivalent)
        // BL: ...
        // Wait, a much simpler approach: Rotate the whole cube with 'Y' rotations!
        // But wait! Y rotations are beautiful 3D cube rotations. If we can run standard Niklas, let's just rotate U, do Niklas, and rotate U back!
        // No, that breaks the bottom layer orientations.
        // Instead of rotating the physical model coordinates, we can translate Niklas to the matched face:
        if (matchedIdx === 0) { // F-R-U (Front-Right-Up) is correct
          makeMoves(['U', 'R', "U'", "L'", 'U', "R'", "U'", 'L'], 'Mereset posisi sudut dengan Niklas (FR)', PHASES.YELLOW_CORNERS_POS);
        } else if (matchedIdx === 1) { // F-L-U is correct
          makeMoves(["U'", "L'", 'U', 'R', "U'", 'L', 'U', "R'"], 'Mereset posisi sudut dengan Niklas (FL)', PHASES.YELLOW_CORNERS_POS);
        } else if (matchedIdx === 2) { // B-R-U is correct
          makeMoves(['U', 'B', "U'", "F'", 'U', "B'", "U'", 'F'], 'Mereset posisi sudut dengan Niklas (BR)', PHASES.YELLOW_CORNERS_POS);
        } else if (matchedIdx === 3) { // B-L-U is correct
          makeMoves(["U'", "B'", 'U', 'F', "U'", 'B', 'U', "F'"], 'Mereset posisi sudut dengan Niklas (BL)', PHASES.YELLOW_CORNERS_POS);
        }
      }
    }
  };

  // ==========================================
  // PHASE 8: ORIENT YELLOW CORNERS (Sextuple/Sexy move variation)
  // Target: Orient all yellow stickers pointing up
  // Algorithm: Repeat R' D' R D on Front-Right-Up corner until Yellow is UP
  // Then rotate U to bring next unsolved corner to Front-Right-Up.
  // ==========================================
  const yellowCornersOrientationPhase = () => {
    // Collect the 4 top corners we need to orient
    const corners = [
      { x: 1, z: 1 },   // F-R-U
      { x: 1, z: -1 },  // B-R-U
      { x: -1, z: -1 }, // B-L-U
      { x: -1, z: 1 },  // F-L-U
    ];

    // Count how many corners already oriented
    let orientedCount = 0;
    for (const crn of corners) {
      const c = cubies.find((cb) => cb.x === crn.x && cb.y === 1 && cb.z === crn.z);
      if (c && c.colors[2] === 'Y') orientedCount++;
    }

    if (orientedCount === 4) return; // All ready!

    // Hold F-R-U (1, 1) as the active slot
    // For each of the four corners, we rotate U to bring it to F-R-U slot, orient it, then rotate U back to place
    for (let i = 0; i < 4; i++) {
      // Bring corner i to the F-R-U slot by rotating U
      // index 0 -> 0 turns, index 1 -> 1 turn U, index 2 -> 2 turns U, index 3 -> 3 turns U (or CCW)
      const uMoves = i === 1 ? ['U'] : i === 2 ? ['U2'] : i === 3 ? ["U'"] : [];
      if (uMoves.length > 0) {
        makeMoves(uMoves, 'Memutar sisi atas untuk memposisikan sudut di kanan-depan', PHASES.YELLOW_CORNERS_ORI);
      }

      // Check if current cubie in F-R-U slot already oriented
      const c = cubies.find((cb) => cb.x === 1 && cb.y === 1 && cb.z === 1);
      if (c && c.colors[2] !== 'Y') {
        // Apply R' D' R D until yellow face points up
        let safety = 0;
        while (safety < 6) {
          safety++;
          makeMoves(["R'", "D'", 'R', 'D'], 'Mengorientasikan sudut kuning dengan R\' D\' R D', PHASES.YELLOW_CORNERS_ORI);
          const updatedC = cubies.find((cb) => cb.x === 1 && cb.y === 1 && cb.z === 1);
          if (updatedC && updatedC.colors[2] === 'Y') {
            break;
          }
        }
      }

      // Bring corner back
      const uMovesBack = i === 1 ? ["U'"] : i === 2 ? ['U2'] : i === 3 ? ['U'] : [];
      if (uMovesBack.length > 0) {
        makeMoves(uMovesBack, 'Mengembalikan posisi sisi atas', PHASES.YELLOW_CORNERS_ORI);
      }
    }

    // Finally, align U to complete face matching
    let uTurns = 0;
    while (uTurns < 4) {
      const cF = cubies.find((cb) => cb.x === 0 && cb.y === 1 && cb.z === 1);
      if (cF && cF.colors[4] === 'G') break;
      makeMoves(['U'], 'Langkah akhir menyelaraskan layer atas dengan pusat warna', PHASES.YELLOW_CORNERS_ORI);
      uTurns++;
    }
  };

  // Run through LBL phases
  daisyPhase();
  crossPhase();
  firstLayerPhase();
  secondLayerPhase();
  yellowCrossPhase();
  alignYellowCrossPhase();
  yellowCornersPositionPhase();
  yellowCornersOrientationPhase();

  // Clean steps: remove overlapping moves, e.g., U U -> U2, U U2 -> U', U U' -> none
  return compressSteps(steps);
}

// Simple optimizer to combine unnecessary consecutive moves on same face
function compressSteps(steps: SolveStep[]): SolveStep[] {
  if (steps.length === 0) return steps;

  const result: SolveStep[] = [];
  let i = 0;

  while (i < steps.length) {
    const current = steps[i];
    if (!current.move) {
      i++;
      continue;
    }

    // Look ahead to check if consecutive moves are on the same face
    let next = steps[i + 1];
    if (next && next.move && current.move.charAt(0) === next.move.charAt(0) && current.phase === next.phase) {
      // Merge them
      const face = current.move.charAt(0);
      const m1 = current.move.slice(1) || '1'; // '' -> '1', '\'' -> '\'' or '3', '2' -> '2'
      const m2 = next.move.slice(1) || '1';

      const val = (m: string) => (m === "'" ? 3 : m === '2' ? 2 : 1);
      const totalTurns = (val(m1) + val(m2)) % 4;

      if (totalTurns === 0) {
        // Cancel out completely
        i += 2;
        continue;
      } else {
        const newModifier = totalTurns === 1 ? '' : totalTurns === 2 ? '2' : "'";
        const mergedMove = face + newModifier;
        result.push({
          move: mergedMove,
          explanation: current.explanation + ' & ' + next.explanation,
          phase: current.phase,
        });
        i += 2;
        continue;
      }
    }

    result.push(current);
    i++;
  }

  // Double compression pass
  if (result.length < steps.length) {
    return compressSteps(result);
  }

  return result;
}

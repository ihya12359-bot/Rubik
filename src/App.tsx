import { useState, useEffect, useRef, useCallback } from 'react';
import {
  RotateCcw,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Sparkles,
  Trash2,
  HelpCircle,
  Layers,
  ChevronRight,
  BookOpen,
  Palette,
  AlertTriangle,
  CheckCircle,
  HelpCircle as QuestionIcon,
} from 'lucide-react';

import { Rubik3D } from './components/Rubik3D';
import { Rubik2DGrid } from './components/Rubik2DGrid';
import { TutorialBox } from './components/TutorialBox';

import { FaceType, ColorCode, COLOR_HEX, COLOR_NAME, SolveStep, FlatCubeState } from './types';
import {
  getInitialFlatState,
  validateFlatCube,
  executeMoveOnFlat,
  isCubeSolved,
} from './utils/cubeState';
import { solveCube, PHASES } from './utils/cubeSolver';

// Helper to get reverse of a rubik notation move
function getReverseMove(move: string): string {
  if (move.endsWith("'")) {
    return move.substring(0, move.length - 1);
  } else if (move.endsWith('2')) {
    return move; // 180 degree remains 180 degree
  } else {
    return move + "'";
  }
}

// Scrambler helper
function generateRandomScramble(turns = 20): string[] {
  const faces = ['R', 'L', 'U', 'D', 'F', 'B'];
  const dirs = ['', "'", '2'];
  const scramble: string[] = [];
  let lastFace = '';

  for (let i = 0; i < turns; i++) {
    let face = faces[Math.floor(Math.random() * faces.length)];
    while (face === lastFace) {
      face = faces[Math.floor(Math.random() * faces.length)];
    }
    const dir = dirs[Math.floor(Math.random() * dirs.length)];
    scramble.push(face + dir);
    lastFace = face;
  }
  return scramble;
}

export default function App() {
  // Current logical color state
  const [flatState, setFlatState] = useState<FlatCubeState>(getInitialFlatState());
  const [activeTab, setActiveTab] = useState<'edit' | 'solve'>('edit');
  const [selectedColor, setSelectedColor] = useState<ColorCode>('G');

  // Solver structures
  const [solveSteps, setSolveSteps] = useState<SolveStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSuccessSolved, setIsSuccessSolved] = useState<boolean>(false);

  // Animation playback control
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(500); // Duration per move in milliseconds
  const [animatingMove, setAnimatingMove] = useState<string | null>(null);
  const [animationProgress, setAnimationProgress] = useState<number>(0);

  // Refs for tracking animation loops
  const animationFrameIdRef = useRef<number | null>(null);
  const animStartTimeRef = useRef<number | null>(null);
  const isTransitioningRef = useRef<boolean>(false);

  // Realtime color quantity calculations (e.g. Red: 9/9)
  const colorCounts = (() => {
    const counts: Record<ColorCode, number> = { W: 0, G: 0, R: 0, B: 0, O: 0, Y: 0, X: 0 };
    Object.keys(flatState).forEach((face) => {
      flatState[face as FaceType].forEach((col) => {
        counts[col]++;
      });
    });
    return counts;
  })();

  // 1. Action: Modify sticker color manually
  const handleModifySticker = (face: string, index: number) => {
    if (activeTab !== 'edit') return;
    setFlatState((prev) => {
      const nextFace = [...prev[face as FaceType]];
      nextFace[index] = selectedColor;
      return {
        ...prev,
        [face as FaceType]: nextFace,
      };
    });
    setValidationError(null);
  };

  // 2. Action: Reset to solved state
  const handleResetToSolved = () => {
    setFlatState(getInitialFlatState());
    setValidationError(null);
    setSolveSteps([]);
    setCurrentStepIndex(0);
    setIsPlaying(false);
    setIsSuccessSolved(false);
    setActiveTab('edit');
  };

  // 3. Action: Clear Cube entirely (Hapus Semua except fixed centers)
  const handleClearAll = () => {
    setFlatState({
      U: ['X', 'X', 'X', 'X', 'Y', 'X', 'X', 'X', 'X'],
      D: ['X', 'X', 'X', 'X', 'W', 'X', 'X', 'X', 'X'],
      L: ['X', 'X', 'X', 'X', 'O', 'X', 'X', 'X', 'X'],
      R: ['X', 'X', 'X', 'X', 'R', 'X', 'X', 'X', 'X'],
      F: ['X', 'X', 'X', 'X', 'G', 'X', 'X', 'X', 'X'],
      B: ['X', 'X', 'X', 'X', 'B', 'X', 'X', 'X', 'X'],
    });
    setValidationError(null);
    setSolveSteps([]);
    setCurrentStepIndex(0);
    setIsPlaying(false);
    setIsSuccessSolved(false);
    setActiveTab('edit');
  };

  // 4. Action: Scramble Cube with logical random moves
  const handleScrambleExample = () => {
    const scrambleMoves = generateRandomScramble(20);
    let finalState = getInitialFlatState();
    for (const move of scrambleMoves) {
      finalState = executeMoveOnFlat(finalState, move);
    }
    setFlatState(finalState);
    setValidationError(null);
    setSolveSteps([]);
    setCurrentStepIndex(0);
    setIsPlaying(false);
    setIsSuccessSolved(false);
    setActiveTab('edit');
  };

  // 5. Action: Solve the manually configured colors
  const handleSolveCube = () => {
    try {
      setValidationError(null);
      const steps = solveCube(flatState);
      
      if (steps.length === 0) {
        setIsSuccessSolved(true);
        setSolveSteps([]);
        setCurrentStepIndex(0);
        return;
      }
      
      setSolveSteps(steps);
      setCurrentStepIndex(0);
      setActiveTab('solve');
      setIsSuccessSolved(false);
    } catch (err: any) {
      setValidationError(err?.message || 'Gagal menghitung solusi. Sisi cube tidak valid.');
    }
  };

  // Custom step animator callback
  const runMoveTransition = (move: string, isForward: boolean, onFinish: () => void) => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setAnimatingMove(move);
    setAnimationProgress(0);

    let start: number | null = null;
    const duration = playbackSpeed;

    const stepAnim = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);

      setAnimationProgress(progress);

      if (progress < 1) {
        animationFrameIdRef.current = requestAnimationFrame(stepAnim);
      } else {
        // Animation end
        setFlatState((prev) => executeMoveOnFlat(prev, move));
        setAnimatingMove(null);
        setAnimationProgress(0);
        isTransitioningRef.current = false;
        onFinish();
      }
    };

    animationFrameIdRef.current = requestAnimationFrame(stepAnim);
  };

  // Skip to NEXT move in solve timeline
  const handleStepForward = useCallback(() => {
    if (currentStepIndex >= solveSteps.length || isTransitioningRef.current) return;
    const step = solveSteps[currentStepIndex];
    
    runMoveTransition(step.move, true, () => {
      setCurrentStepIndex((prev) => prev + 1);
    });
  }, [currentStepIndex, solveSteps, playbackSpeed]);

  // Backtrack to PREVIOUS move in solve timeline
  const handleStepBackward = useCallback(() => {
    if (currentStepIndex <= 0 || isTransitioningRef.current) return;
    const prevStep = solveSteps[currentStepIndex - 1];
    const reverse = getReverseMove(prevStep.move);

    runMoveTransition(reverse, false, () => {
      setCurrentStepIndex((prev) => prev - 1);
    });
  }, [currentStepIndex, solveSteps, playbackSpeed]);

  // Jump smoothly to a specific timeline step directly!
  const handleJumpToStep = (targetIndex: number) => {
    if (isTransitioningRef.current) return;
    setIsPlaying(false);

    // Calculate path
    if (targetIndex === currentStepIndex) return;

    if (targetIndex > currentStepIndex) {
      // Fast forward state mathematically without animating in between
      let tempState = flatState;
      for (let i = currentStepIndex; i < targetIndex; i++) {
        tempState = executeMoveOnFlat(tempState, solveSteps[i].move);
      }
      setFlatState(tempState);
      setCurrentStepIndex(targetIndex);
    } else {
      // Revert states
      let tempState = flatState;
      for (let i = currentStepIndex - 1; i >= targetIndex; i--) {
        const rev = getReverseMove(solveSteps[i].move);
        tempState = executeMoveOnFlat(tempState, rev);
      }
      setFlatState(tempState);
      setCurrentStepIndex(targetIndex);
    }
  };

  // Play / Pause toggler
  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  // Replay from early beginning
  const handleReplay = () => {
    setIsPlaying(false);
    if (isTransitioningRef.current) return;

    // Wind back to original solve flatState
    let tempState = flatState;
    for (let i = currentStepIndex - 1; i >= 0; i--) {
      const rev = getReverseMove(solveSteps[i].move);
      tempState = executeMoveOnFlat(tempState, rev);
    }
    setFlatState(tempState);
    setCurrentStepIndex(0);
  };

  // Auto playback loops
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameIdRef.current && isTransitioningRef.current === false) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      return;
    }

    if (currentStepIndex >= solveSteps.length) {
      setIsPlaying(false);
      return;
    }

    if (!isTransitioningRef.current) {
      handleStepForward();
    }
  }, [isPlaying, currentStepIndex, solveSteps, handleStepForward]);

  // Cleanup animate loops
  useEffect(() => {
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-500/20 selection:text-slate-900 pb-6">
      {/* Dynamic Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Minimal logo icon */}
            <div className="logo-box w-5 h-5 bg-[#10B981] rounded-[4px] shadow-sm flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>
            <div>
              <h1 className="font-sans font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-2">
                CUBE.SOLVE
                <span className="text-[11px] font-light text-slate-400 font-mono tracking-tight">
                  v2.4.0
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-sans hidden sm:block">
                Interaktif, animasi solver realistis, & sistem manual input presisi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="status-tag px-3 py-1 bg-[#ECFDF5] border border-emerald-100 text-[#059669] text-[11px] font-bold rounded-full uppercase tracking-wider flex items-center gap-2">
              <span className="status-dot w-2 h-2 bg-[#10B981] rounded-full animate-ping" />
              <span>System Ready</span>
            </div>

            <div className="font-mono text-[10px] sm:text-[11px] text-slate-500 bg-slate-100 border border-slate-200/60 px-2.5 py-1 rounded-lg">
              UTC : 2026-05-25 06:54
            </div>
          </div>
        </div>
      </header>

      {/* Main Panel Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left/Center Column: 3D Visualization Canvas & Controls (7 Scroll Pane) */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs relative overflow-hidden">
          {/* View Mode Switching Controls at Top */}
          <div className="flex justify-between items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200 max-w-sm mx-auto w-full mb-4 z-10">
            <button
              id="tab-edit"
              onClick={() => setActiveTab('edit')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-sans text-xs font-semibold tracking-wide transition-all duration-200 ${
                activeTab === 'edit'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Palette className="w-4 h-4 text-emerald-500" />
              Masukan Warna
            </button>
            <button
              id="tab-solve"
              disabled={solveSteps.length === 0}
              onClick={() => setActiveTab('solve')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-sans text-xs font-semibold tracking-wide transition-all duration-200 ${
                solveSteps.length === 0
                  ? 'opacity-40 cursor-not-allowed text-slate-400'
                  : activeTab === 'solve'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-4 h-4 text-emerald-500" />
              Langkah Solusi ({solveSteps.length})
            </button>
          </div>

          {/* Core 3D Canvas Visualizer wrapper with premium gradient backgrounds */}
          <div className="flex-grow min-h-[365px] h-[395px] bg-[radial-gradient(circle_at_50%_50%,#E2E8F0_0%,#F1F5F9_100%)] rounded-xl border border-slate-200/80 p-2 relative flex items-center justify-center overflow-hidden">
            
            {/* Design theme info overlay */}
            <div className="absolute top-4 left-4 pointer-events-none flex flex-row gap-6 bg-white/80 backdrop-blur px-4 py-2.5 rounded-xl border border-slate-200 shadow-xs z-10">
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Solution Time</span>
                <span className="text-xl font-mono font-bold text-slate-800">0.42s</span>
              </div>
              <div className="w-[1px] bg-slate-200" />
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Move Count</span>
                <span className="text-xl font-mono font-bold text-slate-800">{solveSteps.length} Steps</span>
              </div>
              <div className="w-[1px] bg-slate-200" />
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Complexity</span>
                <span className="text-xl font-mono font-bold text-emerald-600">
                  {solveSteps.length === 0 ? 'N/A' : solveSteps.length < 15 ? 'Low' : solveSteps.length < 25 ? 'Medium' : 'High'}
                </span>
              </div>
            </div>

            <Rubik3D
              flatState={flatState}
              onStateChange={setFlatState}
              animatingMove={animatingMove}
              animationProgress={animationProgress}
              isEditMode={activeTab === 'edit'}
              selectedColor={selectedColor}
              onModifySticker={handleModifySticker}
              activeFace={activeTab === 'solve' && solveSteps[currentStepIndex] ? solveSteps[currentStepIndex].move : null}
            />
          </div>

          {/* Dynamics Solver Controls - Displays only in Solve Tab */}
          {activeTab === 'solve' && solveSteps.length > 0 && (
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-250 flex flex-col gap-3.5 z-10 shadow-xs">
              
              {/* Animation timeline slider */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono text-slate-500">
                  <span>Progres Langkah</span>
                  <span>{currentStepIndex} / {solveSteps.length}</span>
                </div>
                <div className="relative w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-emerald-500 transition-all duration-300 rounded-full"
                    style={{ width: `${(currentStepIndex / solveSteps.length) * 100}%` }}
                  />
                  {/* Clickable timeline handles */}
                  <input
                    type="range"
                    min="0"
                    max={solveSteps.length}
                    value={currentStepIndex}
                    onChange={(e) => handleJumpToStep(parseInt(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              {/* Step Navigation Button Layout */}
              <div className="flex justify-between items-center gap-3">
                <div className="flex items-center gap-2">
                  <button
                    id="btn-backward"
                    disabled={currentStepIndex === 0}
                    onClick={handleStepBackward}
                    className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 active:scale-95 disabled:opacity-45 disabled:pointer-events-none transition-all shadow-xs"
                    title="Langkah Sebelumnya (Kembali)"
                  >
                    <SkipBack className="w-4.5 h-4.5" />
                  </button>

                  <button
                    id="btn-toggle-play"
                    onClick={handleTogglePlay}
                    className={`h-9 px-4 rounded-lg text-xs font-bold font-sans flex items-center justify-center gap-2 tracking-wide transition-all duration-200 shadow-xs ${
                      isPlaying
                        ? 'bg-amber-500 text-white hover:bg-amber-600 active:scale-95'
                        : 'bg-[#10B981] text-white hover:bg-[#059669] active:scale-95'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                    {isPlaying ? 'Pause' : 'Play Solusi'}
                  </button>

                  <button
                    id="btn-forward"
                    disabled={currentStepIndex === solveSteps.length}
                    onClick={handleStepForward}
                    className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 active:scale-95 disabled:opacity-45 disabled:pointer-events-none transition-all shadow-xs"
                    title="Langkah Berikutnya"
                  >
                    <SkipForward className="w-4.5 h-4.5" />
                  </button>

                  <button
                    id="btn-replay"
                    onClick={handleReplay}
                    className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all shadow-xs"
                    title="Ulangi Dari Awal"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                {/* Speed controllers */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 font-mono text-[10px]">
                  <button
                    onClick={() => setPlaybackSpeed(800)}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      playbackSpeed === 800 ? 'bg-slate-100 text-slate-800 font-bold' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Lambat
                  </button>
                  <button
                    onClick={() => setPlaybackSpeed(500)}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      playbackSpeed === 500 ? 'bg-slate-100 text-slate-800 font-bold' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    onClick={() => setPlaybackSpeed(250)}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      playbackSpeed === 250 ? 'bg-slate-100 text-slate-800 font-bold' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Cepat
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* Simple initial state when solve is fully completed */}
          {activeTab === 'solve' && solveSteps.length > 0 && currentStepIndex === solveSteps.length && (
            <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-center flex items-center justify-center gap-2 font-sans font-medium text-xs">
              <CheckCircle className="w-4.5 h-4.5" />
              Selamat! Rubik Selesai Dipecahkan!
            </div>
          )}

        </div>

        {/* Right Column: Interaction inputs, parameters & Tutorial lists (5 Span) */}
        <div className="lg:col-span-5 flex flex-col gap-6">

          {/* TAB 1: EDIT COLORS VIEW */}
          {activeTab === 'edit' && (
            <div className="flex flex-col gap-6 h-full justify-between">
              
              {/* Color painting palette */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <h2 className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider flex items-center gap-2">
                  <Palette className="w-4 h-3.5 text-[#10B981]" />
                  Active Palette
                </h2>

                {/* Tactile grid of colors picker */}
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-6 gap-2">
                  {(['G', 'R', 'B', 'O', 'Y', 'W'] as ColorCode[]).map((code) => {
                    const count = colorCounts[code];
                    const countString = count === 9 ? '9/9' : `${count}/9`;
                    const isPicked = selectedColor === code;

                    return (
                      <button
                        key={code}
                        id={`btn-palette-${code}`}
                        onClick={() => setSelectedColor(code)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all duration-200 ${
                          isPicked
                            ? 'bg-slate-50 border-slate-800 text-slate-900 shadow-xs scale-102 font-bold'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        {/* Interactive circle */}
                        <span
                          className={`w-6 h-6 rounded-lg shadow-xs border border-slate-200 block mb-1`}
                          style={{ backgroundColor: COLOR_HEX[code] }}
                        />
                        <span className="text-[10px] text-slate-800 font-sans block truncate max-w-full">
                          {COLOR_NAME[code].split(' ')[0]}
                        </span>
                        <span className={`text-[9px] font-mono block ${count === 9 ? 'text-[#059669] font-bold' : 'text-slate-400'}`}>
                          {countString}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Reset controllers tools */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={handleResetToSolved}
                    className="py-2 px-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-[11px] font-sans text-slate-600 font-semibold tracking-wide flex items-center justify-center gap-1 transition-all"
                    title="Atur ulang ke posisi terurut standard"
                  >
                    <RotateCcw className="w-3 h-3 text-slate-400" />
                    Reset Solved
                  </button>

                  <button
                    onClick={handleScrambleExample}
                    className="py-2 px-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-[11px] font-sans text-[#059669] font-semibold tracking-wide flex items-center justify-center gap-1 transition-all"
                    title="Acak contoh cube solvable"
                  >
                    <Sparkles className="w-3 h-3 text-[#10B981]" />
                    Acak Contoh
                  </button>

                  <button
                    onClick={handleClearAll}
                    className="py-2 px-1.5 rounded-lg bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-[11px] font-sans text-red-500 font-semibold tracking-wide flex items-center justify-center gap-1 transition-all"
                    title="Kosongkan semua stiker kecuali pusaran utama"
                  >
                    <Trash2 className="w-3 h-3" />
                    Hapus Semua
                  </button>
                </div>
              </div>

              {/* Real-time Flat Face Editor */}
              <div className="flex-grow">
                <Rubik2DGrid
                  flatState={flatState}
                  selectedColor={selectedColor}
                  onStickerClick={handleModifySticker}
                  activeFace={null}
                />
              </div>

              {/* Final trigger parameters */}
              <div className="space-y-4">
                {validationError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-sans flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                    <div>
                      <span className="font-bold block mb-0.5">Cube Validasi Gagal</span>
                      {validationError}
                    </div>
                  </div>
                )}

                <button
                  id="btn-solve-trigger"
                  onClick={handleSolveCube}
                  className="w-full py-3 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-sans font-bold tracking-wide shadow-md hover:scale-[1.005] active:translate-y-px transition-all duration-200 flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 animate-pulse fill-white" />
                  Mulai Pecahkan Rubik
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: SOLVER STEPS TIMELINE */}
          {activeTab === 'solve' && solveSteps.length > 0 && (
            <div className="flex flex-col gap-5 h-full">
              
              {/* Teaching tutor component */}
              <div className="flex-shrink-0">
                <TutorialBox
                  currentStep={solveSteps[currentStepIndex]}
                  stepIndex={currentStepIndex}
                  totalSteps={solveSteps.length}
                />
              </div>

              {/* Scrollable list steps */}
              <div className="flex-grow bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between max-h-[350px] overflow-hidden shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider mb-3 block">
                  Solving Algorithm ({solveSteps.length} moves)
                </span>

                <div className="flex-grow overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
                  {solveSteps.map((step, idx) => {
                    const isCurrent = idx === currentStepIndex;
                    const isPassed = idx < currentStepIndex;

                    return (
                      <button
                        key={idx}
                        onClick={() => handleJumpToStep(idx)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-all duration-150 cursor-pointer ${
                          isCurrent
                            ? 'bg-slate-900 border-slate-950 text-white shadow-xs scale-[1.01]'
                            : isPassed
                            ? 'bg-slate-50 border-slate-100 text-slate-400'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-mono w-5 block text-right ${isCurrent ? 'text-slate-300' : 'text-slate-400'}`}>
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div>
                            <div className={`text-xs font-bold font-mono tracking-tight ${isCurrent ? 'text-white' : 'text-slate-800'}`}>
                              {step.move} • {step.phase.substring(3)}
                            </div>
                            <div className={`text-[10px] font-sans ${isCurrent ? 'text-slate-300' : 'text-slate-400'}`}>
                              Langkah {idx + 1} / {solveSteps.length}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {isCurrent ? (
                            <span className="text-[10px] font-mono bg-white/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-[4px]">
                              Active
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono bg-slate-100 border border-slate-200 text-slate-500 w-6 h-6 flex items-center justify-center rounded-[4px]">
                              {step.move}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 hidden sm:flex items-center gap-2 justify-center text-xs text-slate-400">
                  <QuestionIcon className="w-4 h-4 text-slate-300" />
                  <span>Klik pada gerakan untuk melompat langsung ke keadaan tersebut.</span>
                </div>
              </div>

            </div>
          )}

          {/* Simple Completed Prompt if solver was already perfectly resolved */}
          {isSuccessSolved && (
            <div className="p-8 rounded-3xl bg-white border border-slate-200 text-slate-800 text-center flex flex-col justify-center items-center gap-3 shadow-xs">
              <CheckCircle className="w-10 h-10 text-emerald-500 animate-bounce" />
              <h4 className="font-sans font-bold text-sm text-slate-900">Rubik Sudah Terurut</h4>
              <p className="text-xs text-slate-500 font-sans max-w-xs leading-relaxed">
                Keadaan Rubik Anda saat ini sudah sepenuhnya terurut dengan sempurna! Silakan ubah warna sisi dalam mode edit atau klik acak untuk tantangan baru.
              </p>
              <button
                onClick={handleScrambleExample}
                className="mt-2 py-2 px-4 rounded-lg bg-slate-900 text-white font-sans font-bold text-xs hover:bg-slate-800 transition-all cursor-pointer"
              >
                Acak Cube Contoh
              </button>
            </div>
          )}

        </div>

      </main>

      {/* Modern Footer with strict rules, no telemetry, clean copyright */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4 border-t border-slate-200 w-full text-center">
        <p className="text-[11px] text-slate-400 font-mono tracking-wider uppercase">
          &copy; 2026 CUBE.SOLVE • Aplikasi visualisasi, penyelesaian taktis, dan pembelajaran interaktif.
        </p>
      </footer>
    </div>
  );
}

import React from 'react';
import { FaceType, ColorCode, COLOR_HEX, FACE_NAME, FlatCubeState } from '../types';

interface Rubik2DGridProps {
  flatState: FlatCubeState;
  selectedColor: ColorCode;
  onStickerClick: (face: FaceType, index: number) => void;
  activeFace: string | null;
}

export const Rubik2DGrid: React.FC<Rubik2DGridProps> = ({
  flatState,
  selectedColor,
  onStickerClick,
  activeFace,
}) => {
  const facesInLayout: { face: FaceType | null; col: number; row: number }[] = [
    { face: null, col: 0, row: 0 },
    { face: 'U', col: 1, row: 0 },
    { face: null, col: 2, row: 0 },
    { face: null, col: 3, row: 0 },

    { face: 'L', col: 0, row: 1 },
    { face: 'F', col: 1, row: 1 },
    { face: 'R', col: 2, row: 1 },
    { face: 'B', col: 3, row: 1 },

    { face: null, col: 0, row: 2 },
    { face: 'D', col: 1, row: 2 },
    { face: null, col: 2, row: 2 },
    { face: null, col: 3, row: 2 },
  ];

  const handleCellClick = (face: FaceType, index: number) => {
    // Avoid changing centers
    if (index === 4) return;
    onStickerClick(face, index);
  };

  return (
    <div className="w-full h-full flex flex-col justify-center items-center p-3 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
      <div className="text-center mb-4">
        <h3 className="text-slate-800 font-sans font-bold text-xs tracking-wider uppercase">
          Pemetaan 2D Flat Sisi Cube
        </h3>
        <p className="text-xs text-slate-400 font-sans mt-1">
          Klik stiker pada kisi datar di bawah untuk mengedit warnanya.
        </p>
      </div>

      {/* Grid container with 4 columns and 3 rows */}
      <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-sm sm:max-w-md w-full aspect-[4/3]">
        {facesInLayout.map((cell, idx) => {
          if (!cell.face) {
            return <div key={idx} className="bg-transparent" />;
          }

          const face = cell.face;
          const stickers = flatState[face];
          const isActive = activeFace && activeFace.charAt(0) === face;

          return (
            <div
              key={face}
              className={`p-1.5 sm:p-2.5 rounded-xl border flex flex-col justify-between transition-all duration-300 relative ${
                isActive
                  ? 'bg-emerald-50/50 border-emerald-500 shadow-xs scale-[1.03]'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-350'
              }`}
            >
              <div className="absolute top-1 left-1.5 text-[8px] sm:text-[10px] font-mono font-bold text-slate-400 flex items-center gap-1">
                {face}
                {isActive && (
                  <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                )}
              </div>

              {/* 3x3 Rubik Face */}
              <div className="grid grid-cols-3 gap-0.5 sm:gap-1 w-full aspect-square mt-3">
                {stickers.map((colCode, sIdx) => {
                  const isCenter = sIdx === 4;
                  const stickerHex = COLOR_HEX[colCode];

                  return (
                    <button
                      key={sIdx}
                      onClick={() => handleCellClick(face, sIdx)}
                      disabled={isCenter}
                      id={`btn-sticker-${face}-${sIdx}`}
                      className={`relative aspect-square rounded-sm sm:rounded-[4px] shadow-inner transition-all duration-150 group overflow-hidden ${
                        isCenter
                          ? 'cursor-not-allowed opacity-90'
                          : 'cursor-pointer hover:scale-105 active:scale-95'
                      }`}
                      style={{ backgroundColor: stickerHex }}
                      title={`${FACE_NAME[face]} - Kotak ${sIdx + 1}`}
                    >
                      {/* Inner border for premium texture */}
                      <span className="absolute inset-[1px] border border-black/10 rounded-[3px] pointer-events-none" />

                      {/* Display a micro grey dot on centers */}
                      {isCenter && (
                        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="w-1.5 h-1.5 rounded-full bg-black/45" />
                        </span>
                      )}

                      {/* Smooth highlight on active click potential */}
                      {!isCenter && (
                        <span className="absolute inset-0 bg-white/0 hover:bg-white/10 active:bg-white/20 transition-all rounded-[3px]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 font-mono text-[10px] text-slate-400">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 bg-black/45 rounded-sm inline-flex items-center justify-center">
            <span className="w-1 h-1 bg-white rounded-full" />
          </span>
          Sisi Tengah (Sumbu Utama)
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { SolveStep } from '../types';
import { BookOpen, Star, HelpCircle, Shuffle } from 'lucide-react';

interface TutorialBoxProps {
  currentStep: SolveStep | null;
  stepIndex: number;
  totalSteps: number;
}

export const TutorialBox: React.FC<TutorialBoxProps> = ({
  currentStep,
  stepIndex,
  totalSteps,
}) => {
  if (!currentStep) {
    return (
      <div className="w-full h-full p-5 sm:p-6 bg-white rounded-2xl border border-slate-200 flex flex-col justify-center items-center text-center shadow-xs">
        <HelpCircle className="w-8 h-8 text-slate-300 mb-2 animate-pulse" />
        <h3 className="text-slate-500 font-sans font-semibold text-xs uppercase tracking-wider">Mode Pembelajaran</h3>
        <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">
          Langkah-langkah penyelesaian, keterangan taktis, dan keterangan geometris akan tampil di sini saat pemecahan dimulai.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-5 sm:p-6 bg-white rounded-2xl border border-slate-200 flex flex-col justify-between transition-all duration-300 shadow-xs">
      {/* Header */}
      <div className="flex justify-between items-start gap-3 border-b border-slate-100 pb-3">
        <div>
          <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 uppercase tracking-wider">
            {currentStep.phase}
          </span>
          <h4 className="text-slate-850 font-sans font-bold text-xs mt-2.5 flex items-center gap-1.5 uppercase tracking-wide">
            <BookOpen className="w-4 h-4 text-emerald-500" />
            Langkah {stepIndex + 1} dari {totalSteps}
          </h4>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono text-slate-450 block uppercase tracking-wider">Kemajuan</span>
          <span className="text-xs font-mono text-slate-800 font-extrabold block">
            {Math.round(((stepIndex + 1) / totalSteps) * 100)}%
          </span>
        </div>
      </div>

      {/* Main Focus: Move display */}
      <div className="my-4 flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 border border-slate-200 relative overflow-hidden">
        {/* Subtle decorative grid lines */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
        
        <div className="text-[10px] text-slate-400 font-mono tracking-wider uppercase mb-1">NOTASI MOVE CUBE</div>
        <div className="text-4xl sm:text-5xl font-mono font-black text-slate-900 tracking-tight">
          {currentStep.move}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-3">
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
          <span className="text-[9px] font-mono text-slate-400 uppercase font-black tracking-wider block mb-1">Panduan Langkah</span>
          <p className="text-xs text-slate-600 font-sans leading-relaxed">
            {currentStep.explanation}
          </p>
        </div>

        {/* Tip content */}
        <div className="flex items-start gap-2.5 text-slate-500 text-[10px] sm:text-xs">
          <Star className="w-3.5 h-3.5 mt-0.5 text-amber-500 flex-shrink-0 fill-amber-400" />
          <span className="leading-relaxed">
            {getEducationalTip(currentStep.phase)}
          </span>
        </div>
      </div>
    </div>
  );
};

// Maps solving phases to instructional tips to make learning incredibly immersive
function getEducationalTip(phase: string): string {
  if (phase.includes('Daisy')) {
    return 'Daisy adalah pola di mana 4 edge putih mengitari pusat kuning. Ini mempermudah pemula membentuk cross putih di bawah.';
  }
  if (phase.includes('Cross')) {
    return 'Langkah ini meluruskan sisi edge dengan pusat samping terlebih dahulu sebelum diturunkan, membentuk tiang yang selaras.';
  }
  if (phase.includes('Pertama') || phase.includes('Layer Pertama')) {
    return 'Rumus "R U R\' U\'" sering disebut sebagai Sexy Move. Rumus ini digunakan berulang kali untuk memasang sudut dengan aman.';
  }
  if (phase.includes('Kedua') || phase.includes('Layer Kedua')) {
    return 'Langkah ini menggeser slot sisi secara miring dari sisi atas ke layer tengah tanpa memecah keselarasan layer pertama.';
  }
  if (phase.includes('Kuning') || phase.includes('Cross Kuning')) {
    return 'Membuat garis lurus terlebih dahulu, lalu mengaplikasikan rumus untuk merubah bentuk Dot menjadi L terbalik lalu menjadi Cross.';
  }
  if (phase.includes('Sisi Cross')) {
    return 'Sune Move (R U R\' U R U2 R\') melompati orientasi tepi atas, menyapu selaras keempat tepi tanpa menghancurkan bawah.';
  }
  return 'Gunakan koordinat mata yang fokus. Pertahankan pusat warna kuning selalu menghadap ke atas agar arah putaran tetap presisi.';
}

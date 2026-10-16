import React, { useState } from 'react';
import { Download, Share2, PlusSquare, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA
  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
        <Smartphone className="w-3.5 h-3.5" />
        <span>PWA zainstalowane</span>
      </div>
    );
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 font-semibold text-slate-950 shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 active:scale-95 transition-all ${
          compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
        }`}
        title="Zainstaluj aplikację na telefonie lub komputerze"
      >
        <Download className="w-4 h-4" />
        <span>Zainstaluj aplikację</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 transition-all ${
            compact ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-xs font-medium'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Dodaj do ekranu (iOS)</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative text-slate-200">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Instalacja na iPhone / iPad</h3>
                  <p className="text-xs text-slate-400">Dodaj PrzerwaPro do ekranu głównego</p>
                </div>
              </div>

              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                  <Share2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <span>1. Dotknij przycisku <strong>Udostępnij</strong> (Share) na dolnym pasku przeglądarki Safari.</span>
                </div>
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                  <PlusSquare className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <span>2. Przewiń listę i wybierz <strong>Do ekranu początkowego</strong>.</span>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition"
              >
                Rozumiem
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback info button for non-chromium desktop browsers
  return (
    <button
      onClick={() => alert('Aby zainstalować aplikację jako PWA:\n• Na telefonie: Użyj opcji "Dodaj do ekranu głównego" w menu przeglądarki.\n• Na komputerze Chrome/Edge: Kliknij ikonkę instalacji po prawej stronie paska adresu.')}
      className={`flex items-center gap-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-all ${
        compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-1.5 text-xs font-medium'
      }`}
    >
      <Download className="w-3.5 h-3.5 text-amber-400" />
      <span>Zainstaluj PWA</span>
    </button>
  );
};

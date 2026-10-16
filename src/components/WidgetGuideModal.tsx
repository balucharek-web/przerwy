import React, { useState } from 'react';
import { 
  X, 
  Smartphone, 
  ExternalLink, 
  Play, 
  Square, 
  Layers, 
  Coffee, 
  CheckCircle2, 
  Sparkles,
  Pin,
  LayoutGrid
} from 'lucide-react';
import { useBreaks } from '../context/BreakContext';
import { formatDuration } from '../utils/dateUtils';

interface WidgetGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleMiniMode?: () => void;
  onOpenDedicatedWidget?: () => void;
}

export const WidgetGuideModal: React.FC<WidgetGuideModalProps> = ({ 
  isOpen, 
  onClose,
  onToggleMiniMode,
  onOpenDedicatedWidget,
}) => {
  const { activeBreak, currentBreakSeconds, todaySummary, startBreak, stopBreak } = useBreaks();
  const [copiedLink, setCopiedLink] = useState('');

  if (!isOpen) return null;

  const isBreakActive = !!activeBreak;
  const widgetUrl = `${window.location.origin}${window.location.pathname}?mode=widget`;
  const startUrl = `${window.location.origin}${window.location.pathname}?action=start`;
  const stopUrl = `${window.location.origin}${window.location.pathname}?action=stop`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(key);
    setTimeout(() => setCopiedLink(''), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative text-slate-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Jeden Widget z dwoma klawiszami (Start i Stop)</h3>
              <p className="text-xs text-slate-400">Oba przyciski na jednym ekranie bez szukania</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto py-4 space-y-5 text-xs flex-1 pr-1">
          {/* Answer to user's question: 1 widget with 2 buttons */}
          <div className="bg-gradient-to-r from-amber-500/15 via-slate-800 to-slate-900 p-4 rounded-2xl border border-amber-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Tak! Masz 1 wspólny Widget z obydwoma klawiszami</span>
              </span>
            </div>

            <p className="text-slate-200 leading-relaxed">
              Nie musisz mieć oddzielnych skrótów. Dostępny jest <strong>jeden dedykowany kafelek widgetu</strong>, na którym od razu widzisz:
            </p>

            <div className="grid grid-cols-2 gap-2 text-center text-xs font-bold py-1">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center gap-1.5">
                <Play className="w-4 h-4 fill-amber-300" /> Przycisk START
              </div>
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center gap-1.5">
                <Square className="w-4 h-4 fill-rose-300" /> Przycisk STOP
              </div>
            </div>

            {onOpenDedicatedWidget && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDedicatedWidget();
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Otwórz teraz widok Widgetu (Start + Stop)</span>
              </button>
            )}
          </div>

          {/* How to add this 1-widget to Android / iOS Home Screen */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
              <Smartphone className="w-4 h-4" />
              <span>Jak dodać ten 1 widget na ekran główny telefonu?</span>
            </div>
            
            <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
              <li>
                Skopiuj poniższy bezpośredni link widgetu lub otwórz go w przeglądarce:
                <div className="my-1.5 flex items-center justify-between bg-slate-950 p-2 rounded-lg text-[11px] font-mono border border-slate-800">
                  <span className="text-amber-400 truncate max-w-[260px]">{widgetUrl}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(widgetUrl, 'widget')}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold"
                  >
                    {copiedLink === 'widget' ? 'Skopiowano!' : 'Kopiuj link'}
                  </button>
                </div>
              </li>
              <li>W menu przeglądarki (3 kropki na Androidzie lub Udostępnij na iOS) kliknij <strong>„Dodaj do ekranu głównego”</strong>.</li>
              <li>Nazwij skrót np. <strong>„Przerwa Widget”</strong>.</li>
              <li>Gotowe! Masz na pulpicie jeden kafelek, po dotknięciu którego od razu masz <strong>oba klawisze: START i STOP</strong> bez ładowania zbędnych zakładek!</li>
            </ol>
          </div>

          {/* Interactive Live Mini-Bar */}
          <div className="bg-gradient-to-br from-slate-950 to-slate-900 p-4 rounded-2xl border-2 border-dashed border-amber-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Podgląd działania widgetu z 2 klawiszami:
              </span>
              <span className="text-[10px] text-slate-400">Na żywo</span>
            </div>

            {/* The Mini Widget Box with both buttons */}
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-3 shadow-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${isBreakActive ? 'bg-amber-500/20 text-amber-400 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                  <Coffee className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    {isBreakActive ? 'Trwa przerwa' : 'Pozostało'}
                  </div>
                  <div className="text-sm font-mono font-bold text-white">
                    {isBreakActive ? formatDuration(currentBreakSeconds) : formatDuration(todaySummary.remainingSeconds)}
                  </div>
                </div>
              </div>

              {/* Both buttons side-by-side */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => startBreak('Widget Podgląd')}
                  disabled={isBreakActive}
                  className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1 shadow-md transition active:scale-95 ${
                    !isBreakActive
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 cursor-pointer'
                      : 'bg-slate-800 text-slate-600 opacity-40 cursor-not-allowed'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>START</span>
                </button>

                <button
                  onClick={() => stopBreak()}
                  disabled={!isBreakActive}
                  className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1 shadow-md transition active:scale-95 ${
                    isBreakActive
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20 animate-pulse cursor-pointer'
                      : 'bg-slate-800 text-slate-600 opacity-40 cursor-not-allowed'
                  }`}
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>STOP</span>
                </button>
              </div>
            </div>

            {onToggleMiniMode && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onToggleMiniMode();
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Pin className="w-4 h-4" />
                <span>Włącz pływający widget na pulpicie (zawsze pod ręką)</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};

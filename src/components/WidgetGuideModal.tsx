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
  Pin
} from 'lucide-react';
import { useBreaks } from '../context/BreakContext';
import { formatDuration } from '../utils/dateUtils';

interface WidgetGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleMiniMode?: () => void;
}

export const WidgetGuideModal: React.FC<WidgetGuideModalProps> = ({ 
  isOpen, 
  onClose,
  onToggleMiniMode
}) => {
  const { activeBreak, currentBreakSeconds, todaySummary, startBreak, stopBreak } = useBreaks();
  const [copiedLink, setCopiedLink] = useState('');

  if (!isOpen) return null;

  const isBreakActive = !!activeBreak;
  const startUrl = `${window.location.origin}/?action=start`;
  const stopUrl = `${window.location.origin}/?action=stop`;

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
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Widget na ekran główny telefonu i komputera</h3>
              <p className="text-xs text-slate-400">Szybki Start &amp; Stop z pulpitu bez szukania</p>
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
          {/* Method 1: Android PWA Shortcut Pinning (Standard Widget) */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wide">
              <Smartphone className="w-4 h-4" />
              <span>Metoda 1: Skrót-Widget na telefonie (Android / Chrome)</span>
            </div>
            
            <p className="text-slate-300 leading-relaxed">
              Standard PWA wspiera <strong>App Shortcuts</strong>. Po zainstalowaniu aplikacji:
            </p>

            <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
              <li>Zainstaluj aplikację PrzerwaPro na telefonie (przycisk <em>Zainstaluj aplikację</em>).</li>
              <li>Na ekranie głównym telefonu <strong>przytrzymaj palec (długie dotknięcie)</strong> na ikonie PrzerwaPro.</li>
              <li>W menu podręcznym pojawią się opcje:
                <div className="mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[11px]">
                    <Play className="w-3 h-3 fill-amber-300" /> Start
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[11px]">
                    <Square className="w-3 h-3 fill-rose-300" /> Stop
                  </span>
                </div>
              </li>
              <li>
                <strong>Przeciągnij ten skrót</strong> bezpośrednio na wolne miejsce ekranu głównego telefonu!
              </li>
              <li>Od teraz masz bezpośredni widget 1-kliknięciowy: dotykasz i przerwa natychmiast startuje lub kończy się!</li>
            </ol>
          </div>

          {/* Interactive Widget Mini Preview */}
          <div className="bg-gradient-to-br from-slate-950 to-slate-900 p-4 rounded-2xl border-2 border-dashed border-amber-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Podgląd miniaturowego widgetu
              </span>
              <span className="text-[10px] text-slate-400">Działa na żywo</span>
            </div>

            {/* The Mini Widget Box */}
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-3 shadow-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${isBreakActive ? 'bg-amber-500/20 text-amber-400 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                  <Coffee className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    {isBreakActive ? 'Na przerwie' : 'Limit przerw'}
                  </div>
                  <div className="text-sm font-mono font-bold text-white">
                    {isBreakActive ? formatDuration(currentBreakSeconds) : formatDuration(todaySummary.remainingSeconds)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {!isBreakActive ? (
                  <button
                    onClick={() => startBreak('Widget')}
                    className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-slate-950" />
                    <span>START</span>
                  </button>
                ) : (
                  <button
                    onClick={() => stopBreak()}
                    className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition active:scale-95"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>STOP</span>
                  </button>
                )}
              </div>
            </div>

            {onToggleMiniMode && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onToggleMiniMode();
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 font-semibold flex items-center justify-center gap-2 transition"
              >
                <Pin className="w-4 h-4" />
                <span>Przełącz aplikację w kompaktowy Pływający Mini-Widget</span>
              </button>
            )}
          </div>

          {/* Method 2: Direct URL Shortcuts (for bookmark widgets or shortcuts app) */}
          <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-slate-300">
              Bezpośrednie adresy URL do skrótów (iOS Skróty / Pulpit):
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg text-[11px] font-mono">
                <span className="text-amber-400 truncate max-w-[260px]">{startUrl}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(startUrl, 'start')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                >
                  {copiedLink === 'start' ? 'Skopiowano!' : 'Kopiuj'}
                </button>
              </div>
              <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg text-[11px] font-mono">
                <span className="text-rose-400 truncate max-w-[260px]">{stopUrl}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(stopUrl, 'stop')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                >
                  {copiedLink === 'stop' ? 'Skopiowano!' : 'Kopiuj'}
                </button>
              </div>
            </div>
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

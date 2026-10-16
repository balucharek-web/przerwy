import React, { useState } from 'react';
import { 
  Coffee, 
  Play, 
  Square, 
  ArrowLeft, 
  Bell, 
  Smartphone, 
  Copy, 
  Check, 
  ExternalLink, 
  X, 
  Download,
  Info,
  Pin,
  Sparkles
} from 'lucide-react';
import { useBreaks } from '../context/BreakContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { formatDuration } from '../utils/dateUtils';

interface DedicatedWidgetViewProps {
  onBackToApp: () => void;
  onEnableFloatingMini?: () => void;
}

export const DedicatedWidgetView: React.FC<DedicatedWidgetViewProps> = ({ 
  onBackToApp,
  onEnableFloatingMini 
}) => {
  const {
    activeBreak,
    currentBreakSeconds,
    todaySummary,
    startBreak,
    stopBreak,
    settings,
  } = useBreaks();

  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const isBreakActive = !!activeBreak;
  const { totalSeconds, remainingSeconds, isOverLimit } = todaySummary;
  const isWarningZone = remainingSeconds <= settings.warningMinutesBeforeEnd * 60 && remainingSeconds > 0;

  const widgetUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}${window.location.pathname}?mode=widget` 
    : '';

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(widgetUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleOpenInBrowser = () => {
    if (typeof window !== 'undefined') {
      window.open(widgetUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-amber-500/30">
      {/* Container simulating a standalone mobile widget */}
      <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-slate-800 rounded-3xl p-5 shadow-2xl relative text-slate-100 flex flex-col gap-4">
        
        {/* Widget Top Bar */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Coffee className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white tracking-wide">Widget Przerw</div>
              <div className="text-[10px] text-slate-400">Limit: {settings.dailyAllowanceMinutes} min</div>
            </div>
          </div>

          <button
            onClick={onBackToApp}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Pełna aplikacja</span>
          </button>
        </div>

        {/* Status Indicator & Live Counters */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isBreakActive ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
              }`}
            />
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                isBreakActive ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {isBreakActive ? 'Trwa przerwa' : 'W pracy (gotowość)'}
            </span>
          </div>

          {/* Big Digital Timer */}
          <div className="text-4xl font-mono font-black text-white tracking-tight my-1 drop-shadow-md">
            {isBreakActive ? formatDuration(currentBreakSeconds) : formatDuration(remainingSeconds)}
          </div>

          <div className="text-xs text-slate-400 flex items-center justify-center gap-2">
            <span>Dziś wykorzystano: <strong className="text-slate-200">{formatDuration(totalSeconds)}</strong></span>
            <span>&bull;</span>
            <span className={isOverLimit ? 'text-rose-400 font-bold' : isWarningZone ? 'text-amber-400 font-bold' : 'text-slate-300'}>
              Pozostało: {formatDuration(remainingSeconds)}
            </span>
          </div>

          {isWarningZone && isBreakActive && (
            <div className="mt-2 text-[10px] text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
              <Bell className="w-3 h-3 text-amber-400" />
              <span>Alarm! Mniej niż {settings.warningMinutesBeforeEnd} min do końca!</span>
            </div>
          )}
        </div>

        {/* THE TWO BUTTONS IN ONE WIDGET: START and STOP SIDE-BY-SIDE */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Button 1: START */}
          <button
            onClick={() => startBreak('Widget 2-klawisze')}
            disabled={isBreakActive}
            className={`py-4 px-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 font-black text-sm tracking-wider shadow-lg transition-all select-none cursor-pointer ${
              !isBreakActive
                ? 'bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20 active:scale-95'
                : 'bg-slate-800/40 text-slate-600 border border-slate-800 cursor-not-allowed opacity-50'
            }`}
          >
            <div className={`p-2 rounded-xl ${!isBreakActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-600'}`}>
              <Play className="w-5 h-5 fill-current" />
            </div>
            <span>START</span>
            <span className="text-[10px] font-normal opacity-80">Rozpocznij</span>
          </button>

          {/* Button 2: STOP */}
          <button
            onClick={() => stopBreak()}
            disabled={!isBreakActive}
            className={`py-4 px-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 font-black text-sm tracking-wider shadow-lg transition-all select-none cursor-pointer ${
              isBreakActive
                ? 'bg-gradient-to-b from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-rose-600/30 active:scale-95 animate-pulse'
                : 'bg-slate-800/40 text-slate-600 border border-slate-800 cursor-not-allowed opacity-50'
            }`}
          >
            <div className={`p-2 rounded-xl ${isBreakActive ? 'bg-white text-rose-600' : 'bg-slate-800 text-slate-600'}`}>
              <Square className="w-5 h-5 fill-current" />
            </div>
            <span>STOP</span>
            <span className="text-[10px] font-normal opacity-80">Zakończ</span>
          </button>
        </div>

        {/* Quick time adjustment when active */}
        {isBreakActive && (
          <div className="flex items-center justify-between gap-2 px-1 bg-slate-900/80 p-2 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 font-medium">Wróciłeś wcześniej?</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => stopBreak(undefined, 5)}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-semibold border border-slate-700 cursor-pointer active:scale-95 transition"
                title="Zakończ przerwę i odejmij 5 minut"
              >
                -5 min
              </button>
              <button
                type="button"
                onClick={() => stopBreak(undefined, 10)}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-semibold border border-slate-700 cursor-pointer active:scale-95 transition"
                title="Zakończ przerwę i odejmij 10 minut"
              >
                -10 min
              </button>
            </div>
          </div>
        )}

        {/* Home Screen Add Button & Guide Trigger */}
        <div className="space-y-2 pt-1 border-t border-slate-800/80">
          {isInstallable && (
            <button
              onClick={install}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-95 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Zainstaluj ten widget na ekranie</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="w-full py-2 px-3 rounded-xl bg-slate-850 hover:bg-slate-800 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5 text-amber-400" />
            <span>📲 Jak dodać ten widget na ekran główny?</span>
          </button>
        </div>
      </div>

      {/* Guide Modal for Adding Widget to Home Screen */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700/80 p-5 shadow-2xl relative text-slate-200 flex flex-col gap-4 max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Dodaj widget na pulpit</h3>
                  <p className="text-[10px] text-slate-400">Ekran z przyciskami START i STOP w 1 kliknięcie</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Instruction Steps */}
            <div className="overflow-y-auto space-y-3.5 text-xs pr-1">
              {/* Method 1: App Shortcut (Native Android Launcher) */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/15 via-slate-800 to-slate-850 border border-amber-500/40 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-400 text-xs">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Sposób 1 (Najszybszy na Androidzie):</span>
                </div>
                <p className="text-slate-200 text-[11px] leading-relaxed">
                  Gdy masz już ikonę <strong>PrzerwaPro</strong> na telefonie:
                </p>
                <ol className="list-decimal pl-4 space-y-1.5 text-slate-300 text-[11px]">
                  <li>Przejdź na ekran główny telefonu (pulpit).</li>
                  <li><strong>Przytrzymaj dłużej palec</strong> na ikonie aplikacji <strong>PrzerwaPro</strong>.</li>
                  <li>W wyskakującym dymku zobaczysz skrót <strong>„Widget Start & Stop”</strong>.</li>
                  <li><strong>Przytrzymaj i przeciągnij</strong> ten skrót na pulpit! Powstanie osobny kafelek widgetu.</li>
                </ol>
              </div>

              {/* Method 2: Chrome Browser "Add to Home Screen" */}
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-200 text-xs">
                  <Info className="w-4 h-4 text-blue-400" />
                  <span>Sposób 2 (Przez przeglądarkę Chrome):</span>
                </div>
                <ol className="list-decimal pl-4 space-y-1.5 text-slate-300 text-[11px]">
                  <li>Otwórz poniższy bezpośredni link widgetu w <strong>Google Chrome</strong>.</li>
                  <li>Dotknij menu z <strong>3 pionowymi kropkami (⋮)</strong> w prawym górnym rogu Chrome.</li>
                  <li>Wybierz opcję <strong>„Dodaj do ekranu głównego”</strong> (lub „Zainstaluj skrót”).</li>
                  <li>Wpisz nazwę np. <strong>Widget Przerw</strong> i zatwierdź.</li>
                </ol>
              </div>

              {/* Quick Action: Copy Widget Link */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Bezpośredni link do tego widgetu:
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={widgetUrl}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-amber-400 font-mono select-all focus:outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shrink-0 transition cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Skopiowano!' : 'Kopiuj'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Action: Open in Browser */}
              <button
                onClick={handleOpenInBrowser}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                <span>Otwórz w przeglądarce (aby dodać przez menu ⋮)</span>
              </button>

              {/* Optional: Floating Mini Widget */}
              {onEnableFloatingMini && (
                <button
                  onClick={() => {
                    setShowGuideModal(false);
                    onEnableFloatingMini();
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer border border-amber-500/20"
                >
                  <Pin className="w-3.5 h-3.5" />
                  <span>Włącz pływający mini-widget w rogu ekranu</span>
                </button>
              )}
            </div>

            {/* Modal Close Button */}
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowGuideModal(false)}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

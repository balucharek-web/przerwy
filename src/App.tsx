import React, { useState, useEffect } from 'react';
import { 
  Coffee, 
  Calendar as CalendarIcon, 
  Settings as SettingsIcon, 
  Layers, 
  Clock, 
  Minimize2, 
  CheckCircle2, 
  AlertCircle, 
  LayoutGrid,
  Share2,
  QrCode,
  RotateCcw,
  X,
  Smartphone,
  Download,
  ChevronRight
} from 'lucide-react';
import { BreakProvider, useBreaks } from './context/BreakContext';
import { MainBreakTracker } from './components/MainBreakTracker';
import { BreakCalendar } from './components/BreakCalendar';
import { SettingsModal } from './components/SettingsModal';
import { WidgetGuideModal } from './components/WidgetGuideModal';
import { ShareModal } from './components/ShareModal';
import { FloatingMiniWidget } from './components/FloatingMiniWidget';
import { DedicatedWidgetView } from './components/DedicatedWidgetView';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { formatTimeOnly } from './utils/dateUtils';

function AppContent() {
  const { activeBreak, undoState, undoLastAction, dismissUndo } = useBreaks();

  const [activeTab, setActiveTab] = useState<'tracker' | 'calendar'>('tracker');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWidgetGuideOpen, setIsWidgetGuideOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isMiniMode, setIsMiniMode] = useState(false);
  const [isDedicatedWidget, setIsDedicatedWidget] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'widget' || params.get('widget') === 'true';
  });

  // Check URL parameters for tab navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'calendar') {
      setActiveTab('calendar');
    }
    if (params.get('mode') === 'widget' || params.get('widget') === 'true') {
      setIsDedicatedWidget(true);
    }
  }, []);

  // Dedicated single widget mode containing both buttons
  if (isDedicatedWidget) {
    return (
      <>
        <OfflineIndicator />
        <DedicatedWidgetView
          onBackToApp={() => {
            setIsDedicatedWidget(false);
            const url = new URL(window.location.href);
            url.searchParams.delete('mode');
            url.searchParams.delete('widget');
            window.history.replaceState({}, '', url.toString());
          }}
          onEnableFloatingMini={() => {
            setIsDedicatedWidget(false);
            setIsMiniMode(true);
            const url = new URL(window.location.href);
            url.searchParams.delete('mode');
            url.searchParams.delete('widget');
            window.history.replaceState({}, '', url.toString());
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      {/* Offline Status indicator */}
      <OfflineIndicator />

      {/* Mini Widget Overlay when Mini Mode is active */}
      {isMiniMode ? (
        <div className="min-h-screen flex items-center justify-center p-6 text-center">
          <div className="space-y-4 max-w-sm">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
              <p>Aplikacja działa w trybie pływającego widgetu w rogu ekranu.</p>
              <button
                onClick={() => setIsMiniMode(false)}
                className="mt-3 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition"
              >
                Przywróć pełny widok
              </button>
            </div>
          </div>
          <FloatingMiniWidget onExpand={() => setIsMiniMode(false)} />
        </div>
      ) : (
        <>
          {/* Top Navbar */}
          <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
            <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
              {/* Logo & App Name */}
              <div 
                onClick={() => setActiveTab('tracker')}
                className="flex items-center gap-2.5 cursor-pointer select-none group"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 group-hover:scale-105 transition">
                  <Coffee className="w-5 h-5 fill-slate-950" />
                </div>
                <div>
                  <span className="font-black text-lg text-white tracking-tight">PrzerwaPro</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {/* 1. Share & QR */}
                <button
                  onClick={() => setIsShareOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                  title="Udostępnij webhook i kod QR koledze z pracy"
                >
                  <QrCode className="w-3.5 h-3.5 text-amber-400" />
                  <span>Udostępnij / QR</span>
                </button>

                {/* 2. Settings */}
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-400 border border-slate-800 transition cursor-pointer"
                  title="Ustawienia i konfiguracja"
                >
                  <SettingsIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </header>

          {/* Navigation Sub-bar */}
          <nav className="max-w-4xl mx-auto px-4 pt-4 pb-2 w-full">
            <div className="flex items-center p-1 bg-slate-900/90 border border-slate-800 rounded-2xl max-w-sm mx-auto shadow-inner">
              <button
                onClick={() => setActiveTab('tracker')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'tracker'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Licznik przerw</span>
                {activeBreak && (
                  <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('calendar')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'calendar'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Kalendarz</span>
              </button>
            </div>
          </nav>

          {/* Main Content Area */}
          <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 pb-20">
            {activeTab === 'tracker' && (
              <MainBreakTracker
                onOpenCalendar={() => setActiveTab('calendar')}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenWidgetGuide={() => setIsWidgetGuideOpen(true)}
              />
            )}

            {activeTab === 'calendar' && <BreakCalendar />}
          </main>

          {/* Modals */}
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
          />

          <WidgetGuideModal
            isOpen={isWidgetGuideOpen}
            onClose={() => setIsWidgetGuideOpen(false)}
            onToggleMiniMode={() => setIsMiniMode(true)}
            onOpenDedicatedWidget={() => setIsDedicatedWidget(true)}
          />

          <ShareModal
            isOpen={isShareOpen}
            onClose={() => setIsShareOpen(false)}
          />

          {/* Floating Undo Toast for accidental Start / Stop */}
          {undoState && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/95 border border-amber-500/50 shadow-2xl backdrop-blur-md text-white text-xs animate-in slide-in-from-bottom-4 shadow-amber-500/20">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
              <span className="font-semibold text-slate-200">{undoState.label}</span>
              <button
                onClick={undoLastAction}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Cofnij</span>
              </button>
              <button
                onClick={dismissUndo}
                className="text-slate-400 hover:text-white p-1 ml-1 cursor-pointer"
                title="Zamknij"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </>
      )}

    </div>
  );
}

export default function App() {
  return (
    <BreakProvider>
      <AppContent />
    </BreakProvider>
  );
}

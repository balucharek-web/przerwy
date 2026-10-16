import React, { useState, useEffect } from 'react';
import { 
  Coffee, 
  Calendar as CalendarIcon, 
  Settings as SettingsIcon, 
  Layers, 
  Github, 
  Clock, 
  Send, 
  Minimize2, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck,
  Smartphone,
  LayoutGrid
} from 'lucide-react';
import { BreakProvider, useBreaks } from './context/BreakContext';
import { MainBreakTracker } from './components/MainBreakTracker';
import { BreakCalendar } from './components/BreakCalendar';
import { SettingsModal } from './components/SettingsModal';
import { WidgetGuideModal } from './components/WidgetGuideModal';
import { GitHubGuideModal } from './components/GitHubGuideModal';
import { FloatingMiniWidget } from './components/FloatingMiniWidget';
import { DedicatedWidgetView } from './components/DedicatedWidgetView';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { formatTimeOnly } from './utils/dateUtils';

function AppContent() {
  const { webhookLogs, activeBreak } = useBreaks();

  const [activeTab, setActiveTab] = useState<'tracker' | 'calendar' | 'logs'>('tracker');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWidgetGuideOpen, setIsWidgetGuideOpen] = useState(false);
  const [isGitHubGuideOpen, setIsGitHubGuideOpen] = useState(false);
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
    } else if (tabParam === 'logs') {
      setActiveTab('logs');
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
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-base text-white tracking-tight">PrzerwaPro</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      PWA
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 -mt-0.5">30 min limit &bull; Alarm &bull; Google Chat</div>
                </div>
              </div>

              {/* Action Buttons & Install */}
              <div className="flex items-center gap-2">
                {/* 1-Tap Widget Mode Button (Start + Stop in one tile) */}
                <button
                  onClick={() => setIsDedicatedWidget(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
                  title="Otwórz widok Widgetu (Start + Stop)"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Widget Start/Stop</span>
                </button>

                {/* PWA Install Button */}
                <PWAInstallButton compact />

                {/* Mini Mode Toggle */}
                <button
                  onClick={() => setIsMiniMode(true)}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition hidden sm:flex"
                  title="Tryb mini-widgetu na pulpicie"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>

                {/* Widget Guide */}
                <button
                  onClick={() => setIsWidgetGuideOpen(true)}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-400 border border-slate-800 transition"
                  title="Instrukcja widgetu na ekran telefonu"
                >
                  <Layers className="w-4 h-4" />
                </button>

                {/* GitHub Guide */}
                <button
                  onClick={() => setIsGitHubGuideOpen(true)}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
                  title="Wgraj na swój GitHub"
                >
                  <Github className="w-4 h-4" />
                </button>

                {/* Settings */}
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-400 border border-slate-800 transition"
                  title="Ustawienia"
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

              <button
                onClick={() => setActiveTab('logs')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'logs'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Google Chat</span>
                {webhookLogs.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                    {webhookLogs.length}
                  </span>
                )}
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

            {activeTab === 'logs' && (
              <div className="max-w-xl mx-auto space-y-4">
                <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Historia powiadomień Google Chat</h3>
                      <p className="text-xs text-slate-400">Komunikaty wysłane po Start i Stop</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                  >
                    Konfiguruj
                  </button>
                </div>

                {webhookLogs.length === 0 ? (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                    <Send className="w-8 h-8 text-slate-700" />
                    <span>Brak wysłanych powiadomień w historii sesji.</span>
                    <span className="text-slate-600">
                      Po dodaniu webhooka każde kliknięcie Start i Stop automatycznie wyśle komunikat "start" lub "stop" na czat.
                    </span>
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800/80 overflow-hidden">
                    {webhookLogs.map((log) => (
                      <div key={log.id} className="p-3.5 text-xs flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          {log.status === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                {log.action === 'start' ? 'Start przerwy' : log.action === 'stop' ? 'Stop przerwy' : 'Test'}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {formatTimeOnly(log.timestamp)}
                              </span>
                            </div>
                            <div className="mt-1 text-slate-300 leading-relaxed font-mono text-[11px]">
                              {log.message}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            log.status === 'success'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {log.status === 'success' ? 'Dostarczono' : 'Błąd'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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

          <GitHubGuideModal
            isOpen={isGitHubGuideOpen}
            onClose={() => setIsGitHubGuideOpen(false)}
          />
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

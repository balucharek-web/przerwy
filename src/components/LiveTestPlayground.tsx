import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Square, 
  Bell, 
  Volume2, 
  Smartphone, 
  FastForward, 
  Clock, 
  Send, 
  ExternalLink, 
  X, 
  ChevronUp, 
  ChevronDown, 
  Sparkles, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  QrCode
} from 'lucide-react';
import { useBreaks } from '../context/BreakContext';
import { formatDuration, formatShortTime } from '../utils/dateUtils';

interface NotificationSimulationData {
  title: string;
  body?: string;
  time: string;
  vibrate?: number[];
}

export const LiveTestPlayground: React.FC<{
  onOpenWidgetMode: () => void;
  onOpenShareModal: () => void;
}> = ({ onOpenWidgetMode, onOpenShareModal }) => {
  const {
    activeBreak,
    currentBreakSeconds,
    todaySummary,
    startBreak,
    stopBreak,
    settings,
    fastForwardSeconds,
    jumpToAlarmTest,
    testSoundAlarm,
    testVibration,
    testWebhook,
    testServerPush,
    lastWebhookStatus,
  } = useBreaks();

  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'alarms' | 'lockscreen' | 'sounds' | 'integrations'>('alarms');
  const [simulatedVibration, setSimulatedVibration] = useState<{ active: boolean; pattern: string } | null>(null);
  const [simulatedNotification, setSimulatedNotification] = useState<NotificationSimulationData | null>(null);
  const [pushStatus, setPushStatus] = useState<{ loading: boolean; message: string; success?: boolean }>({
    loading: false,
    message: '',
  });

  const isBreakActive = !!activeBreak;
  const { remainingSeconds, totalSeconds, allowanceSeconds, isOverLimit } = todaySummary;

  // Listen to custom vibration events from vibrationService
  useEffect(() => {
    const handleVibration = (e: any) => {
      const pattern = e.detail?.pattern;
      const patternStr = Array.isArray(pattern) ? pattern.join('ms, ') + 'ms' : `${pattern}ms`;
      setSimulatedVibration({ active: true, pattern: patternStr });
      setTimeout(() => {
        setSimulatedVibration(null);
      }, 3000);
    };

    const handleNotification = (e: any) => {
      const { title, options } = e.detail || {};
      setSimulatedNotification({
        title,
        body: options?.body,
        time: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
        vibrate: options?.vibrate,
      });
      setTimeout(() => {
        setSimulatedNotification(null);
      }, 7000);
    };

    window.addEventListener('app-vibration', handleVibration);
    window.addEventListener('app-notification', handleNotification);

    return () => {
      window.removeEventListener('app-vibration', handleVibration);
      window.removeEventListener('app-notification', handleNotification);
    };
  }, []);

  const handleTestPush = async () => {
    setPushStatus({ loading: true, message: 'Wysyłanie Web Push z serwera...' });
    const res = await testServerPush();
    if (res.success) {
      setPushStatus({
        loading: false,
        success: true,
        message: 'Pomyślnie wysłano Push! Zobacz belkę powiadomień.',
      });
    } else {
      setPushStatus({
        loading: false,
        success: false,
        message: res.error || 'Błąd wysyłki pusha.',
      });
    }
    setTimeout(() => {
      setPushStatus({ loading: false, message: '' });
    }, 6000);
  };

  const returnTimeStr = React.useMemo(() => {
    if (remainingSeconds <= 0) return 'Przekroczono limit!';
    const returnDate = new Date(Date.now() + remainingSeconds * 1000);
    return formatShortTime(returnDate);
  }, [remainingSeconds]);

  return (
    <>
      {/* Visual Vibration Simulator Floating Banner */}
      {simulatedVibration && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-amber-500 text-slate-950 font-black text-xs shadow-2xl animate-bounce border-2 border-amber-300">
          <Smartphone className="w-4 h-4 animate-spin" />
          <span>📳 [WIBRACJA TELEFONU: {simulatedVibration.pattern}]</span>
        </div>
      )}

      {/* Simulated System Notification Popup Banner */}
      {simulatedNotification && (
        <div className="fixed top-20 right-4 z-50 max-w-sm w-full bg-slate-900/95 border-2 border-amber-400 text-slate-100 p-3.5 rounded-2xl shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 flex items-start gap-3">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl shrink-0 mt-0.5">
            <Bell className="w-4 h-4 animate-bounce" />
          </div>
          <div className="flex-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-300">{simulatedNotification.title}</span>
              <span className="text-[10px] text-slate-500">{simulatedNotification.time}</span>
            </div>
            {simulatedNotification.body && (
              <p className="text-slate-300 text-[11px] mt-1 leading-snug">
                {simulatedNotification.body}
              </p>
            )}
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setSimulatedNotification(null)}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
          <button
            onClick={() => setSimulatedNotification(null)}
            className="text-slate-500 hover:text-white p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Persistent Bottom Testing Bar / Simulator */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-amber-500/40 backdrop-blur-xl shadow-2xl">
        {/* Toggle Bar Header */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between cursor-pointer select-none group hover:bg-slate-900/50 transition"
        >
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-amber-500 text-slate-950">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
              🧪 Panel Testowy i Symulator (Tryb Podglądu)
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-400 font-mono">
              Przetestuj alarmy, powiadomienia i widget w 1 kliknięcie
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 group-hover:text-amber-400">
            <span>{isExpanded ? 'Zwiń panel' : 'Rozwiń narzędzia testowe'}</span>
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </div>

        {/* Expanded Panel Content */}
        {isExpanded && (
          <div className="max-w-4xl mx-auto px-4 pb-4 pt-2 border-t border-slate-800 space-y-3 animate-in fade-in">
            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-800/80 pb-2 text-xs font-bold">
              <button
                onClick={() => setActiveTab('alarms')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'alarms'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white bg-slate-900'
                }`}
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>Symulacja Czasu & Alarmów</span>
              </button>
              <button
                onClick={() => setActiveTab('lockscreen')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'lockscreen'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white bg-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Belka Powiadomień (Ekran Blokady)</span>
              </button>
              <button
                onClick={() => setActiveTab('sounds')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'sounds'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white bg-slate-900'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Dźwięki & Wibracje</span>
              </button>
              <button
                onClick={() => setActiveTab('integrations')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'integrations'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white bg-slate-900'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Web Push & Google Chat</span>
              </button>
            </div>

            {/* TAB 1: Fast-Forward Alarms */}
            {activeTab === 'alarms' && (
              <div className="space-y-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Status licznika:</span>
                    <strong className="text-white font-mono text-sm">
                      {isBreakActive ? formatDuration(currentBreakSeconds) : 'Brak aktywnej przerwy'}
                    </strong>
                    <span className="text-slate-500">|</span>
                    <span>Pozostało z limitu:</span>
                    <strong className={`font-mono text-sm ${isOverLimit ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {formatDuration(remainingSeconds)}
                    </strong>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!isBreakActive ? (
                      <button
                        onClick={() => startBreak('Start z panelu')}
                        className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1 transition cursor-pointer active:scale-95"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Start</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => stopBreak()}
                        className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1 transition cursor-pointer active:scale-95"
                      >
                        <Square className="w-3 h-3 fill-current" />
                        <span>Stop</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Instant Jump Alarm Test Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-300 flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-amber-400" />
                        <span>Test Alarmu 3 min przed końcem</span>
                      </span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono">
                        odpali za 10s
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Przeskakuje licznik na 10 sekund przed granicą 3 minut. Zobaczysz jak odpala się dzwonek, wibracja i powiadomienie!
                    </p>
                    <button
                      onClick={() => jumpToAlarmTest('warning')}
                      className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-md shadow-amber-500/20"
                    >
                      <FastForward className="w-3.5 h-3.5" />
                      <span>Uruchom i przeskocz (alarm za 10 sek)</span>
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        <span>Test Alarmu Limitu 30 min (0 min)</span>
                      </span>
                      <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-mono">
                        odpali za 10s
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Przeskakuje licznik na 10 sekund przed upływem limitu 30 minut. Zobaczysz czerwoną syrenę alarmową i wibrację końcową!
                    </p>
                    <button
                      onClick={() => jumpToAlarmTest('limit')}
                      className="w-full py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-md shadow-rose-600/30"
                    >
                      <FastForward className="w-3.5 h-3.5" />
                      <span>Uruchom i przeskocz (limit za 10 sek)</span>
                    </button>
                  </div>
                </div>

                {/* Incremental Skip Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-slate-400 text-[11px]">Dodaj czas do trwającej przerwy:</span>
                  <button
                    onClick={() => fastForwardSeconds(60)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition cursor-pointer active:scale-95"
                  >
                    +1 minuta
                  </button>
                  <button
                    onClick={() => fastForwardSeconds(300)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition cursor-pointer active:scale-95"
                  >
                    +5 minut
                  </button>
                  <button
                    onClick={() => fastForwardSeconds(600)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition cursor-pointer active:scale-95"
                  >
                    +10 minut
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Android Lockscreen Notification Bar Simulation */}
            {activeTab === 'lockscreen' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                      <span>Symulacja belki Androida na Ekranie Blokady (w kieszeni):</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">Stan na żywo</span>
                  </div>

                  {/* Android System Notification Card Representation */}
                  <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-700 shadow-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-[10px]">
                          P
                        </div>
                        <span className="font-bold text-slate-200 text-xs">PrzerwaPro</span>
                        <span className="text-[10px] text-slate-500">&bull; teraz</span>
                      </div>
                      <span className="text-[10px] text-amber-400 font-mono">
                        {isBreakActive ? 'Trwa przerwa' : 'W gotowości'}
                      </span>
                    </div>

                    <div>
                      <div className="font-bold text-white text-sm flex items-center gap-2">
                        <span>{isBreakActive ? `⏱️ ${formatDuration(currentBreakSeconds)}` : '☕ PrzerwaPro'}</span>
                        <span className="text-xs text-slate-400 font-normal">
                          &bull; Zostało: {formatDuration(remainingSeconds)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isBreakActive
                          ? `🔔 Powrót do pracy: ${returnTimeStr} (Limit: ${settings.dailyAllowanceMinutes} min)`
                          : `Dostępny limit na dzisiaj: ${formatDuration(remainingSeconds)}`}
                      </p>
                    </div>

                    {/* Notification Action Buttons */}
                    <div className="pt-1.5 border-t border-neutral-800 flex gap-2">
                      {isBreakActive ? (
                        <button
                          onClick={() => stopBreak()}
                          className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>⏹ ZAKOŃCZ PRZERWĘ (STOP)</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => startBreak('Start z belki')}
                          className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>▶ ROZPOCZNIJ PRZERWĘ (START)</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    💡 Dokładnie takie powiadomienie z przyciskiem <strong>STOP</strong> wisi na ekranie blokady telefonu podczas trwania przerwy, bez konieczności odblokowywania ekranu!
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: Sounds & Haptics */}
            {activeTab === 'sounds' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => testSoundAlarm('warning', settings.alarmVolume)}
                    className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left space-y-1 transition cursor-pointer active:scale-95"
                  >
                    <div className="flex items-center justify-between text-amber-400">
                      <Volume2 className="w-4 h-4" />
                      <span className="text-[10px] text-slate-500">784-1174Hz</span>
                    </div>
                    <div className="font-bold text-slate-200">Alarm 3 min</div>
                    <div className="text-[10px] text-slate-400">Dzwonki ostrzegawcze</div>
                  </button>

                  <button
                    onClick={() => testSoundAlarm('final', settings.alarmVolume)}
                    className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left space-y-1 transition cursor-pointer active:scale-95"
                  >
                    <div className="flex items-center justify-between text-rose-400">
                      <Volume2 className="w-4 h-4" />
                      <span className="text-[10px] text-slate-500">950-450Hz</span>
                    </div>
                    <div className="font-bold text-slate-200">Alarm 0 min (Limit)</div>
                    <div className="text-[10px] text-slate-400">Głośna syrena</div>
                  </button>

                  <button
                    onClick={() => testVibration('strong')}
                    className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left space-y-1 transition cursor-pointer active:scale-95"
                  >
                    <div className="flex items-center justify-between text-blue-400">
                      <Smartphone className="w-4 h-4" />
                      <span className="text-[10px] text-slate-500">Wibracja</span>
                    </div>
                    <div className="font-bold text-slate-200">Wibracja Haptic</div>
                    <div className="text-[10px] text-slate-400">Impuls w kieszeni</div>
                  </button>

                  <button
                    onClick={() => testVibration('tick')}
                    className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left space-y-1 transition cursor-pointer active:scale-95"
                  >
                    <div className="flex items-center justify-between text-emerald-400">
                      <Clock className="w-4 h-4" />
                      <span className="text-[10px] text-slate-500">Klik</span>
                    </div>
                    <div className="font-bold text-slate-200">Impuls minuty</div>
                    <div className="text-[10px] text-slate-400">Dyskretny tick</div>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: Integrations & Views */}
            {activeTab === 'integrations' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Web Push */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-amber-400" />
                      <span>Serwer Web Push (VAPID)</span>
                    </span>
                    <button
                      onClick={handleTestPush}
                      disabled={pushStatus.loading}
                      className="w-full py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition active:scale-95 cursor-pointer"
                    >
                      {pushStatus.loading ? 'Wysyłanie...' : 'Wyślij testowy Push'}
                    </button>
                    {pushStatus.message && (
                      <p className={`text-[10px] ${pushStatus.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {pushStatus.message}
                      </p>
                    )}
                  </div>

                  {/* Google Chat Webhook */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-blue-400" />
                      <span>Google Chat Webhook</span>
                    </span>
                    <button
                      onClick={testWebhook}
                      className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition active:scale-95 cursor-pointer border border-slate-700"
                    >
                      Wyślij test na Chat
                    </button>
                    {lastWebhookStatus.message && (
                      <p className="text-[10px] text-slate-400 truncate">
                        {lastWebhookStatus.message}
                      </p>
                    )}
                  </div>

                  {/* Views switcher */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Tryby Widoku</span>
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={onOpenWidgetMode}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-[11px] transition active:scale-95 cursor-pointer border border-slate-700"
                      >
                        Tryb Widgetu
                      </button>
                      <button
                        onClick={onOpenShareModal}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] transition active:scale-95 cursor-pointer border border-slate-700 flex items-center justify-center gap-1"
                      >
                        <QrCode className="w-3 h-3 text-amber-400" />
                        <span>QR na tel</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

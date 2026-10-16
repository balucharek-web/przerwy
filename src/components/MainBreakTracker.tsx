import React, { useState, useMemo, useEffect } from 'react';
import { 
  Coffee, 
  Square, 
  Play, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Bell, 
  Trash2, 
  MessageSquare, 
  Plus, 
  ChevronRight,
  RotateCcw,
  History,
  ChevronDown,
  Moon,
  X
} from 'lucide-react';
import { useBreaks } from '../context/BreakContext';
import { formatDuration, formatTimeOnly, formatDurationHuman, formatDateLabel, formatShortTime } from '../utils/dateUtils';
import { requestNotificationPermission } from '../utils/notificationControl';

interface MainBreakTrackerProps {
  onOpenCalendar: () => void;
  onOpenSettings: () => void;
  onOpenWidgetGuide: () => void;
}

export const MainBreakTracker: React.FC<MainBreakTrackerProps> = ({
  onOpenCalendar,
  onOpenSettings,
  onOpenWidgetGuide,
}) => {
  const {
    settings,
    activeBreak,
    currentBreakSeconds,
    todaySummary,
    startBreak,
    stopBreak,
    deleteBreak,
    updateBreak,
    addManualBreak,
    updateSettings,
  } = useBreaks();

  const [showManualModal, setShowManualModal] = useState(false);
  const [showCustomAdjustmentModal, setShowCustomAdjustmentModal] = useState(false);
  const [showCorrectionDetails, setShowCorrectionDetails] = useState(false);
  const [isOledMode, setIsOledMode] = useState(false);
  const [customSubtractMinutes, setCustomSubtractMinutes] = useState(5);
  const [manualStartTime, setManualStartTime] = useState('');
  const [manualEndTime, setManualEndTime] = useState('');
  const [manualNote, setManualNote] = useState('');

  // Screen Wake Lock for OLED Desk Mode to keep screen active
  useEffect(() => {
    let wakeLockSentinel: any = null;
    if (isOledMode && typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      (navigator as any).wakeLock.request('screen').then((lock: any) => {
        wakeLockSentinel = lock;
      }).catch(() => {});
    }
    return () => {
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, [isOledMode]);

  const handleStopWithAdjustment = (minutes: number) => {
    stopBreak(undefined, minutes);
    setShowCustomAdjustmentModal(false);
    setShowCorrectionDetails(false);
  };

  const isBreakActive = !!activeBreak;
  const { totalSeconds, allowanceSeconds, remainingSeconds, isOverLimit, breaks } = todaySummary;

  const percentUsed = Math.min(100, Math.round((totalSeconds / allowanceSeconds) * 100));
  const isWarningZone = remainingSeconds <= settings.warningMinutesBeforeEnd * 60 && remainingSeconds > 0;

  // Target wall-clock time when current break ends (or hypothetical return if starting now)
  const targetEndTime = useMemo(() => {
    if (remainingSeconds <= 0) return null;
    return new Date(Date.now() + remainingSeconds * 1000);
  }, [remainingSeconds]);

  // Ring circumference for SVG progress
  const radius = 115;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(percentUsed, 100) / 100) * circumference;

  const handleStart = () => {
    startBreak();
  };

  const handleStop = () => {
    stopBreak();
    setShowCorrectionDetails(false);
  };

  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualStartTime || !manualEndTime) return;

    // Convert HH:mm to ISO strings for today's date
    const today = new Date();
    const [startH, startM] = manualStartTime.split(':').map(Number);
    const [endH, endM] = manualEndTime.split(':').map(Number);

    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startH, startM);
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endH, endM);

    if (endDate <= startDate) {
      alert('Czas zakończenia musi być późniejszy niż czas rozpoczęcia!');
      return;
    }

    addManualBreak({
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      note: manualNote.trim() || 'Ręcznie dodana',
    });

    setShowManualModal(false);
    setManualStartTime('');
    setManualEndTime('');
    setManualNote('');
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-xl mx-auto">
      {/* Main Hero Card with Timer and Circular Progress */}
      <div className="relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center">
        {/* Glow decoration */}
        <div
          className={`absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
            isBreakActive
              ? 'bg-amber-500/20'
              : isOverLimit
              ? 'bg-rose-500/20'
              : 'bg-blue-500/10'
          }`}
        />

        {/* Circular Progress Display */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center my-2">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 260 260">
            {/* Background Track */}
            <circle
              cx="130"
              cy="130"
              r={radius}
              className="text-slate-800/70"
              strokeWidth="14"
              stroke="currentColor"
              fill="transparent"
            />
            {/* Progress Arc */}
            <circle
              cx="130"
              cy="130"
              r={radius}
              className={`transition-all duration-500 ease-out ${
                isOverLimit
                  ? 'text-rose-500'
                  : isWarningZone
                  ? 'text-amber-400 animate-pulse'
                  : 'text-amber-500'
              }`}
              strokeWidth="14"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>

          {/* Center Timer Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
            {isBreakActive ? (
              <>
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5 mb-1 animate-pulse">
                  <Coffee className="w-3.5 h-3.5" /> Ta przerwa
                </div>
                <div className="text-4xl sm:text-5xl font-mono font-extrabold text-white tracking-tight drop-shadow-md">
                  {formatDuration(currentBreakSeconds)}
                </div>

                {/* Target return time prominent display */}
                <div className="mt-2 text-xs flex flex-col items-center gap-0.5">
                  {remainingSeconds > 0 && targetEndTime ? (
                    <div className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Koniec przerwy: <strong className="font-mono text-white text-sm font-black">{formatShortTime(targetEndTime)}</strong></span>
                      <span className="text-[10px] text-amber-400/80">({formatDuration(remainingSeconds)})</span>
                    </div>
                  ) : (
                    <span className="text-rose-400 font-bold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-xs">
                      Przekroczono o {formatDuration(Math.abs(remainingSeconds))}!
                    </span>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Pozostały limit
                </div>
                <div
                  className={`text-4xl sm:text-5xl font-mono font-extrabold tracking-tight drop-shadow-md ${
                    isOverLimit ? 'text-rose-400' : 'text-slate-100'
                  }`}
                >
                  {formatDuration(remainingSeconds)}
                </div>
                <div className="mt-2 text-xs text-slate-400">
                  {remainingSeconds > 0 && targetEndTime ? (
                    <span className="text-[11px] text-slate-300 flex items-center gap-1">
                      <span>Jeśli wyjdziesz teraz: powrót o</span>
                      <strong className="text-amber-400 font-mono font-bold text-xs">{formatShortTime(targetEndTime)}</strong>
                    </span>
                  ) : (
                    <span>z limitu {settings.dailyAllowanceMinutes} min</span>
                  )}
                </div>
              </>
            )}

            {/* Warning Alarm pill indicator */}
            {isWarningZone && isBreakActive && (
              <div className="mt-3 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-semibold flex items-center gap-1.5 animate-bounce">
                <Bell className="w-3 h-3 text-amber-400" />
                <span>Alarm 3 min przed końcem!</span>
              </div>
            )}
            {isOverLimit && (
              <div className="mt-3 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span>Limit wykorzystany!</span>
              </div>
            )}
          </div>
        </div>

        {/* Big Action Button (START / STOP) */}
        <div className="w-full mt-4 flex flex-col gap-3">
          {!isBreakActive ? (
            <button
              onClick={handleStart}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-lg font-black tracking-wide shadow-lg shadow-amber-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              <Play className="w-6 h-6 fill-slate-950" />
              <span>ROZPOCZNIJ PRZERWĘ (START)</span>
            </button>
          ) : (
            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={handleStop}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-lg font-black tracking-wide shadow-lg shadow-rose-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer animate-pulse"
              >
                <Square className="w-6 h-6 fill-white" />
                <span>ZAKOŃCZ PRZERWĘ (STOP)</span>
              </button>

              {/* Subtelna, zwijana korekta czasu (nie zaśmieca widoku) */}
              <div className="flex flex-col items-center w-full">
                <button
                  type="button"
                  onClick={() => setShowCorrectionDetails(!showCorrectionDetails)}
                  className="mt-1 text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1.5 py-1 transition cursor-pointer select-none"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Zapomniałeś kliknąć Stop? Skoryguj czas</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showCorrectionDetails ? 'rotate-180' : ''}`} />
                </button>

                {showCorrectionDetails && (
                  <div className="w-full mt-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 flex flex-col gap-1.5 shadow-md animate-in fade-in">
                    <div className="flex items-center justify-between px-1 text-[11px]">
                      <span className="flex items-center gap-1 font-medium text-slate-300">
                        <History className="w-3.5 h-3.5 text-amber-400" />
                        <span>Wróciłeś wcześniej? Korekta czasu:</span>
                      </span>
                      <span className="text-[10px] text-slate-500">Zakończ z korektą</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStopWithAdjustment(5)}
                        className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 hover:border-amber-500/50 border border-slate-700 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer shadow-sm"
                        title="Zakończ przerwę i odejmij 5 minut (wróciłem 5 min temu)"
                      >
                        <RotateCcw className="w-3 h-3 shrink-0" />
                        <span>-5 min temu</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStopWithAdjustment(10)}
                        className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 hover:border-amber-500/50 border border-slate-700 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer shadow-sm"
                        title="Zakończ przerwę i odejmij 10 minut (wróciłem 10 min temu)"
                      >
                        <RotateCcw className="w-3 h-3 shrink-0" />
                        <span>-10 min temu</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCustomAdjustmentModal(true)}
                        className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 hover:border-slate-600 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer shadow-sm"
                        title="Podaj inną liczbę minut do odjęcia"
                      >
                        <Clock className="w-3 h-3 shrink-0 text-slate-400" />
                        <span>Inna...</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Lock screen & notification status */}
              <div className="w-full mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-center">
                {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (typeof window !== 'undefined' && 'Notification' in window) {
                        await Notification.requestPermission();
                        // re-render by dispatching dummy state
                        window.dispatchEvent(new Event('notification-permission-change'));
                      }
                    }}
                    className="w-full py-1.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Bell className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                    <span>Kliknij, aby włączyć dźwięki i wibracje po wygaszeniu ekranu</span>
                  </button>
                ) : (
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Licznik na ekranie blokady aktywny &bull; Dźwięk i wibracja w tle włączone</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Summary Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-3.5 text-center">
          <div className="text-[11px] uppercase font-semibold text-slate-400">Dzisiejsze przerwy</div>
          <div className="text-xl font-bold text-white mt-1">
            {breaks.length + (isBreakActive ? 1 : 0)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">sesje</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-3.5 text-center">
          <div className="text-[11px] uppercase font-semibold text-slate-400">Wykorzystano</div>
          <div className="text-xl font-bold text-amber-400 mt-1">
            {formatDuration(totalSeconds)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{percentUsed}% z limitu</div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-3.5 text-center">
          <div className="text-[11px] uppercase font-semibold text-slate-400">Pozostało</div>
          <div className={`text-xl font-bold mt-1 ${isOverLimit ? 'text-rose-400' : 'text-emerald-400'}`}>
            {formatDuration(remainingSeconds)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {isOverLimit ? 'przekroczenie' : 'dostępne'}
          </div>
        </div>
      </div>

      {/* Today's Break Sessions List */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Rejestr przerw z dzisiaj</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowManualModal(true)}
              className="text-xs flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Dodaj ręcznie</span>
            </button>
            <button
              onClick={onOpenCalendar}
              className="text-xs flex items-center gap-1 text-amber-400 hover:text-amber-300 px-2 py-1.5 rounded-lg transition"
            >
              <span>Kalendarz</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {breaks.length === 0 && !isBreakActive ? (
          <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
            <Coffee className="w-8 h-8 text-slate-700" />
            <span>Nie zarejestrowano jeszcze żadnej przerwy w bieżącym dniu.</span>
            <span className="text-[11px] text-slate-600">Kliknij przycisk START, kiedy udajesz się na przerwę.</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Active break row if currently running */}
            {isBreakActive && activeBreak && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <div>
                    <div className="font-bold text-amber-300 flex items-center gap-2">
                      <span>Przerwa w toku</span>
                      <span className="text-[10px] text-amber-400/80 font-normal">
                        od {formatTimeOnly(activeBreak.startTime)}
                      </span>
                    </div>
                    {activeBreak.note && (
                      <div className="text-[11px] text-slate-400 mt-0.5">{activeBreak.note}</div>
                    )}
                  </div>
                </div>
                <div className="font-mono font-bold text-amber-400 text-sm">
                  {formatDuration(currentBreakSeconds)}
                </div>
              </div>
            )}

            {/* List of completed breaks today */}
            {breaks.map((b, index) => (
              <div
                key={b.id}
                className="group flex items-center justify-between p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/40 transition text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center font-mono text-[11px] text-slate-400 font-bold">
                    #{breaks.length - index}
                  </div>
                  <div>
                    <div className="font-medium text-slate-200">
                      {formatTimeOnly(b.startTime)} — {b.endTime ? formatTimeOnly(b.endTime) : '...'}
                    </div>
                    {b.note ? (
                      <div className="text-[11px] text-slate-400 mt-0.5">{b.note}</div>
                    ) : (
                      <div className="text-[10px] text-slate-500">Sesja przerwy</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="font-mono font-bold text-slate-200 text-sm">
                    {formatDurationHuman(b.durationSeconds)}
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Czy na pewno chcesz usunąć ten wpis przerwy?')) {
                        deleteBreak(b.id);
                      }
                    }}
                    className="opacity-60 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1.5 transition"
                    title="Usuń wpis"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Custom Time Adjustment Modal ("Wróciłem X min temu") */}
      {showCustomAdjustmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Korekta czasu przerwy</h3>
                  <p className="text-[11px] text-slate-400">Zapomniałeś kliknąć Stop od razu?</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomAdjustmentModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80">
                <div className="text-slate-400 text-[11px]">Czas na liczniku:</div>
                <div className="text-xl font-mono font-bold text-white mt-0.5">
                  {formatDuration(currentBreakSeconds)}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Wróciłem do pracy ile minut temu:
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max={Math.max(1, Math.floor(currentBreakSeconds / 60) || 60)}
                    value={customSubtractMinutes}
                    onChange={(e) => setCustomSubtractMinutes(Math.max(1, Number(e.target.value)))}
                    className="w-24 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-slate-300">minut temu</span>
                </div>
                <div className="flex gap-1.5 mt-2.5">
                  {[2, 3, 5, 7, 10, 15].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setCustomSubtractMinutes(m)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition cursor-pointer ${
                        customSubtractMinutes === m
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      -{m}m
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200">
                💡 Czas zakończenia zostanie cofnięty o <strong>{customSubtractMinutes} min</strong>.
                Zapisana długość przerwy wyniesie ok. <strong>{formatDuration(Math.max(60, currentBreakSeconds - customSubtractMinutes * 60))}</strong>.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomAdjustmentModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={() => handleStopWithAdjustment(customSubtractMinutes)}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition cursor-pointer shadow-md shadow-rose-600/30"
                >
                  Zakończ i cofnij o {customSubtractMinutes}m
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Break Add Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative text-slate-200">
            <h3 className="text-base font-bold text-white mb-1">Dodaj przerwę ręcznie</h3>
            <p className="text-xs text-slate-400 mb-4">
              Wpisz godziny rozpoczęcia i zakończenia pominiętej przerwy.
            </p>

            <form onSubmit={handleSaveManual} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Godzina rozpoczęcia</label>
                <input
                  type="time"
                  required
                  value={manualStartTime}
                  onChange={(e) => setManualStartTime(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Godzina zakończenia</label>
                <input
                  type="time"
                  required
                  value={manualEndTime}
                  onChange={(e) => setManualEndTime(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Notatka (opcjonalnie)</label>
                <input
                  type="text"
                  placeholder="np. Kawa, obiad"
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition"
                >
                  Zapisz
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OLED Desk Mode (Pure Black, Extra Large Font, Battery Friendly) */}
      {isOledMode && (
        <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between p-6 select-none animate-in fade-in">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs uppercase tracking-widest font-mono text-slate-400">
                Tryb Biurkowy &bull; AMOLED Black
              </span>
            </div>
            <button
              onClick={() => setIsOledMode(false)}
              className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Zamknij</span>
            </button>
          </div>

          {/* Center Digital Display */}
          <div className="flex flex-col items-center justify-center my-auto text-center space-y-4">
            <div
              className={`px-3.5 py-1 rounded-full text-xs font-bold tracking-wider uppercase border ${
                isBreakActive
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/40 animate-pulse'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
              }`}
            >
              {isBreakActive ? 'Trwa przerwa w pracy' : 'W pracy / gotowość'}
            </div>

            <div className="font-mono text-7xl sm:text-9xl font-black text-amber-400 tracking-tight drop-shadow-2xl">
              {isBreakActive ? formatDuration(currentBreakSeconds) : formatDuration(remainingSeconds)}
            </div>

            <div className="text-sm sm:text-base text-slate-400 flex flex-col items-center gap-1">
              {isBreakActive ? (
                remainingSeconds > 0 && targetEndTime ? (
                  <div className="flex items-center gap-2 text-amber-300 font-semibold text-base sm:text-lg">
                    <Clock className="w-5 h-5 text-amber-400" />
                    <span>Wróć do pracy o: <strong className="font-mono text-white text-xl font-black">{formatShortTime(targetEndTime)}</strong></span>
                    <span className="text-slate-500 text-xs">({formatDuration(remainingSeconds)})</span>
                  </div>
                ) : (
                  <span className="text-rose-400 font-bold text-base animate-pulse">
                    Limit przekroczony o {formatDuration(Math.abs(remainingSeconds))}!
                  </span>
                )
              ) : (
                remainingSeconds > 0 && targetEndTime ? (
                  <div className="text-slate-400 text-xs flex items-center gap-1">
                    <span>Jeśli pójdziesz teraz: powrót o</span>
                    <strong className="text-amber-400 font-mono text-sm">{formatShortTime(targetEndTime)}</strong>
                  </div>
                ) : (
                  <span className="text-slate-500 text-xs">Brak dostępnego limitu na dziś</span>
                )
              )}
            </div>
          </div>

          {/* Bottom Action Button */}
          <div className="w-full max-w-md mx-auto space-y-3">
            {!isBreakActive ? (
              <button
                onClick={handleStart}
                className="w-full py-5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xl tracking-wider shadow-lg shadow-amber-500/25 flex items-center justify-center gap-3 transition active:scale-95 cursor-pointer"
              >
                <Play className="w-7 h-7 fill-slate-950" />
                <span>ROZPOCZNIJ PRZERWĘ</span>
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={handleStop}
                  className="w-full py-5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xl tracking-wider shadow-lg shadow-rose-600/30 flex items-center justify-center gap-3 transition active:scale-95 cursor-pointer animate-pulse"
                >
                  <Square className="w-7 h-7 fill-white" />
                  <span>ZAKOŃCZ PRZERWĘ</span>
                </button>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => handleStopWithAdjustment(5)}
                    className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-amber-300 text-xs font-semibold hover:bg-neutral-800 transition cursor-pointer"
                  >
                    -5m temu
                  </button>
                  <button
                    onClick={() => handleStopWithAdjustment(10)}
                    className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-amber-300 text-xs font-semibold hover:bg-neutral-800 transition cursor-pointer"
                  >
                    -10m temu
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

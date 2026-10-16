import React, { useState } from 'react';
import { 
  Coffee, 
  Square, 
  Play, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Bell, 
  Send, 
  Trash2, 
  MessageSquare, 
  Plus, 
  ChevronRight,
  RotateCcw,
  History
} from 'lucide-react';
import { useBreaks } from '../context/BreakContext';
import { formatDuration, formatTimeOnly, formatDurationHuman, formatDateLabel } from '../utils/dateUtils';
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
    addManualBreak,
    lastWebhookStatus,
    updateSettings,
  } = useBreaks();

  const [noteInput, setNoteInput] = useState('');
  const [showManualModal, setShowManualModal] = useState(false);
  const [showCustomAdjustmentModal, setShowCustomAdjustmentModal] = useState(false);
  const [customSubtractMinutes, setCustomSubtractMinutes] = useState(5);
  const [manualStartTime, setManualStartTime] = useState('');
  const [manualEndTime, setManualEndTime] = useState('');
  const [manualNote, setManualNote] = useState('');

  const handleStopWithAdjustment = (minutes: number) => {
    stopBreak(noteInput.trim() || undefined, minutes);
    setNoteInput('');
    setShowCustomAdjustmentModal(false);
  };

  const isBreakActive = !!activeBreak;
  const { totalSeconds, allowanceSeconds, remainingSeconds, isOverLimit, breaks } = todaySummary;

  const percentUsed = Math.min(100, Math.round((totalSeconds / allowanceSeconds) * 100));
  const isWarningZone = remainingSeconds <= settings.warningMinutesBeforeEnd * 60 && remainingSeconds > 0;

  // Ring circumference for SVG progress
  const radius = 115;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(percentUsed, 100) / 100) * circumference;

  const handleStart = () => {
    startBreak(noteInput.trim() || undefined);
    setNoteInput('');
  };

  const handleStop = () => {
    stopBreak(noteInput.trim() || undefined);
    setNoteInput('');
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
      {/* Top Status & Date Header */}
      <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div
            className={`w-3.5 h-3.5 rounded-full ${
              isBreakActive
                ? 'bg-amber-400 animate-ping'
                : 'bg-emerald-400'
            }`}
          />
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">
              Stan obecny
            </div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              {isBreakActive ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <Coffee className="w-4 h-4 inline" /> Trwa przerwa
                </span>
              ) : (
                <span className="text-emerald-400">W pracy / gotowość</span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-400">Reset limitu o {settings.resetHour}</div>
          <div className="text-xs font-medium text-slate-300">
            {new Date().toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })}
          </div>
        </div>
      </div>

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
                <div className="mt-2 text-xs text-slate-400">
                  {remainingSeconds >= 0 ? (
                    <span>
                      Pozostało dzisiaj: <strong className={isWarningZone ? 'text-amber-400 font-bold' : 'text-slate-200'}>{formatDuration(remainingSeconds)}</strong>
                    </span>
                  ) : (
                    <span className="text-rose-400 font-bold">
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
                  z limitu {settings.dailyAllowanceMinutes} min
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

              {/* Szybka korekta: Zapomniałem kliknąć Stop */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 flex flex-col gap-1.5 shadow-md">
                <div className="flex items-center justify-between px-1 text-[11px]">
                  <span className="flex items-center gap-1 font-medium text-slate-300">
                    <History className="w-3.5 h-3.5 text-amber-400" />
                    <span>Wróciłeś wcześniej? Korekta czasu:</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Odejmij czas</span>
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
            </div>
          )}

          {/* Note input when active or before starting */}
          <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2 text-xs">
            <MessageSquare className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder={isBreakActive ? 'Dodaj notatkę do tej przerwy (np. obiad, spacer)...' : 'Opcjonalna notatka przed startem...'}
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              className="w-full bg-transparent text-slate-200 placeholder-slate-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Google Chat Webhook Status Feedback */}
        {settings.googleChatWebhookUrl ? (
          <div className="w-full mt-4 flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/40 border border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <Send className="w-3.5 h-3.5 text-blue-400" />
              <span>Google Chat:</span>
              <span className="text-slate-300 font-medium truncate max-w-[150px]">
                {settings.googleChatUserName || 'Webhook'}
              </span>
            </div>
            {lastWebhookStatus.status === 'sending' && (
              <span className="text-amber-400 animate-pulse text-[11px]">Wysyłanie...</span>
            )}
            {lastWebhookStatus.status === 'success' && (
              <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="w-3 h-3" /> Wysłano
              </span>
            )}
            {lastWebhookStatus.status === 'error' && (
              <span className="text-rose-400 flex items-center gap-1 text-[11px]" title={lastWebhookStatus.message}>
                <AlertTriangle className="w-3 h-3" /> Błąd wysyłki
              </span>
            )}
            {lastWebhookStatus.status === 'idle' && (
              <span className="text-slate-500 text-[11px]">Aktywny</span>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenSettings}
            className="w-full mt-4 text-xs text-slate-400 hover:text-amber-400 flex items-center justify-center gap-1.5 py-1.5 transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kliknij, aby podpiąć webhook Google Chat</span>
          </button>
        )}
      </div>

      {/* Notification Bar Controls Card (Option 1) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-start sm:items-center gap-3">
          <div className={`p-2.5 rounded-xl shrink-0 ${settings.notificationBarControlsEnabled !== false ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-500'}`}>
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-xs">Pasek powiadomień ze sterowaniem START/STOP</span>
              {settings.notificationBarControlsEnabled !== false ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                  Aktywne
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">
                  Wyłączone
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Steruj przerwą bezpośrednio z wysuwanego paska Androida i ekranu blokady bez wchodzenia do aplikacji.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={async () => {
            const newState = settings.notificationBarControlsEnabled === false;
            if (newState) {
              await requestNotificationPermission();
            }
            updateSettings({ notificationBarControlsEnabled: newState });
          }}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
            settings.notificationBarControlsEnabled !== false
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
          }`}
        >
          {settings.notificationBarControlsEnabled !== false ? 'Wyłącz' : 'Włącz przyciski'}
        </button>
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
    </div>
  );
};

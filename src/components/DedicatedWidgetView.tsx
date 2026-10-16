import React from 'react';
import { Coffee, Play, Square, ArrowLeft, Clock, Send, CheckCircle2, AlertTriangle, Bell } from 'lucide-react';
import { useBreaks } from '../context/BreakContext';
import { formatDuration } from '../utils/dateUtils';

interface DedicatedWidgetViewProps {
  onBackToApp: () => void;
}

export const DedicatedWidgetView: React.FC<DedicatedWidgetViewProps> = ({ onBackToApp }) => {
  const {
    activeBreak,
    currentBreakSeconds,
    todaySummary,
    startBreak,
    stopBreak,
    settings,
    lastWebhookStatus,
  } = useBreaks();

  const isBreakActive = !!activeBreak;
  const { totalSeconds, allowanceSeconds, remainingSeconds, isOverLimit } = todaySummary;
  const isWarningZone = remainingSeconds <= settings.warningMinutesBeforeEnd * 60 && remainingSeconds > 0;

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
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-xl transition"
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

        {/* Chat Webhook Status Feedback */}
        {settings.googleChatWebhookUrl ? (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <Send className="w-3 h-3 text-blue-400" />
              <span>Google Chat:</span>
            </span>
            {lastWebhookStatus.status === 'sending' && (
              <span className="text-amber-400 font-bold animate-pulse">Wysyłanie...</span>
            )}
            {lastWebhookStatus.status === 'success' && (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Wysłano
              </span>
            )}
            {lastWebhookStatus.status === 'error' && (
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Błąd
              </span>
            )}
            {lastWebhookStatus.status === 'idle' && (
              <span className="text-slate-500">
                Wysyła: "{settings.simpleChatMessages ? 'start' : 'raport'}" i "{settings.simpleChatMessages ? 'stop' : 'raport'}"
              </span>
            )}
          </div>
        ) : null}

        {/* Home screen tip */}
        <div className="text-[10px] text-slate-500 text-center">
          💡 Ten widok możesz dodać do ekranu głównego jako 1 widget z obydwoma klawiszami.
        </div>
      </div>
    </div>
  );
};

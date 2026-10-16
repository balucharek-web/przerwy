import React from 'react';
import { Coffee, Play, Square, Maximize2, AlertTriangle } from 'lucide-react';
import { useBreaks } from '../context/BreakContext';
import { formatDuration } from '../utils/dateUtils';

interface FloatingMiniWidgetProps {
  onExpand: () => void;
}

export const FloatingMiniWidget: React.FC<FloatingMiniWidgetProps> = ({ onExpand }) => {
  const { activeBreak, currentBreakSeconds, todaySummary, startBreak, stopBreak, settings } = useBreaks();

  const isBreakActive = !!activeBreak;
  const { remainingSeconds, isOverLimit } = todaySummary;
  const isWarningZone = remainingSeconds <= settings.warningMinutesBeforeEnd * 60 && remainingSeconds > 0;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-subtle">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-2xl rounded-2xl p-3 flex items-center gap-3.5 text-slate-100 ring-1 ring-white/10">
        {/* Status indicator icon */}
        <div
          className={`p-2.5 rounded-xl flex items-center justify-center transition-colors ${
            isBreakActive
              ? 'bg-amber-500/20 text-amber-400 animate-pulse'
              : isOverLimit
              ? 'bg-rose-500/20 text-rose-400'
              : 'bg-slate-800 text-slate-300'
          }`}
        >
          <Coffee className="w-5 h-5" />
        </div>

        {/* Timer display */}
        <div className="flex flex-col">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            {isBreakActive ? (
              <span className="text-amber-400">Przerwa w toku</span>
            ) : (
              <span>Pozostało</span>
            )}
            {isWarningZone && <AlertTriangle className="w-3 h-3 text-amber-400 animate-bounce" />}
          </div>
          <div
            className={`font-mono font-extrabold text-base tracking-tight ${
              isOverLimit ? 'text-rose-400' : 'text-white'
            }`}
          >
            {isBreakActive
              ? formatDuration(currentBreakSeconds)
              : formatDuration(remainingSeconds)}
          </div>
        </div>

        {/* 1-Tap Action button */}
        <div className="flex items-center gap-1.5 pl-1 border-l border-slate-800">
          {!isBreakActive ? (
            <button
              onClick={() => startBreak('MiniWidget')}
              className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md shadow-amber-500/20 transition active:scale-95 cursor-pointer"
              title="Rozpocznij przerwę"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>START</span>
            </button>
          ) : (
            <button
              onClick={() => stopBreak()}
              className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-rose-600/20 transition active:scale-95 cursor-pointer"
              title="Zakończ przerwę"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>STOP</span>
            </button>
          )}

          <button
            onClick={onExpand}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="Rozwiń do pełnej aplikacji"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

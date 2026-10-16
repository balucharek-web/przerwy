import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Plus, 
  Coffee,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { useBreaks } from '../context/BreakContext';
import { formatDuration, formatTimeOnly, formatDurationHuman, formatDateLabel, getDayKey } from '../utils/dateUtils';
import { BreakRecord } from '../types';

export const BreakCalendar: React.FC = () => {
  const { breaks, settings, deleteBreak, addManualBreak } = useBreaks();

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDayKey, setSelectedDayKey] = useState<string>(() => {
    return getDayKey(new Date(), settings.resetHour);
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [addStartTime, setAddStartTime] = useState('12:00');
  const [addEndTime, setAddEndTime] = useState('12:15');
  const [addNote, setAddNote] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const jumpToToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDayKey(getDayKey(now, settings.resetHour));
  };

  // Build grid for current month
  // Monday as first day of week in Polish locale
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const totalDaysInMonth = lastDayOfMonth.getDate();
    // getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
    let startDayOfWeek = firstDayOfMonth.getDay();
    // Convert to Monday=0, Sunday=6
    const mondayOffset = (startDayOfWeek + 6) % 7;

    const days: { date: Date; dayKey: string; isCurrentMonth: boolean }[] = [];

    // Prev month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = mondayOffset - 1; i >= 0; i--) {
      const padDate = new Date(year, month - 1, prevMonthLastDay - i);
      const dayKey = `${padDate.getFullYear()}-${String(padDate.getMonth() + 1).padStart(2, '0')}-${String(padDate.getDate()).padStart(2, '0')}`;
      days.push({ date: padDate, dayKey, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const date = new Date(year, month, d);
      const dayKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ date, dayKey, isCurrentMonth: true });
    }

    // Next month padding to fill complete weeks
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let n = 1; n <= remaining; n++) {
        const nextDate = new Date(year, month + 1, n);
        const dayKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
        days.push({ date: nextDate, dayKey, isCurrentMonth: false });
      }
    }

    return days;
  }, [year, month]);

  // Group all breaks by dayKey
  const breaksByDayKey = useMemo(() => {
    const map = new Map<string, BreakRecord[]>();
    for (const b of breaks) {
      const list = map.get(b.dayKey) || [];
      list.push(b);
      map.set(b.dayKey, list);
    }
    return map;
  }, [breaks]);

  // Selected day data
  const selectedDayBreaks = useMemo(() => {
    return breaksByDayKey.get(selectedDayKey) || [];
  }, [breaksByDayKey, selectedDayKey]);

  const selectedDayTotalSeconds = useMemo(() => {
    return selectedDayBreaks.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0);
  }, [selectedDayBreaks]);

  const dailyAllowanceSec = settings.dailyAllowanceMinutes * 60;
  const isSelectedDayOver = selectedDayTotalSeconds > dailyAllowanceSec;

  // Monthly stats
  const monthlyStats = useMemo(() => {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    let monthTotalSeconds = 0;
    let daysWithBreaks = 0;
    let daysOverLimit = 0;
    let totalBreakSessions = 0;

    for (const [key, records] of breaksByDayKey.entries()) {
      if (key.startsWith(monthPrefix) && records.length > 0) {
        daysWithBreaks++;
        totalBreakSessions += records.length;
        const daySum = records.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0);
        monthTotalSeconds += daySum;
        if (daySum > dailyAllowanceSec) {
          daysOverLimit++;
        }
      }
    }

    const avgDailySeconds = daysWithBreaks > 0 ? Math.round(monthTotalSeconds / daysWithBreaks) : 0;

    return {
      monthTotalSeconds,
      daysWithBreaks,
      daysOverLimit,
      totalBreakSessions,
      avgDailySeconds,
    };
  }, [breaksByDayKey, year, month, dailyAllowanceSec]);

  const handleAddManualToSelected = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addStartTime || !addEndTime) return;

    const [y, m, d] = selectedDayKey.split('-').map(Number);
    const [startH, startM] = addStartTime.split(':').map(Number);
    const [endH, endM] = addEndTime.split(':').map(Number);

    const startDate = new Date(y, m - 1, d, startH, startM);
    const endDate = new Date(y, m - 1, d, endH, endM);

    if (endDate <= startDate) {
      alert('Godzina zakończenia musi być późniejsza niż godzina rozpoczęcia!');
      return;
    }

    addManualBreak({
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      note: addNote.trim() || 'Dodana w kalendarzu',
    });

    setShowAddModal(false);
    setAddNote('');
  };

  const monthNamesPl = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
  ];

  const weekDayHeaders = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
  const todayKey = getDayKey(new Date(), settings.resetHour);

  const handleExportMonthCSV = () => {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthBreaks = breaks.filter((b) => b.dayKey.startsWith(monthPrefix));
    if (monthBreaks.length === 0) {
      alert('Brak zarejestrowanych przerw w tym miesiącu.');
      return;
    }

    const sorted = [...monthBreaks].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    let csv = 'Data;Od;Do;Czas trwania (min);Czas trwania (sek);Notatka\r\n';
    for (const b of sorted) {
      const datePart = b.dayKey;
      const startPart = formatTimeOnly(b.startTime);
      const endPart = b.endTime ? formatTimeOnly(b.endTime) : '-';
      const durationMin = (b.durationSeconds / 60).toFixed(1);
      const notePart = (b.note || '').replace(/;/g, ',');
      csv += `${datePart};${startPart};${endPart};${durationMin};${b.durationSeconds};${notePart}\r\n`;
    }

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `przerwy_${year}_${String(month + 1).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-xl mx-auto">
      {/* Month Navigation & Controls */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-white capitalize">
            {monthNamesPl[month]} {year}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportMonthCSV}
            className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 transition flex items-center gap-1 border border-slate-700/80 cursor-pointer"
            title="Eksportuj przerwy z tego miesiąca do pliku CSV (Excel)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Eksport CSV</span>
          </button>
          <button
            onClick={jumpToToday}
            className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            Dzisiaj
          </button>
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Poprzedni miesiąc"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Następny miesiąc"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Monthly Statistics Summary */}
      <div className="grid grid-cols-4 gap-2.5">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 text-center">
          <div className="text-[10px] uppercase font-semibold text-slate-400">Dni pracy</div>
          <div className="text-base font-bold text-white mt-0.5">{monthlyStats.daysWithBreaks}</div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 text-center">
          <div className="text-[10px] uppercase font-semibold text-slate-400">Łącznie</div>
          <div className="text-base font-bold text-amber-400 mt-0.5">
            {formatDuration(monthlyStats.monthTotalSeconds, true)}
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 text-center">
          <div className="text-[10px] uppercase font-semibold text-slate-400">Średnia / dzień</div>
          <div className="text-base font-bold text-slate-200 mt-0.5">
            {formatDuration(monthlyStats.avgDailySeconds)}
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 text-center">
          <div className="text-[10px] uppercase font-semibold text-slate-400">Przekroczenia</div>
          <div className={`text-base font-bold mt-0.5 ${monthlyStats.daysOverLimit > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {monthlyStats.daysOverLimit}
          </div>
        </div>
      </div>

      {/* Calendar Grid Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1.5 mb-2 text-center text-[11px] font-semibold text-slate-400 uppercase">
          {weekDayHeaders.map((dh, i) => (
            <div key={i} className={i >= 5 ? 'text-amber-400/60' : ''}>
              {dh}
            </div>
          ))}
        </div>

        {/* Days cells */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((cell) => {
            const dayBreaks = breaksByDayKey.get(cell.dayKey) || [];
            const hasBreaks = dayBreaks.length > 0;
            const dayTotalSec = dayBreaks.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0);
            const isOver = dayTotalSec > dailyAllowanceSec;
            const isSelected = cell.dayKey === selectedDayKey;
            const isToday = cell.dayKey === todayKey;

            return (
              <button
                key={cell.dayKey}
                onClick={() => setSelectedDayKey(cell.dayKey)}
                className={`relative min-h-[60px] sm:min-h-[70px] p-1.5 rounded-xl flex flex-col justify-between items-start transition-all cursor-pointer border text-left ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/15 shadow-md shadow-amber-500/10'
                    : isToday
                    ? 'border-blue-500/70 bg-blue-500/10'
                    : 'border-slate-800/80 bg-slate-900/50 hover:bg-slate-800/60'
                } ${!cell.isCurrentMonth ? 'opacity-35' : 'opacity-100'}`}
              >
                {/* Day number & today marker */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs font-bold ${
                      isToday
                        ? 'text-blue-400 underline underline-offset-2'
                        : isSelected
                        ? 'text-amber-300'
                        : 'text-slate-300'
                    }`}
                  >
                    {cell.date.getDate()}
                  </span>
                  {hasBreaks && (
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold ${
                        isOver
                          ? 'bg-rose-500/30 text-rose-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {dayBreaks.length}x
                    </span>
                  )}
                </div>

                {/* Day break duration badge */}
                {hasBreaks ? (
                  <div className="w-full mt-1">
                    <div
                      className={`text-[10px] font-mono font-bold truncate ${
                        isOver ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {formatDuration(dayTotalSec)}
                    </div>
                    {/* Small progress line */}
                    <div className="w-full bg-slate-800 h-1 rounded-full mt-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isOver ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                        style={{
                          width: `${Math.min(100, (dayTotalSec / dailyAllowanceSec) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-600 mt-auto">—</div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>W normie (do {settings.dailyAllowanceMinutes} min)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Przekroczony limit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-blue-400" />
            <span>Dzisiaj</span>
          </div>
        </div>
      </div>

      {/* Selected Day Details Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Szczegóły wybranego dnia
            </div>
            <h3 className="text-base font-bold text-white capitalize mt-0.5">
              {formatDateLabel(selectedDayKey)}
            </h3>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Dodaj przerwę</span>
          </button>
        </div>

        {/* Selected day total banner */}
        <div className="grid grid-cols-3 gap-3 my-4">
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Łączny czas</div>
            <div className={`text-lg font-bold font-mono mt-0.5 ${isSelectedDayOver ? 'text-rose-400' : 'text-amber-400'}`}>
              {formatDuration(selectedDayTotalSeconds)}
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Limit dzienny</div>
            <div className="text-lg font-bold font-mono text-slate-200 mt-0.5">
              {settings.dailyAllowanceMinutes}:00
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Bilans</div>
            <div className={`text-lg font-bold font-mono mt-0.5 ${isSelectedDayOver ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isSelectedDayOver
                ? `+${formatDuration(selectedDayTotalSeconds - dailyAllowanceSec)}`
                : `-${formatDuration(dailyAllowanceSec - selectedDayTotalSeconds)}`}
            </div>
          </div>
        </div>

        {/* Breaks list for selected day */}
        {selectedDayBreaks.length === 0 ? (
          <div className="py-6 text-center text-slate-500 text-xs flex flex-col items-center gap-1.5">
            <Coffee className="w-6 h-6 text-slate-700" />
            <span>Brak zarejestrowanych przerw w tym dniu.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedDayBreaks.map((b, index) => (
              <div
                key={b.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-slate-400">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-200">
                      {formatTimeOnly(b.startTime)} — {b.endTime ? formatTimeOnly(b.endTime) : 'w trakcie'}
                    </div>
                    {b.note && <div className="text-[11px] text-slate-400 mt-0.5">{b.note}</div>}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-amber-400">
                    {formatDurationHuman(b.durationSeconds)}
                  </span>
                  <button
                    onClick={() => {
                      if (confirm('Usunąć ten wpis?')) {
                        deleteBreak(b.id);
                      }
                    }}
                    className="text-slate-500 hover:text-rose-400 p-1.5 transition"
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

      {/* Manual Add Break to Selected Day Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative text-slate-200">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-1">Dodaj przerwę do dnia</h3>
            <p className="text-xs text-slate-400 mb-4 capitalize">
              {formatDateLabel(selectedDayKey)}
            </p>

            <form onSubmit={handleAddManualToSelected} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Godzina rozpoczęcia</label>
                <input
                  type="time"
                  required
                  value={addStartTime}
                  onChange={(e) => setAddStartTime(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Godzina zakończenia</label>
                <input
                  type="time"
                  required
                  value={addEndTime}
                  onChange={(e) => setAddEndTime(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Notatka (opcjonalnie)</label>
                <input
                  type="text"
                  placeholder="np. Lunch, spacer"
                  value={addNote}
                  onChange={(e) => setAddNote(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition"
                >
                  Dodaj wpis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

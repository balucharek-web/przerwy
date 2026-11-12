import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  Volume1,
  Volume2, 
  VolumeX, 
  Bell, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Download, 
  Upload, 
  User, 
  Trash2,
  ExternalLink,
  Smartphone,
  Lock,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ShieldCheck,
  Info,
  Cloud,
  CalendarPlus,
  FileSpreadsheet,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useBreaks } from '../context/BreakContext';
import { sendSystemNotification } from '../utils/audioAlert';
import { isVibrationSupported } from '../utils/vibrationService';
import { addBreakToAndroidCalendar } from '../utils/calendarService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    settings,
    updateSettings,
    testWebhook,
    testSoundAlarm,
    testVibration,
    clearTodayBreaks,
    clearAllHistory,
    exportDataJSON,
    importDataJSON,
    googleUser,
    isGoogleSyncing,
    lastGoogleSyncTime,
    signInGoogle,
    signOutGoogle,
    manualGoogleSync,
    authError,
    clearAuthError,
    isSheetsSyncing,
    lastSheetsSyncTime,
    sheetsSyncStatus,
    syncFromGoogleSheets,
    testGoogleSheets,
  } = useBreaks();

  const [userName, setUserName] = useState(settings.googleChatUserName);
  const [dailyAllowance, setDailyAllowance] = useState(settings.dailyAllowanceMinutes);
  const [warningMinutes, setWarningMinutes] = useState(settings.warningMinutesBeforeEnd);
  const [resetHour, setResetHour] = useState(settings.resetHour);
  const [soundAlerts, setSoundAlerts] = useState(settings.soundAlertsEnabled);
  const [alarmVolume, setAlarmVolume] = useState(settings.alarmVolume ?? 80);
  const [browserNotifications, setBrowserNotifications] = useState(settings.browserNotificationsEnabled);
  const [simpleChatMessages, setSimpleChatMessages] = useState(settings.simpleChatMessages ?? true);
  const [startMessageText, setStartMessageText] = useState(settings.startMessageText || 'start');
  const [stopMessageText, setStopMessageText] = useState(settings.stopMessageText || 'stop');
  const [includeNameInSimpleMessage, setIncludeNameInSimpleMessage] = useState(settings.includeNameInSimpleMessage !== false);
  const [notificationBarControls, setNotificationBarControls] = useState(settings.notificationBarControlsEnabled ?? true);
  const [notificationBarOnlyDuringBreak, setNotificationBarOnlyDuringBreak] = useState(settings.notificationBarOnlyDuringBreak ?? true);
  const [notificationBarTitleStyle, setNotificationBarTitleStyle] = useState<'return_only' | 'countdown_and_return' | 'countdown_only' | 'minutes_and_return'>(settings.notificationBarTitleStyle ?? 'return_only');

  const [vibrateEnabled, setVibrateEnabled] = useState(settings.vibrateEnabled ?? true);
  const [vibrationIntensity, setVibrationIntensityState] = useState<'turbo' | 'strong' | 'light'>(settings.vibrationIntensity ?? 'turbo');
  const [countdownVibrationEnabled, setCountdownVibrationEnabled] = useState(settings.countdownVibrationEnabled ?? true);
  const [vibrateOnlyWhenScreenLocked, setVibrateOnlyWhenScreenLocked] = useState(settings.vibrateOnlyWhenScreenLocked ?? true);
  const [countdownVibrationIntervalMinutes, setCountdownVibrationIntervalMinutes] = useState(settings.countdownVibrationIntervalMinutes ?? 1);

  const [keepScreenAwake, setKeepScreenAwake] = useState(settings.keepScreenAwakeDuringBreak ?? false);
  const [appBadgeEnabled, setAppBadgeEnabled] = useState(settings.appBadgeEnabled !== false);
  const [autoAddToCalendar, setAutoAddToCalendar] = useState(settings.autoAddToCalendar ?? false);
  const [testLockCountdown, setTestLockCountdown] = useState<number | null>(null);
  const [vibrationTestState, setVibrationTestState] = useState<'idle' | 'vibrating' | 'sys-vibrating' | 'unsupported'>('idle');
  const [showVibrationGuide, setShowVibrationGuide] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [testWebhookResult, setTestWebhookResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);

  // Google Sheets state
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState(settings.googleSheetsUrl || '');
  const [showSheetsGuide, setShowSheetsGuide] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [testSheetsResult, setTestSheetsResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingSheets, setIsTestingSheets] = useState(false);

  const handleTestSystemVibration = async () => {
    setVibrationTestState('sys-vibrating');
    await sendSystemNotification('🔔 Test wibracji systemowej', {
      body: 'Wibracja systemowa Androida (taka sama jak w SMS i WhatsApp)',
      tag: 'test-sys-vibration',
      renotify: true,
      vibrate: [400, 150, 400],
      requireInteraction: false,
    });
    setTimeout(() => setVibrationTestState('idle'), 2500);
  };

  const handleTestGoogleChat = async () => {
    setIsTestingWebhook(true);
    setTestWebhookResult(null);
    try {
      const log = await testWebhook();
      setTestWebhookResult({
        status: log.status,
        message: log.message,
      });
    } catch (err: any) {
      setTestWebhookResult({
        status: 'error',
        message: err?.message || 'Błąd wysyłania testu na czat',
      });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handleTestGoogleSheets = async () => {
    setIsTestingSheets(true);
    setTestSheetsResult(null);
    try {
      const urlToTest = googleSheetsUrl.trim();
      const res = await testGoogleSheets(urlToTest);
      if (res.correctedUrl) {
        setGoogleSheetsUrl(res.correctedUrl);
      }
      setTestSheetsResult(res);
    } catch (err: any) {
      setTestSheetsResult({ success: false, message: err?.message || 'Błąd testowania połączenia z Arkuszem.' });
    } finally {
      setIsTestingSheets(false);
    }
  };

  const handleSyncFromSheets = async () => {
    if (googleSheetsUrl.trim() !== settings.googleSheetsUrl) {
      updateSettings({ googleSheetsUrl: googleSheetsUrl.trim() });
    }
    await syncFromGoogleSheets(true);
  };

  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSaveAll = () => {
    updateSettings({
      googleChatUserName: userName.trim() || 'Pracownik',
      dailyAllowanceMinutes: Number(dailyAllowance) || 30,
      warningMinutesBeforeEnd: Number(warningMinutes) || 3,
      resetHour: resetHour || '00:00',
      soundAlertsEnabled: soundAlerts,
      alarmVolume: Number(alarmVolume),
      browserNotificationsEnabled: browserNotifications,
      vibrateEnabled,
      vibrationIntensity,
      countdownVibrationEnabled,
      vibrateOnlyWhenScreenLocked,
      countdownVibrationIntervalMinutes: Number(countdownVibrationIntervalMinutes) || 1,
      simpleChatMessages,
      startMessageText: startMessageText.trim() || 'start',
      stopMessageText: stopMessageText.trim() || 'stop',
      includeNameInSimpleMessage,
      notificationBarControlsEnabled: notificationBarControls,
      notificationBarOnlyDuringBreak,
      notificationBarTitleStyle,
      keepScreenAwakeDuringBreak: keepScreenAwake,
      pocketLockEnabled: false,
      appBadgeEnabled,
      autoAddToCalendar,
      googleSheetsUrl: googleSheetsUrl.trim(),
    });

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 600);
  };

  const handleRequestNotificationPermission = async () => {
    const granted = await sendSystemNotification('PrzerwaPro: Powiadomienia aktywne', {
      body: 'Będziesz otrzymywać powiadomienia o alarmach przerw.',
    });
    if (granted) {
      setBrowserNotifications(true);
      updateSettings({ browserNotificationsEnabled: true });
    } else {
      alert('Nie udało się włączyć powiadomień. Sprawdź ustawienia uprawnień strony w przeglądarce.');
    }
  };

  const handleExport = () => {
    const json = exportDataJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `przerwapro_kopia_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importDataJSON(content);
      if (success) {
        alert('Dane i ustawienia zostały pomyślnie zaimportowane!');
        onClose();
      } else {
        alert('Błąd importu pliku JSON. Niepoprawny format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative text-slate-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Ustawienia PrzerwaPro</h3>
              <p className="text-xs text-slate-400">Limity, alarm dźwiękowy, reset i Google Chat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto py-4 space-y-6 text-xs flex-1 pr-1">
          {/* Section: Google Account & Cloud Backup (100% odporność na czyszczenie telefonu) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/30 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    Kopia zapasowa na Dysku Google
                    <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full font-normal border border-blue-500/30">
                      Prywatna chmura
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Chroni historię i ustawienia przed czyszczeniem pamięci telefonu
                  </p>
                </div>
              </div>

              {googleUser ? (
                <button
                  type="button"
                  onClick={signOutGoogle}
                  className="text-[10px] text-slate-400 hover:text-rose-400 transition underline cursor-pointer"
                >
                  Wyloguj
                </button>
              ) : null}
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-[11px] space-y-2 animate-in fade-in">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-rose-300 block">Problem z logowaniem:</span>
                      <p className="leading-relaxed mt-0.5 text-rose-200">{authError}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearAuthError}
                    className="text-rose-400 hover:text-white p-1"
                    title="Zamknij powiadomienie"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="pt-1.5 border-t border-rose-500/20 text-[10px] text-slate-300 space-y-1.5">
                  {authError.includes('Autoryzowane domeny') ? (
                    <div className="space-y-1.5">
                      <p className="font-semibold text-amber-300">🔑 Jednorazowa akcja (zajmie 10 sekund):</p>
                      <p className="text-slate-200">
                        Firebase ze względów bezpieczeństwa wymaga dodania adresu Twojej strony do listy dozwolonych:
                      </p>
                      <a
                        href="https://console.firebase.google.com/project/kingsgroomer-1272/authentication/settings"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow-sm"
                      >
                        <span>Otwórz Autoryzowane Domeny w Firebase</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <p className="text-slate-300 pt-1">
                        Kliknij <strong>„Dodaj domenę”</strong> i wpisz: <strong className="text-white font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-700">balucharek-web.github.io</strong>
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold text-amber-300">💡 Profil służbowy Androida (ikonka teczki 💼):</p>
                      <p>
                        Profil służbowy jest izolowany i chroniony przez politykę firmy. Często blokuje logowanie zewnętrznymi kontami Google (@gmail.com) lub blokuje wyskakujące okna. Aby zalogować się prywatnym kontem, otwórz aplikację w <strong>prywatnym profilu Chrome</strong> w telefonie.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {googleUser ? (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center gap-2">
                    {googleUser.photoURL ? (
                      <img src={googleUser.photoURL} alt="" className="w-6 h-6 rounded-full border border-slate-700" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
                        {googleUser.displayName?.[0] || 'G'}
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-slate-200 leading-tight">
                        {googleUser.displayName || 'Konto Google'}
                      </div>
                      <div className="text-[10px] text-slate-400 leading-tight">
                        {googleUser.email}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Połączono
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400">
                    {lastGoogleSyncTime ? `Ostatnia synchronizacja: ${lastGoogleSyncTime}` : 'Synchronizacja automatyczna aktywna'}
                  </span>
                  <button
                    type="button"
                    onClick={manualGoogleSync}
                    disabled={isGoogleSyncing}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-[10px] font-semibold transition cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3 h-3 ${isGoogleSyncing ? 'animate-spin' : ''}`} />
                    <span>{isGoogleSyncing ? 'Zapisuję...' : 'Zsynchronizuj teraz'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Zaloguj się swoim kontem Google, aby automatycznie tworzyć bezpieczną kopię w prywatnym, ukrytym folderze Twojego Dysku Google. Nawet jeśli wyczyścisz całą pamięć przeglądarki Chrome, Twoje dane powrócą!
                </p>

                <button
                  type="button"
                  onClick={async () => {
                    const success = await signInGoogle();
                    if (success) {
                      alert('Pomyślnie połączono z kontem Google i zsynchronizowano dane!');
                    }
                  }}
                  disabled={isGoogleSyncing}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-2.5 shadow-md transition cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>{isGoogleSyncing ? 'Logowanie...' : 'Zaloguj przez Google i chroń dane'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Section: Android Calendar Integration (100% zgodne ze służbowym Leroy Merlin) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                  <CalendarPlus className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    Kalendarz telefonu (Android Calendar)
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full font-normal border border-emerald-500/30">
                      Zgodne z Leroy Merlin
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Zapisuje przerwy bezpośrednio w Twoim kalendarzu w telefonie
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoAddToCalendar}
                  onChange={(e) => {
                    setAutoAddToCalendar(e.target.checked);
                    updateSettings({ autoAddToCalendar: e.target.checked });
                  }}
                  className="rounded border-slate-700 text-indigo-500 focus:ring-0 w-4 h-4 bg-slate-800 mt-0.5"
                />
                <div>
                  <span className="text-slate-200 font-bold block text-xs">
                    Automatycznie otwieraj Kalendarz po kliknięciu STOP
                  </span>
                  <span className="text-slate-400 text-[10px] block mt-0.5 leading-relaxed">
                    Po zakończeniu przerwy telefon od razu otworzy systemowe okno Kalendarza z przygotowanymi godzinami i czasem trwania. Wystarczy kliknąć <em>Zapisz</em>.
                  </span>
                </div>
              </label>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[10px] text-slate-300 space-y-1">
                <p className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 100% odporne na czyszczenie i w 100% zgodne z RODO:
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Zdarzenia trafiają do Twojej wbudowanej aplikacji Kalendarza w telefonie. Nawet jeśli wyczyścisz całą pamięć podręczną Chrome, Twoja historia przerw pozostaje nienaruszona w Kalendarzu. Działa bez żadnego zewnętrznego logowania i nie wymaga zgody IT!
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const fakeStart = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
                  addBreakToAndroidCalendar({
                    id: 'test-cal-' + Date.now(),
                    startTime: fakeStart,
                    endTime: now.toISOString(),
                    durationSeconds: 900,
                    dayKey: now.toISOString().slice(0, 10),
                    note: 'Przerwa testowa w PrzerwaPro'
                  }, userName);
                }}
                className="w-full py-2 px-3 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                <span>📅 Przetestuj dodanie zdarzenia do Kalendarza teraz</span>
              </button>
            </div>
          </div>

          {/* Section: Google Sheets Integration (Wspólny Arkusz Sektora - Zapis i Pobieranie) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    Arkusz Google (Wspólna baza przerw sektora)
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full font-normal border border-emerald-500/30">
                      Zapis + Pobieranie
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Zakładki z miesiącami, osobne kolumny dla każdego pracownika i auto-synchronizacja
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <div>
                <label className="block text-slate-300 font-medium mb-1 text-xs">
                  Adres aplikacji internetowej Google Apps Script (Web App URL)
                </label>
                <div className="relative">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400 absolute left-3 top-2.5" />
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={googleSheetsUrl}
                    onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  Adres skryptu z Twojego prywatnego Arkusza Google. Niewykorzystywane przez inne sektory – każdy sektor ma swój własny arkusz.
                </p>
              </div>

              {/* Akcje: Testuj, Pobierz z Arkusza, Instrukcja */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestGoogleSheets}
                  disabled={isTestingSheets || !googleSheetsUrl.trim()}
                  className="py-2 px-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isTestingSheets ? 'animate-spin' : ''}`} />
                  <span>{isTestingSheets ? 'Testuję...' : 'Przetestuj Arkusz'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSyncFromSheets}
                  disabled={isSheetsSyncing || !googleSheetsUrl.trim()}
                  className="py-2 px-2.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 active:scale-95"
                  title="Pobierz historię przerw z Arkusza do tej aplikacji"
                >
                  <Download className={`w-3.5 h-3.5 text-blue-400 ${isSheetsSyncing ? 'animate-bounce' : ''}`} />
                  <span>{isSheetsSyncing ? 'Pobieram...' : 'Pobierz historię'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSheetsGuide(!showSheetsGuide)}
                  className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
                >
                  <Info className="w-3.5 h-3.5 text-amber-400" />
                  <span>{showSheetsGuide ? 'Ukryj instrukcję' : 'Instrukcja & Kod'}</span>
                </button>
              </div>

              {/* Statusy testu i synchronizacji */}
              {testSheetsResult && (
                <div className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 animate-in fade-in ${
                  testSheetsResult.success
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                    : 'bg-rose-500/15 border-rose-500/30 text-rose-200'
                }`}>
                  {testSheetsResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <p className="font-bold">
                      {testSheetsResult.success ? 'Połączenie z Arkuszem działa!' : 'Błąd połączenia'}
                    </p>
                    <p className="text-[11px] opacity-90 leading-relaxed whitespace-pre-line">{testSheetsResult.message}</p>
                  </div>
                </div>
              )}

              {sheetsSyncStatus.message && !testSheetsResult && (
                <div className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 animate-in fade-in ${
                  sheetsSyncStatus.status === 'success'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                    : sheetsSyncStatus.status === 'error'
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-200'
                    : 'bg-blue-500/15 border-blue-500/30 text-blue-200'
                }`}>
                  {sheetsSyncStatus.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : sheetsSyncStatus.status === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  ) : (
                    <RefreshCw className="w-4 h-4 text-blue-400 animate-spin shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <p className="text-[11px] leading-relaxed whitespace-pre-line">{sheetsSyncStatus.message}</p>
                    {lastSheetsSyncTime && (
                      <p className="text-[10px] text-slate-400">Ostatnia synchronizacja: {lastSheetsSyncTime}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Rozwijana instrukcja i kod skryptu do wklejenia w Arkuszu Google */}
              {showSheetsGuide && (
                <div className="mt-2 p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs text-slate-300 animate-in fade-in">
                  <h5 className="font-bold text-white flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Jak uruchomić w 2 minuty na swoim prywatnym koncie Google:
                  </h5>
                  <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-slate-300">
                    <li>Otwórz <a href="https://sheets.new" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline font-semibold">sheets.new</a> na swoim prywatnym Dysku Google i nazwij plik np. <em>„Przerwy Sektor”</em>.</li>
                    <li>W menu górnym Arkusza kliknij: <strong>Rozszerzenia → Apps Script</strong>.</li>
                    <li>Skasuj kod, który tam jest i wklej poniższy skrypt.</li>
                    <li>Kliknij ikonę dyskietki (Zapisz), a następnie niebieski przycisk <strong>Wdróż → Nowe wdrożenie</strong>.</li>
                    <li>Wybierz typ <strong>Aplikacja internetowa (Web app)</strong> i ustaw:
                      <ul className="list-disc pl-4 mt-1 text-slate-400">
                        <li>Wykonaj jako: <strong>Ja</strong></li>
                        <li>Kto ma dostęp: <strong className="text-emerald-300">Każdy (Anyone)</strong> <span className="text-[10px]">(dzięki temu koledzy z sektora nie muszą się logować!)</span></li>
                      </ul>
                    </li>
                    <li>Kliknij <strong>Wdróż</strong>, zaakceptuj uprawnienia i skopiuj <strong>Adres URL aplikacji internetowej</strong> (z końcówką <code>/exec</code>).</li>
                    <li>Wklej ten link w polu powyżej. Gotowe!</li>
                  </ol>

                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-slate-400">Kod skryptu Google Apps Script:</span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await fetch('./google-apps-script.js');
                            const text = await res.text();
                            await navigator.clipboard.writeText(text);
                            setCopiedScript(true);
                            setTimeout(() => setCopiedScript(false), 2500);
                          } catch {
                            setCopiedScript(false);
                          }
                        }}
                        className="py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 transition cursor-pointer shadow-sm active:scale-95"
                      >
                        {copiedScript ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedScript ? '✓ Skopiowano do schowka!' : 'Kopiuj cały kod skryptu'}</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Plik ze skryptem możesz też pobrać bezpośrednio: <a href="./google-apps-script.js" download="google-apps-script.js" className="text-emerald-400 underline">pobierz google-apps-script.js</a>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 1: Limits and Reset */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> Limit czasu i reset dobowy
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Dzienny limit przerwy (minuty)
                </label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={dailyAllowance}
                  onChange={(e) => setDailyAllowance(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-500">Domyślnie: 30 minut</span>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Godzina resetu limitu
                </label>
                <input
                  type="time"
                  value={resetHour}
                  onChange={(e) => setResetHour(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-500">Domyślnie północ (00:00)</span>
              </div>
            </div>

            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400">
              💡 <strong>Godzina resetu:</strong> Jeśli pracujesz na nocki (np. od 22:00 do 06:00), ustaw reset np. na <strong>06:00</strong> lub <strong>14:00</strong>, aby przerwy z całej nocnej zmiany liczyły się w jednym dniu.
            </div>
          </div>

          {/* Section 2: Audio Alert & Warning */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Bell className="w-4 h-4" /> Dźwiękowy alarm ostrzegawczy
            </h4>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Alarm ile minut przed końcem czasu:
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={warningMinutes}
                  onChange={(e) => setWarningMinutes(Number(e.target.value))}
                  className="w-24 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                />
                <span className="text-slate-300">minuty przed końcem (wymagane: 3 min)</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={soundAlerts}
                  onChange={(e) => setSoundAlerts(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-0 w-4 h-4 bg-slate-800"
                />
                <span className="text-slate-300 font-medium">Dźwięki alarmów przez głośnik / słuchawki</span>
              </label>

              {soundAlerts && (
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-medium flex items-center gap-2 text-xs">
                      {alarmVolume === 0 ? (
                        <VolumeX className="w-4 h-4 text-rose-400" />
                      ) : alarmVolume < 50 ? (
                        <Volume1 className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-amber-400" />
                      )}
                      <span>Głośność dźwięków i alarmów</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 font-mono font-bold text-xs bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-700">
                        {alarmVolume}%
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const newVol = alarmVolume === 0 ? 80 : 0;
                          setAlarmVolume(newVol);
                        }}
                        className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-700/50 hover:bg-slate-700 transition"
                      >
                        {alarmVolume === 0 ? 'Włącz dźwięk' : 'Wycisz'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <VolumeX className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={alarmVolume}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setAlarmVolume(val);
                      }}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Reguluje siłę głośności alarmu 3 minuty przed końcem oraz alarmu o wykorzystaniu 30 minut.
                  </span>
                </div>
              )}

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={browserNotifications}
                  onChange={(e) => setBrowserNotifications(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-0 w-4 h-4 bg-slate-800"
                />
                <span className="text-slate-300 font-medium">Powiadomienia systemowe o alarmach</span>
              </label>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2.5">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationBarControls}
                    onChange={(e) => {
                      setNotificationBarControls(e.target.checked);
                      if (e.target.checked) {
                        handleRequestNotificationPermission();
                      }
                    }}
                    className="rounded border-slate-700 text-amber-500 focus:ring-0 w-4 h-4 bg-slate-800 mt-0.5"
                  />
                  <div>
                    <span className="text-amber-300 font-bold block text-xs">Pasek powiadomień ze sterowaniem START / STOP (Android)</span>
                    <span className="text-slate-400 text-[11px] block mt-0.5">
                      Wyświetla belkę powiadomień w telefonie z przyciskami bezpośrednio na pasku i ekranie blokady.
                    </span>
                  </div>
                </label>

                {notificationBarControls && (
                  <div className="space-y-2.5 pt-2 border-t border-slate-700/60 pl-6">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationBarOnlyDuringBreak}
                        onChange={(e) => setNotificationBarOnlyDuringBreak(e.target.checked)}
                        className="rounded border-slate-700 text-amber-500 focus:ring-0 w-4 h-4 bg-slate-800 mt-0.5"
                      />
                      <div>
                        <span className="text-slate-200 font-semibold block text-xs">
                          Pokazuj powiadomienie TYLKO podczas trwania przerwy
                        </span>
                        <span className="text-slate-400 text-[11px] block mt-0.5">
                          Powiadomienie pojawia się w momencie kliknięcia Start (z licznikiem czasu na żywo i przyciskiem Stop), a po kliknięciu Stop <strong>znika natychmiast</strong> z paska powiadomień.
                        </span>
                      </div>
                    </label>

                    {/* Notification Bar Title Style Selector */}
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/80 space-y-1.5">
                      <span className="text-amber-300 font-bold block text-xs flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Wygląd powiadomienia na pasku:
                      </span>
                      <div className="grid grid-cols-1 gap-1.5 pt-1">
                        {[
                          { 
                            id: 'return_only', 
                            label: '☕ Godzina powrotu (100% odporna na gry w tle) - ZALECANE', 
                            desc: 'np. ☕ Powrót do pracy: 09:14 (Start: 08:44) • Zawsze pewne, nigdy się nie zatnie!' 
                          },
                          { 
                            id: 'minutes_and_return', 
                            label: '⏳ Minuty + Godzina powrotu', 
                            desc: 'np. ⏳ Pozostało ok. 22 min • Powrót: 09:14 • Bez zacinania sekund' 
                          },
                          { 
                            id: 'countdown_and_return', 
                            label: '⏱️ Pełny zegar sekundowy + Powrót', 
                            desc: 'np. ⏳ 22:15 • Powrót: 09:14 (Gry 3D wstrzymują sekundy w tle z powodu polityki Androida)' 
                          },
                          { 
                            id: 'countdown_only', 
                            label: '⏳ Tylko zegar odliczania', 
                            desc: 'np. ⏳ Pozostało: 22:15' 
                          },
                        ].map((opt) => (
                          <label
                            key={opt.id}
                            className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer border transition ${
                              notificationBarTitleStyle === opt.id
                                ? 'bg-amber-500/15 border-amber-500/60 text-amber-200'
                                : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <input
                              type="radio"
                              name="notificationTitleStyle"
                              value={opt.id}
                              checked={notificationBarTitleStyle === opt.id}
                              onChange={() => {
                                const val = opt.id as any;
                                setNotificationBarTitleStyle(val);
                                updateSettings({ notificationBarTitleStyle: val });
                              }}
                              className="text-amber-500 focus:ring-0 mt-0.5"
                            />
                            <div>
                              <span className="text-xs font-bold block">{opt.label}</span>
                              <span className="text-[10px] text-slate-400 block">{opt.desc}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Android Lock Screen tip */}
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-amber-300">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Dlaczego nie widzisz powiadomienia na ekranie blokady?</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed text-[10px]">
                        W systemie Android domyślnie powiadomienia z przeglądarki Chrome mogą być ukrywane na ekranie blokady ze względów prywatności. Aby je włączyć:
                      </p>
                      <ol className="list-decimal pl-4 space-y-0.5 text-[10px] text-slate-300">
                        <li>Wejdź w <strong>Ustawienia telefonu</strong> &rarr; <strong>Powiadomienia</strong> (lub Aplikacje &rarr; Chrome).</li>
                        <li>Wybierz <strong>Powiadomienia na ekranie blokady</strong> i zaznacz <strong>„Pokaż całą treść”</strong>.</li>
                        <li>W uprawnieniach Chrome sprawdź czy kategoria <strong>Powiadomienia witryn</strong> ma włączony „Ekran blokady”.</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>

              {/* Vibration Settings subsection */}
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={vibrateEnabled}
                      onChange={(e) => setVibrateEnabled(e.target.checked)}
                      className="rounded border-slate-700 text-amber-500 focus:ring-0 w-4 h-4 bg-slate-800"
                    />
                    <span className="text-amber-300 font-bold block text-xs flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4" /> Wibracje telefonu i alarmów
                    </span>
                  </label>
                </div>

                {vibrateEnabled && (
                  <div className="space-y-3 pt-1">
                    {/* Clean System Notification Test Button */}
                    <button
                      type="button"
                      onClick={handleTestSystemVibration}
                      className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 shadow-sm active:scale-95 ${
                        vibrationTestState === 'sys-vibrating'
                          ? 'bg-amber-500 text-slate-950 font-black animate-pulse'
                          : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40'
                      }`}
                      title="Przetestuj wibrację powiadomienia Androida"
                    >
                      <Bell className="w-4 h-4 text-amber-400" />
                      <span>{vibrationTestState === 'sys-vibrating' ? '🔔 Wysłano powiadomienie...' : '🔔 Przetestuj wibrację powiadomienia'}</span>
                    </button>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Czyste wibracje systemowe Androida</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Aplikacja korzysta wyłącznie ze standardowych wibracji powiadomień Androida (dokładnie tak jak WhatsApp czy SMS).
                      </p>
                    </div>
                  </div>
                )}

                {vibrateEnabled && (
                  <div className="space-y-2.5 pt-2 border-t border-slate-700/60 pl-6 text-[11px]">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={countdownVibrationEnabled}
                        onChange={(e) => setCountdownVibrationEnabled(e.target.checked)}
                        className="rounded border-slate-700 text-amber-500 focus:ring-0 w-4 h-4 bg-slate-800 mt-0.5"
                      />
                      <div>
                        <span className="text-slate-200 font-semibold block text-xs">
                          Dyskretne impulsy wibracyjne w kieszeni podczas odliczania
                        </span>
                        <span className="text-slate-400 block mt-0.5">
                          Krótki impuls dotykowy informujący o upływie czasu przerwy bez konieczności patrzenia na ekran.
                        </span>
                      </div>
                    </label>

                    {countdownVibrationEnabled && (
                      <>
                        <label className="flex items-start gap-2.5 cursor-pointer pl-4 bg-amber-500/5 p-2 rounded-lg border border-amber-500/20">
                          <input
                            type="checkbox"
                            checked={vibrateOnlyWhenScreenLocked}
                            onChange={(e) => setVibrateOnlyWhenScreenLocked(e.target.checked)}
                            className="rounded border-slate-700 text-amber-500 focus:ring-0 w-4 h-4 bg-slate-800 mt-0.5"
                          />
                          <div>
                            <span className="text-amber-300 font-bold block text-xs">
                              Wibruj TYLKO gdy zablokujesz ekran telefonu
                            </span>
                            <span className="text-slate-300 block mt-0.5 text-[10px]">
                              Gdy patrzysz na ekran (telefon odblokowany), wibracje odliczania nie przeszkadzają. Włączają się automatycznie, gdy wygasisz ekran i schowasz telefon do kieszeni.
                            </span>
                          </div>
                        </label>

                        <div className="pl-4 pt-1 flex items-center justify-between">
                          <span className="text-slate-300 text-xs">Częstotliwość impulsu w kieszeni:</span>
                          <div className="flex gap-1.5">
                            {[
                              { val: 1, label: 'Co 1 min' },
                              { val: 2, label: 'Co 2 min' },
                              { val: 5, label: 'Co 5 min' },
                            ].map((opt) => (
                              <button
                                key={opt.val}
                                type="button"
                                onClick={() => setCountdownVibrationIntervalMinutes(opt.val)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                                  countdownVibrationIntervalMinutes === opt.val
                                    ? 'bg-amber-500 text-slate-950 font-bold'
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Wake Lock Setting */}
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepScreenAwake}
                  onChange={(e) => setKeepScreenAwake(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-0 w-4 h-4 bg-slate-800 mt-0.5"
                />
                <div>
                  <span className="text-amber-300 font-bold block text-xs flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Nie wygaszaj ekranu podczas trwania przerwy (Wake Lock)
                  </span>
                  <span className="text-slate-400 text-[11px] block mt-0.5">
                    Zapobiega samoczynnemu wygaszaniu ekranu przez system telefonu, gdy trwa przerwa (przydatne, gdy telefon stoi w podstawce na biurku).
                  </span>
                </div>
              </label>
            </div>



            {/* App Badging Setting */}
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={appBadgeEnabled}
                  onChange={(e) => setAppBadgeEnabled(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-0 w-4 h-4 bg-slate-800 mt-0.5"
                />
                <div>
                  <span className="text-amber-300 font-bold block text-xs flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" /> Licznik minut na ikonie aplikacji (Pulpit Androida)
                  </span>
                  <span className="text-slate-400 text-[11px] block mt-0.5">
                    Wyświetla małą plakietkę z liczbą pozostałych minut przerwy bezpośrednio na ikonie aplikacji na pulpicie telefonu (App Badging API).
                  </span>
                </div>
              </label>
            </div>

            {/* Test buttons for audio & lockscreen */}
            <div className="space-y-2 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => testSoundAlarm('warning', alarmVolume)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs transition cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Testuj alarm 3 min</span>
                </button>
                <button
                  type="button"
                  onClick={() => testSoundAlarm('final', alarmVolume)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 text-xs transition cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Testuj alarm 0 min</span>
                </button>
                <button
                  type="button"
                  onClick={handleRequestNotificationPermission}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 text-xs transition cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Włącz powiadomienia</span>
                </button>
              </div>

              {/* Delayed Lock Screen Test Button */}
              <button
                type="button"
                onClick={async () => {
                  await handleRequestNotificationPermission();
                  let count = 5;
                  setTestLockCountdown(count);
                  const timer = setInterval(() => {
                    count--;
                    if (count > 0) {
                      setTestLockCountdown(count);
                    } else {
                      clearInterval(timer);
                      setTestLockCountdown(null);
                      sendSystemNotification('🔔 Test alarmu na ekranie blokady!', {
                        body: 'Dźwięk oraz wibracje działają poprawnie po wygaszeniu ekranu!',
                        vibrate: [500, 200, 500, 200, 500],
                        requireInteraction: true,
                        tag: 'test-lock-alarm',
                      });
                      testSoundAlarm('warning', alarmVolume);
                    }
                  }, 1000);
                }}
                disabled={testLockCountdown !== null}
                className="w-full py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                <Smartphone className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>
                  {testLockCountdown !== null
                    ? `ZABLOKUJ TERAZ EKRAN TELEFONU! Alarm za: ${testLockCountdown}s...`
                    : '🔔 Przetestuj alarm w tle (za 5 sek) – zablokuj telefon na próbę'}
                </span>
              </button>
            </div>
          </div>

          {/* Section 3: Google Chat Webhook */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Send className="w-4 h-4" /> Integracja Google Chat
            </h4>

            {/* Pojedyncze pole: Twoje imię (bez webhooka i bez przycisku testuj) */}
            <div>
              <label className="block text-slate-300 font-medium mb-1 text-xs">
                Twoje imię / podpis na czacie
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="np. Arek"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>


            {/* Treść wiadomości na czacie */}
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/80 space-y-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={simpleChatMessages}
                  onChange={(e) => setSimpleChatMessages(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-0 w-4 h-4 bg-slate-800"
                />
                <span className="text-slate-200 font-semibold text-xs">
                  Wysyłaj proste wiadomości (słowa "start" i "stop")
                </span>
              </label>

              {simpleChatMessages ? (
                <div className="space-y-2.5 pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer pl-6">
                    <input
                      type="checkbox"
                      checked={includeNameInSimpleMessage}
                      onChange={(e) => setIncludeNameInSimpleMessage(e.target.checked)}
                      className="rounded border-slate-700 text-amber-500 focus:ring-0 w-4 h-4 bg-slate-800 mt-0.5"
                    />
                    <div>
                      <span className="text-slate-200 font-medium text-xs">
                        Dołączaj imię do wiadomości (np. "{userName.trim() || 'Arek'}: start")
                      </span>
                      <span className="text-slate-400 text-[10px] block mt-0.5">
                        Przydatne, gdy z kolegami w pracy używacie jednego wspólnego webhooka.
                      </span>
                    </div>
                  </label>

                  <div className="grid grid-cols-2 gap-2 pl-6">
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">Słowo po Start:</label>
                      <input
                        type="text"
                        value={startMessageText}
                        onChange={(e) => setStartMessageText(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                        placeholder="start"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">Słowo po Stop:</label>
                      <input
                        type="text"
                        value={stopMessageText}
                        onChange={(e) => setStopMessageText(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                        placeholder="stop"
                      />
                    </div>
                  </div>

                  {/* Podgląd na żywo */}
                  <div className="ml-6 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 space-y-1">
                    <span className="text-slate-400 block font-medium text-[10px]">Podgląd wiadomości na Google Chat:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-mono">
                        ▶ Start: "{includeNameInSimpleMessage && userName.trim() ? `${userName.trim()}: ` : ''}${startMessageText.trim() || 'start'}"
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-rose-400 font-mono">
                        ⏹ Stop: "{includeNameInSimpleMessage && userName.trim() ? `${userName.trim()}: ` : ''}${stopMessageText.trim() || 'stop'}"
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 pl-6">
                  W trybie pełnym aplikacja wysyła sformatowaną wiadomość ze szczegółami, godziną i wyliczonym limitem.
                </p>
              )}
            </div>

            {/* Status połączenia z webhookiem i przycisk testowy */}
            <div className="space-y-2 pt-1">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                  <span className="truncate font-medium text-slate-200">
                    Wspólny webhook Leroy Merlin (pokój przerw)
                  </span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono shrink-0">
                  Aktywny ✓
                </span>
              </div>

              <button
                type="button"
                onClick={handleTestGoogleChat}
                disabled={isTestingWebhook}
                className="w-full py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 active:scale-[0.98]"
              >
                <Send className={`w-3.5 h-3.5 text-amber-400 ${isTestingWebhook ? 'animate-spin' : ''}`} />
                <span>{isTestingWebhook ? 'Wysyłanie testu na czat...' : '💬 Przetestuj wysłanie wiadomości na Google Chat'}</span>
              </button>

              {testWebhookResult && (
                <div className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
                  testWebhookResult.status === 'success' 
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200' 
                    : 'bg-rose-500/15 border-rose-500/30 text-rose-200'
                }`}>
                  {testWebhookResult.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <p className="font-bold">
                      {testWebhookResult.status === 'success' ? 'Sukces! Wiadomość wysłana na Google Chat' : 'Błąd dostarczenia'}
                    </p>
                    <p className="text-[11px] opacity-90 leading-relaxed">{testWebhookResult.message}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Data Management & Backup */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Download className="w-4 h-4" /> Kopia zapasowa i reset danych
            </h4>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Pobierz kopię JSON</span>
              </button>

              <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-blue-400" />
                <span>Wczytaj plik JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={async () => {
                  try {
                    if ('serviceWorker' in navigator) {
                      const registrations = await navigator.serviceWorker.getRegistrations();
                      for (const reg of registrations) {
                        await reg.unregister();
                      }
                    }
                    if ('caches' in window) {
                      const keys = await caches.keys();
                      for (const key of keys) {
                        await caches.delete(key);
                      }
                    }
                  } catch (e) {
                    // Ignore
                  }
                  const cleanUrl = window.location.origin + window.location.pathname;
                  window.location.replace(`${cleanUrl}?v=${Date.now()}`);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition text-xs font-semibold cursor-pointer"
                title="Wyczyść pamięć podręczną i załaduj najnowszą wersję aplikacji"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Wymuś aktualizację i odśwież aplikację</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Wyczyścić przerwy tylko z dzisiejszego dnia?')) {
                    clearTodayBreaks();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resetuj dzisiejszy dzień</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('UWAGA: Czy na pewno chcesz usunąć całą historię przerw ze wszystkich miesięcy?')) {
                    clearAllHistory();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Usuń całą historię</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            {saveSuccess ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Zapisano pomyślnie!
              </span>
            ) : (
              'Wszystkie dane zapisywane są w urządzeniu'
            )}
          </span>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/20 transition"
            >
              Zapisz ustawienia
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

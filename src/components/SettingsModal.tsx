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
  ChevronUp
} from 'lucide-react';
import { useBreaks } from '../context/BreakContext';
import { sendSystemNotification } from '../utils/audioAlert';
import { isVibrationSupported } from '../utils/vibrationService';

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
    testServerPush,
    clearTodayBreaks,
    clearAllHistory,
    exportDataJSON,
    importDataJSON,
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
  const [includeNameInSimpleMessage, setIncludeNameInSimpleMessage] = useState(settings.includeNameInSimpleMessage ?? false);
  const [notificationBarControls, setNotificationBarControls] = useState(settings.notificationBarControlsEnabled ?? true);
  const [notificationBarOnlyDuringBreak, setNotificationBarOnlyDuringBreak] = useState(settings.notificationBarOnlyDuringBreak ?? true);

  const [vibrateEnabled, setVibrateEnabled] = useState(settings.vibrateEnabled ?? true);
  const [countdownVibrationEnabled, setCountdownVibrationEnabled] = useState(settings.countdownVibrationEnabled ?? true);
  const [vibrateOnlyWhenScreenLocked, setVibrateOnlyWhenScreenLocked] = useState(settings.vibrateOnlyWhenScreenLocked ?? true);
  const [countdownVibrationIntervalMinutes, setCountdownVibrationIntervalMinutes] = useState(settings.countdownVibrationIntervalMinutes ?? 1);

  const [keepScreenAwake, setKeepScreenAwake] = useState(settings.keepScreenAwakeDuringBreak ?? false);
  const [pocketLockEnabled, setPocketLockEnabled] = useState(settings.pocketLockEnabled !== false);
  const [appBadgeEnabled, setAppBadgeEnabled] = useState(settings.appBadgeEnabled !== false);
  const [serverPushEnabled, setServerPushEnabled] = useState(settings.serverPushEnabled !== false);
  const [pushTestState, setPushTestState] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [pushTestError, setPushTestError] = useState('');
  const [testLockCountdown, setTestLockCountdown] = useState<number | null>(null);
  const [vibrationTestState, setVibrationTestState] = useState<'idle' | 'vibrating' | 'unsupported'>('idle');

  const handleTestVibration = () => {
    const supported = isVibrationSupported();
    testVibration('strong');
    if (supported) {
      setVibrationTestState('vibrating');
      setTimeout(() => setVibrationTestState('idle'), 2500);
    } else {
      setVibrationTestState('unsupported');
      setTimeout(() => setVibrationTestState('idle'), 5000);
    }
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
      countdownVibrationEnabled,
      vibrateOnlyWhenScreenLocked,
      countdownVibrationIntervalMinutes: Number(countdownVibrationIntervalMinutes) || 1,
      simpleChatMessages,
      startMessageText: startMessageText.trim() || 'start',
      stopMessageText: stopMessageText.trim() || 'stop',
      includeNameInSimpleMessage,
      notificationBarControlsEnabled: notificationBarControls,
      notificationBarOnlyDuringBreak,
      keepScreenAwakeDuringBreak: keepScreenAwake,
      pocketLockEnabled,
      appBadgeEnabled,
      serverPushEnabled,
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
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={vibrateEnabled}
                      onChange={(e) => setVibrateEnabled(e.target.checked)}
                      className="rounded border-slate-700 text-amber-500 focus:ring-0 w-4 h-4 bg-slate-800"
                    />
                    <span className="text-amber-300 font-bold block text-xs flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4" /> Wibracje telefonu (Haptic feedback)
                    </span>
                  </label>
                  {vibrateEnabled && (
                    <button
                      type="button"
                      onClick={handleTestVibration}
                      className={`text-[11px] px-3 py-1.5 rounded-lg border font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 ${
                        vibrationTestState === 'vibrating'
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold animate-pulse'
                          : vibrationTestState === 'unsupported'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
                      }`}
                      title="Przetestuj wibrację telefonu"
                    >
                      <Smartphone className={`w-3.5 h-3.5 ${vibrationTestState === 'vibrating' ? 'animate-bounce' : ''}`} />
                      <span>
                        {vibrationTestState === 'vibrating'
                          ? '📳 Telefon wibruje...'
                          : vibrationTestState === 'unsupported'
                          ? 'Brak obsługi wibracji w tej przeglądarce'
                          : 'Sprawdź wibrację'}
                      </span>
                    </button>
                  )}
                </div>

                {/* Vibration Feedback Banners */}
                {vibrationTestState === 'vibrating' && (
                  <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-[11px] text-amber-200 flex items-center gap-2 animate-in fade-in">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                    <span>Wysłano silną sekwencję wibracji do Twojego telefonu!</span>
                  </div>
                )}

                {vibrationTestState === 'unsupported' && (
                  <div className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-[11px] text-slate-300 space-y-1 animate-in fade-in">
                    <p className="font-bold text-amber-300">ℹ️ Informacja o wibracjach:</p>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Przeglądarki na komputerach oraz iOS (Safari na iPhone) nie obsługują wibracji stron www (Web Vibration API). 
                      Wibracje działają bezpośrednio na <strong>telefonach z Androidem w przeglądarce Chrome</strong>.
                    </p>
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

            {/* Pocket Lock Setting */}
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pocketLockEnabled}
                  onChange={(e) => setPocketLockEnabled(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-0 w-4 h-4 bg-slate-800 mt-0.5"
                />
                <div>
                  <span className="text-amber-300 font-bold block text-xs flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Ochrona przed kliknięciem w kieszeni (Pocket Lock)
                  </span>
                  <span className="text-slate-400 text-[11px] block mt-0.5">
                    Wymaga przytrzymania przycisku START / STOP przez 1 sekundę zamiast pojedynczego kliknięcia. Eliminuje przypadkowe uruchomienie lub zatrzymanie przerwy przez materiał spodni.
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

            {/* Server-side Web Push Safety Net Setting */}
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2.5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={serverPushEnabled}
                  onChange={(e) => setServerPushEnabled(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-0 w-4 h-4 bg-slate-800 mt-0.5"
                />
                <div>
                  <span className="text-amber-300 font-bold block text-xs flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5" /> Asekuracyjne powiadomienia Web Push (z serwera chmury)
                  </span>
                  <span className="text-slate-400 text-[11px] block mt-0.5">
                    Gwarancja alarmu w kieszeni: jeśli system Android (np. Xiaomi, Samsung) agresywnie uśpi Chrome, serwer o wyliczonej minucie wyśle bezpośredni sygnał Web Push przez chmurę Google FCM, który obudzi ekran telefonu.
                  </span>
                </div>
              </label>

              {serverPushEnabled && (
                <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                  <span className="text-slate-300 text-[11px]">Przetestuj wysyłkę Push z serwera:</span>
                  <button
                    type="button"
                    onClick={async () => {
                      setPushTestState('testing');
                      setPushTestError('');
                      const res = await testServerPush();
                      if (res.success) {
                        setPushTestState('success');
                        setTimeout(() => setPushTestState('idle'), 4000);
                      } else {
                        setPushTestState('error');
                        setPushTestError(res.error || 'Niepowodzenie');
                        setTimeout(() => setPushTestState('idle'), 6000);
                      }
                    }}
                    disabled={pushTestState === 'testing'}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                      pushTestState === 'testing'
                        ? 'bg-slate-800 text-slate-400 border-slate-700'
                        : pushTestState === 'success'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : pushTestState === 'error'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    <Send className={`w-3.5 h-3.5 ${pushTestState === 'testing' ? 'animate-spin' : ''}`} />
                    <span>
                      {pushTestState === 'testing'
                        ? 'Wysyłanie...'
                        : pushTestState === 'success'
                        ? '✓ Wysłano Push!'
                        : pushTestState === 'error'
                        ? 'Błąd testu'
                        : 'Wyślij testowy Push'}
                    </span>
                  </button>
                </div>
              )}

              {pushTestState === 'success' && (
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300 animate-in fade-in">
                  ✅ Serwer pomyślnie wysłał powiadomienie Push do Twojego urządzenia! Sprawdź górny pasek powiadomień.
                </div>
              )}
              {pushTestState === 'error' && (
                <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-300 animate-in fade-in">
                  ⚠️ {pushTestError}
                </div>
              )}
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

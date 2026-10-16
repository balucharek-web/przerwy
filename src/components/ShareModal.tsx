import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  QrCode, 
  Users, 
  Send, 
  ShieldCheck, 
  Sparkles, 
  Camera, 
  Edit2, 
  Save, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useBreaks, TEAM_SHARED_WEBHOOK } from '../context/BreakContext';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Stały, oficjalny adres GitHub Pages (nigdy Google AI)
const GITHUB_PAGES_BASE_URL = 'https://balucharek-web.github.io/przerwy/';

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useBreaks();
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [isEditingWebhook, setIsEditingWebhook] = useState(false);
  const [editWebhookValue, setEditWebhookValue] = useState(settings.googleChatWebhookUrl || TEAM_SHARED_WEBHOOK);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Tryb kodu QR: 'webhook_only' (sam adres webhooka) vs 'github_link' (link z GitHub Pages)
  const [qrMode, setQrMode] = useState<'webhook_only' | 'github_link'>('webhook_only');

  // Stan skanera kamery wewnątrz aplikacji
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const currentWebhook = settings.googleChatWebhookUrl || TEAM_SHARED_WEBHOOK;

  // Dane do zakodowania w kodzie QR
  const qrData = qrMode === 'webhook_only'
    ? currentWebhook
    : `${GITHUB_PAGES_BASE_URL}?webhook=${encodeURIComponent(currentWebhook)}`;

  // Link do generatora QR
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}&color=f59e0b&bgcolor=0f172a&margin=2`;

  // Czyszczenie kamery przy zamknięciu
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {}).then(() => {
          scannerRef.current?.clear();
          scannerRef.current = null;
        });
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleCopyWebhook = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentWebhook);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2500);
    }
  };

  const handleSaveEditedWebhook = () => {
    if (editWebhookValue.trim()) {
      updateSettings({
        googleChatWebhookUrl: editWebhookValue.trim(),
        includeNameInSimpleMessage: true,
      });
      setIsEditingWebhook(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  const startScanner = async () => {
    setIsScanning(true);
    setScanSuccess(null);
    setScanError(null);

    // Krótkie opóźnienie aby element DOM 'qr-reader' zdążył się wyrenderować
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode('qr-reader');
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
          },
          (decodedText) => {
            // Rozpoznaj czy kod to bezpośredni webhook czy link z parametrem ?webhook=
            let targetWebhook = decodedText.trim();

            if (decodedText.includes('webhook=')) {
              try {
                const url = new URL(decodedText);
                const param = url.searchParams.get('webhook');
                if (param) targetWebhook = decodeURIComponent(param);
              } catch (e) {
                const match = decodedText.match(/webhook=([^&]+)/);
                if (match && match[1]) targetWebhook = decodeURIComponent(match[1]);
              }
            }

            if (targetWebhook.startsWith('https://chat.googleapis.com/') || targetWebhook.includes('googleapis.com')) {
              updateSettings({
                googleChatWebhookUrl: targetWebhook,
                includeNameInSimpleMessage: true,
              });

              setScanSuccess('Webhook został pomyślnie wgrany do Twojej aplikacji!');
              stopScanner();
            } else {
              setScanError('Zeskanowany kod QR nie jest poprawnym adresem webhooka Google Chat.');
            }
          },
          () => {
            // Ciche błędy między klatkami
          }
        );
      } catch (err: any) {
        setScanError('Nie udało się uruchomić aparatu. Upewnij się, że zezwoliłeś na dostęp do kamery.');
        setIsScanning(false);
      }
    }, 200);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .catch(() => {})
        .then(() => {
          scannerRef.current?.clear();
          scannerRef.current = null;
          setIsScanning(false);
        });
    } else {
      setIsScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative text-slate-200 max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Udostępnianie i Webhook</h3>
              <p className="text-xs text-slate-400">Szybkie parowanie webhooka między telefonami</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto py-4 space-y-4 text-xs flex-1 pr-1">
          {/* Przycisk dla kolegi: Zeskanuj QR z telefonu innego pracownika */}
          {!isScanning ? (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/15 via-blue-500/10 to-transparent border border-blue-500/30 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-bold text-white text-xs block flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-blue-400" />
                  Masz już aplikację?
                </span>
                <p className="text-[11px] text-slate-300">
                  Zeskanuj kod z telefonu kolegi, aby wgrać webhook.
                </p>
              </div>
              <button
                type="button"
                onClick={startScanner}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-md shadow-blue-500/20"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Włącz skaner</span>
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-950 border border-blue-500/50 flex flex-col items-center space-y-3">
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                  <Camera className="w-4 h-4" /> Skieruj aparat na kod QR kolegi
                </span>
                <button
                  type="button"
                  onClick={stopScanner}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] cursor-pointer"
                >
                  Zamknij aparat
                </button>
              </div>

              {/* Kontener podglądu aparatu */}
              <div id="qr-reader" className="w-full max-w-[260px] overflow-hidden rounded-xl border border-slate-700 bg-black"></div>
            </div>
          )}

          {/* Sukces skanowania */}
          {scanSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <span className="text-xs font-semibold">{scanSuccess}</span>
            </div>
          )}

          {/* Błąd skanowania */}
          {scanError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <span className="text-xs">{scanError}</span>
            </div>
          )}

          {/* Kod QR do pokazania koledze */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
              <QrCode className="w-4 h-4" />
              <span>Pokaż ten kod koledze</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-2 max-w-xs">
              Kolega skanuje ten kod, aby pobrać Wasz wspólny webhook:
            </p>

            {/* Przełącznik formatu kodu QR */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 mb-3">
              <button
                type="button"
                onClick={() => setQrMode('webhook_only')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                  qrMode === 'webhook_only'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sam adres Webhooka
              </button>
              <button
                type="button"
                onClick={() => setQrMode('github_link')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                  qrMode === 'github_link'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Link z GitHuba
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border-2 border-amber-500/40 shadow-xl shadow-amber-500/10">
              <img
                src={qrImageUrl}
                alt="Kod QR Webhooka"
                width={190}
                height={190}
                className="rounded-xl block"
              />
            </div>

            <div className="mt-2.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-[10px] text-slate-400 flex items-center gap-1.5">
              <Send className="w-3 h-3 text-emerald-400" />
              <span>Pokój: <strong>spaces/AAAA94ZyILs</strong></span>
            </div>
          </div>

          {/* Adres Webhooka Google Chat (Właściwy adres URL, możliwość edycji i kopiowania) */}
          <div className="space-y-2 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/80">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold text-xs flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-amber-400" />
                <span>Adres Webhooka Google Chat:</span>
              </label>
              {!isEditingWebhook ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditWebhookValue(currentWebhook);
                    setIsEditingWebhook(true);
                  }}
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Zmień</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingWebhook(false)}
                  className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
                >
                  Anuluj
                </button>
              )}
            </div>

            {!isEditingWebhook ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={currentWebhook}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-300 font-mono text-[11px] select-all focus:outline-none truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyWebhook}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-md shadow-amber-500/20 text-xs"
                >
                  {copiedWebhook ? <Check className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedWebhook ? 'Skopiowano!' : 'Kopiuj'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="url"
                  value={editWebhookValue}
                  onChange={(e) => setEditWebhookValue(e.target.value)}
                  placeholder="https://chat.googleapis.com/v1/spaces/.../messages?key=..."
                  className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleSaveEditedWebhook}
                    className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Zapisz nowy webhook</span>
                  </button>
                </div>
              </div>
            )}

            {savedSuccess && (
              <p className="text-emerald-400 text-[11px] font-medium">
                ✓ Pomyślnie zaktualizowano adres webhooka!
              </p>
            )}
          </div>

          {/* Prywatność */}
          <div className="bg-slate-800/40 p-3 rounded-2xl border border-slate-800 flex items-center gap-2 text-emerald-400 text-[11px]">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Wszystkie liczniki i historia przerw każdego pracownika pozostają w 100% prywatne na jego telefonie.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition cursor-pointer"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};

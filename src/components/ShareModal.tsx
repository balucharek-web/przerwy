import React, { useState } from 'react';
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
  Edit2,
  Save
} from 'lucide-react';
import { useBreaks, TEAM_SHARED_WEBHOOK } from '../context/BreakContext';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useBreaks();
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [isEditingWebhook, setIsEditingWebhook] = useState(false);
  const [editWebhookValue, setEditWebhookValue] = useState(settings.googleChatWebhookUrl || TEAM_SHARED_WEBHOOK);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const currentWebhook = settings.googleChatWebhookUrl || TEAM_SHARED_WEBHOOK;

  // Base app URL
  const baseUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}`
    : '';

  // App URL with embedded team webhook parameter for 1-scan setup
  const shareUrlWithWebhook = `${baseUrl}?webhook=${encodeURIComponent(currentWebhook)}`;

  // QR Code URL pointing directly to the auto-setup link
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(shareUrlWithWebhook)}&color=f59e0b&bgcolor=0f172a&margin=2`;

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

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'PrzerwaPro - Rejestrator Przerw (Google Chat)',
          text: 'Zeskanuj kod QR lub kliknij link, aby dołączyć do rejestratora przerw ze wspólnym webhookiem Google Chat:',
          url: shareUrlWithWebhook,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopyWebhook();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative text-slate-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Udostępnianie i Webhook</h3>
              <p className="text-xs text-slate-400">Wspólny webhook i kod QR dla kolegów z pracy</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto py-4 space-y-4 text-xs flex-1 pr-1">
          {/* Automatic Webhook Info Badge */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 flex items-start gap-3 text-amber-200">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <span className="font-bold text-white block text-xs">
                Wspólny Webhook Google Chat
              </span>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                Adres webhooka jest skonfigurowany w tym oknie. Gdy kolega zeskanuje poniższy kod QR swoim aparatem, aplikacja od razu pobierze ten webhook na jego telefon.
              </p>
            </div>
          </div>

          {/* QR Code Presentation Box */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
              <QrCode className="w-4 h-4" />
              <span>Zeskanuj aparatem telefonu</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3 max-w-xs">
              Skieruj aparat telefonu na kod, aby otworzyć aplikację z wgranym webhookiem:
            </p>

            <div className="p-3.5 rounded-2xl bg-slate-900 border-2 border-amber-500/40 shadow-xl shadow-amber-500/10">
              <img
                src={qrImageUrl}
                alt="Kod QR PrzerwaPro z Webhookiem"
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

          {/* Webhook Address Box (Tylko tutaj!) */}
          <div className="space-y-2 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-750">
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

            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center justify-center gap-2 transition cursor-pointer mt-1"
              >
                <Share2 className="w-4 h-4 text-amber-400" />
                <span>Wyślij koledze przez telefon (WhatsApp, SMS, Slack...)</span>
              </button>
            )}
          </div>

          {/* How it works for coworkers */}
          <div className="bg-slate-800/40 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-[11px] text-slate-300">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Instrukcja dla nowego pracownika:</span>
            </div>

            <ol className="list-decimal pl-4 space-y-1 text-slate-300">
              <li>Kolega skanuje ten kod QR aparatem telefonu (otwiera aplikację z wgranym webhookiem).</li>
              <li>W Ustawieniach wpisuje swoje imię, aby wiadomości Start/Stop były podpisane na czacie.</li>
            </ol>

            <div className="pt-2 border-t border-slate-700/60 flex items-center gap-2 text-emerald-400 text-[11px]">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Historia przerw i czas pracy każdego pracownika są całkowicie prywatne na jego telefonie.</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition cursor-pointer"
          >
            Gotowe
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  QrCode, 
  Users, 
  Smartphone, 
  Send, 
  ShieldCheck,
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';
import { useBreaks, TEAM_SHARED_WEBHOOK } from '../context/BreakContext';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const { settings } = useBreaks();
  const [copied, setCopied] = useState(false);
  const [copiedClean, setCopiedClean] = useState(false);

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

  const handleCopyLinkWithWebhook = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrlWithWebhook);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCopyCleanLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(baseUrl);
      setCopiedClean(true);
      setTimeout(() => setCopiedClean(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'PrzerwaPro - Rejestrator Przerw (Google Chat)',
          text: 'Zeskanuj lub kliknij link, aby dołączyć do rejestratora przerw z naszym wspólnym webhookiem Google Chat!',
          url: shareUrlWithWebhook,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopyLinkWithWebhook();
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
              <h3 className="text-base font-bold text-white">Udostępnij z Webhookiem</h3>
              <p className="text-xs text-slate-400">Jeden kod QR pobiera aplikację i webhook</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto py-4 space-y-5 text-xs flex-1 pr-1">
          {/* Automatic Webhook Badge */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 flex items-start gap-3 text-amber-200">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <span className="font-bold text-white block text-xs">
                Automatyczne pobranie Webhooka Google Chat!
              </span>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                Nowy kolega po prostu <strong>skanuje ten kod aparatem w telefonie</strong>. Aplikacja otworzy się u niego i od razu podłączy Wasz wspólny pokój Google Chat. Kolega musi tylko wpisać swoje imię!
              </p>
            </div>
          </div>

          {/* QR Code Presentation Box */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
              <QrCode className="w-4 h-4" />
              <span>Zeskanuj aparatem telefonu</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3 max-w-xs">
              Skieruj aparat telefonu na kod, aby otworzyć aplikację z gotowym webhookiem:
            </p>

            <div className="p-3.5 rounded-2xl bg-slate-900 border-2 border-amber-500/40 shadow-xl shadow-amber-500/10">
              <img
                src={qrImageUrl}
                alt="Kod QR PrzerwaPro z Webhookiem"
                width={200}
                height={200}
                className="rounded-xl block"
              />
            </div>

            <div className="mt-3 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-[10px] text-slate-400 flex items-center gap-1.5">
              <Send className="w-3 h-3 text-emerald-400" />
              <span>Pokój: <strong>spaces/AAAA94ZyILs</strong> (Wspólny webhook)</span>
            </div>
          </div>

          {/* Quick Share Link Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold text-xs flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Link z automatycznym webhookiem:</span>
              </label>
              <button
                type="button"
                onClick={handleCopyCleanLink}
                className="text-[10px] text-slate-500 hover:text-slate-300 transition"
                title="Kopiuj bez parametru webhooka"
              >
                {copiedClean ? 'Skopiowano czysty link' : 'Kopiuj czysty link'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrlWithWebhook}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-amber-300 font-mono text-[11px] select-all focus:outline-none truncate"
              />
              <button
                type="button"
                onClick={handleCopyLinkWithWebhook}
                className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-md shadow-amber-500/20"
              >
                {copied ? <Check className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Skopiowano!' : 'Kopiuj link'}</span>
              </button>
            </div>

            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center justify-center gap-2 transition cursor-pointer mt-1"
              >
                <Share2 className="w-4 h-4 text-amber-400" />
                <span>Wyślij koledze przez telefon (WhatsApp, Slack, SMS...)</span>
              </button>
            )}
          </div>

          {/* How it works for coworkers */}
          <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Instrukcja w 2 krokach dla nowego pracownika:</span>
            </div>

            <div className="space-y-2.5 text-[11px] text-slate-300">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </div>
                <div>
                  <strong className="text-white block font-semibold">Zeskanowanie kodu QR lub kliknięcie w link</strong>
                  <span className="text-slate-400">
                    Aplikacja otwiera się w przeglądarce telefonu i automatycznie zapisuje wspólny webhook pokoju Google Chat.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </div>
                <div>
                  <strong className="text-white block font-semibold">Wpisanie swojego imienia</strong>
                  <span className="text-slate-400">
                    Kolega wpisuje np. <em>Kasia</em> lub <em>Marek</em>. Przy każdym kliknięciu Start i Stop na czacie pojawi się podpis: <code className="text-amber-300 font-mono">Kasia: start</code> / <code className="text-amber-300 font-mono">Kasia: stop</code>.
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/60 flex items-center gap-2 text-emerald-400 text-[11px]">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Prywatność: Historia przerw i kalendarz każdego kolegi pozostają w 100% niezależne na jego telefonie.</span>
              </div>
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

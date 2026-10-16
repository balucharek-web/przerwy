import React, { useState } from 'react';
import { 
  X, 
  Github, 
  Copy, 
  Check, 
  Terminal, 
  ExternalLink, 
  FolderGit2, 
  ShieldCheck,
  Globe
} from 'lucide-react';

interface GitHubGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubGuideModal: React.FC<GitHubGuideModalProps> = ({ isOpen, onClose }) => {
  const [githubUser, setGithubUser] = useState('balucharek-web');
  const [repoName, setRepoName] = useState('przerwy');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const repoUrl = `https://github.com/${githubUser}/${repoName}.git`;

  const commands = [
    {
      title: 'Krok 1: Utwórz puste repozytorium na GitHub',
      desc: 'Wejdź na GitHub i kliknij "New repository".',
      link: 'https://github.com/new',
      cmd: `# W przeglądarce przejdź do: https://github.com/new\n# Podaj nazwę: ${repoName}\n# Wybierz "Public" lub "Private" i NIE twórz pliku README (mamy już kompletny projekt)`,
    },
    {
      title: 'Krok 2: Zainicjalizuj i dodaj pliki w terminalu projektu',
      desc: 'W katalogu aplikacji wykonaj polecenia:',
      cmd: `git init\ngit add .\ngit commit -m "feat: initial commit PrzerwaPro PWA break tracker"`,
    },
    {
      title: 'Krok 3: Połącz ze swoim GitHubem i wypchnij kod (push)',
      desc: 'Wypchnij gałąź główną do Twojego zdalnego repozytorium:',
      cmd: `git branch -M main\ngit remote add origin ${repoUrl}\ngit push -u origin main`,
    },
    {
      title: 'Krok 4 (Opcjonalnie): Aktualizacja w przyszłości',
      desc: 'Gdy wprowadzisz zmiany w aplikacji:',
      cmd: `git add .\ngit commit -m "Aktualizacja PrzerwaPro"\ngit push`,
    },
  ];

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyAllCommands = () => {
    const fullScript = `# Wdrożenie PrzerwaPro na GitHub\n\ngit init\ngit add .\ngit commit -m "feat: PrzerwaPro PWA break tracker"\ngit branch -M main\ngit remote add origin ${repoUrl}\ngit push -u origin main\n`;
    navigator.clipboard.writeText(fullScript);
    setCopiedIndex(99);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative text-slate-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-800 text-white border border-slate-700">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Wgraj projekt na Twój GitHub</h3>
              <p className="text-xs text-slate-400">Instrukcja krok po kroku i gotowe komendy</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto py-4 space-y-5 text-xs flex-1 pr-1">
          {/* Config inputs */}
          <div className="bg-slate-800/50 p-3.5 rounded-xl border border-slate-700/60 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Twój login na GitHub:</label>
              <input
                type="text"
                value={githubUser}
                onChange={(e) => setGithubUser(e.target.value.trim())}
                placeholder="np. marciniakk018"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Nazwa repozytorium:</label>
              <input
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value.trim())}
                placeholder="przerwapro"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Quick 1-Click Copy All */}
          <div className="flex items-center justify-between bg-gradient-to-r from-amber-500/15 via-blue-500/10 to-transparent p-3.5 rounded-xl border border-amber-500/30">
            <div>
              <div className="font-bold text-white text-xs">Szybkie wdrożenie (Wszystkie komendy)</div>
              <div className="text-[11px] text-slate-400">Skopiuj pełny skrypt jednym kliknięciem</div>
            </div>
            <button
              onClick={copyAllCommands}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
            >
              {copiedIndex === 99 ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedIndex === 99 ? 'Skopiowano!' : 'Kopiuj wszystkie'}</span>
            </button>
          </div>

          {/* Steps List */}
          <div className="space-y-4">
            {commands.map((step, idx) => (
              <div key={idx} className="bg-slate-800/30 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-200 text-xs flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center text-[10px] text-amber-400">
                      {idx + 1}
                    </span>
                    <span>{step.title}</span>
                  </div>
                  {step.link && (
                    <a
                      href={step.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <span>Otwórz GitHub</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <p className="text-slate-400 text-[11px]">{step.desc}</p>

                <div className="relative group">
                  <pre className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-[11px] font-mono text-amber-300 overflow-x-auto whitespace-pre leading-relaxed">
                    {step.cmd}
                  </pre>
                  <button
                    onClick={() => handleCopy(step.cmd, idx)}
                    className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                    title="Kopiuj polecenie"
                  >
                    {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Hosting Guide */}
          <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
            <div className="font-bold text-slate-300 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>Gdzie hostować aplikację za darmo po wgraniu na GitHub?</span>
            </div>
            <p>
              Po wrzuceniu na GitHub możesz w 1 minutę podpiąć darmowy hosting (np. <strong>Vercel</strong>, <strong>Netlify</strong> lub <strong>Cloudflare Pages</strong>). Wystarczy kliknąć <em>Import from GitHub</em>, a Twoja aplikacja PWA natychmiast otrzyma własną darmową domenę z certyfikatem SSL HTTPS (wymaganym przez PWA i instalację na telefonie)!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition"
          >
            Gotowe
          </button>
        </div>
      </div>
    </div>
  );
};

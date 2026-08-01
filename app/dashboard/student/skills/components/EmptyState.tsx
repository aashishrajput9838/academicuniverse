'use client';

import { useState } from 'react';
import { GraduationCap, Github, FileText, BookOpen, Sparkles, Loader2, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { useGitHubOAuth } from '@/hooks/useGitHubOAuth';

interface EmptyStateProps {
  onRetry?: () => void;
  syncing?: boolean;
}

export function EmptyState({ onRetry, syncing }: EmptyStateProps) {
  const { backendToken, user } = useAuth();
  const { connect: connectGitHub, triggerDirectConnect, exchangeCode, connecting } = useGitHubOAuth({
    backendToken,
    onConnected: onRetry,
  });

  const [showGithubModal, setShowGithubModal] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [redirectUrlInput, setRedirectUrlInput] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  const actions = [
    { icon: <GraduationCap className="w-5 h-5" />, label: 'Connect Academic Profile', description: 'Import your transcript', action: null },
    { icon: <Github className="w-5 h-5" />, label: 'Connect GitHub', description: 'Sync your repositories & skills', action: 'github' },
    { icon: <FileText className="w-5 h-5" />, label: 'Upload Certificates', description: 'Add professional certifications', action: null },
    { icon: <BookOpen className="w-5 h-5" />, label: 'Add Research', description: 'Link your publications', action: null },
  ];

  const handleAction = async (action: string | null) => {
    if (action === 'github') {
      setShowGithubModal(true);
    }
  };

  const handleDirectConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    try {
      await triggerDirectConnect(usernameInput.trim() || undefined);
      setShowGithubModal(false);
      onRetry?.();
    } catch (err: any) {
      setModalError(err.message || 'Failed to sync GitHub profile');
    }
  };

  return (
    <div className="text-center py-16 px-4">
      <div className="w-20 h-20 mx-auto mb-6 bg-slate-800/50 rounded-full flex items-center justify-center border border-slate-700">
        <GraduationCap className="w-10 h-10 text-slate-500" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">No Verified Skills Yet</h3>
      <p className="text-slate-400 max-w-md mx-auto mb-8">
        Your skills profile is empty. Start by connecting your data sources to build a comprehensive skill intelligence profile.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-3xl mx-auto">
        {actions.map((action, idx) => (
          <button
            key={idx}
            onClick={() => handleAction(action.action)}
            disabled={connecting || syncing}
            className={cn(
              'flex items-center gap-3 p-4 rounded-xl border transition-all text-left group',
              action.action
                ? 'border-slate-700 bg-slate-800/30 hover:border-emerald-500/30 hover:bg-slate-800/50 cursor-pointer'
                : 'border-slate-700 bg-slate-800/30 opacity-70 cursor-default'
            )}
          >
            <div className={cn(
              'p-2 rounded-lg transition-colors',
              action.action
                ? 'bg-slate-700/50 text-slate-400 group-hover:text-emerald-400 group-hover:bg-emerald-500/10'
                : 'bg-slate-700/50 text-slate-400'
            )}>
              {action.icon}
            </div>
            <div>
              <div className="text-white text-sm font-medium">{action.label}</div>
              <div className="text-slate-400 text-xs">{action.description}</div>
            </div>
          </button>
        ))}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-8 px-6 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium transition-colors border border-emerald-500/20"
        >
          Refresh Profile
        </button>
      )}

      {/* GitHub Connection Modal */}
      {showGithubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden text-left">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white">
                  <Github className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Connect GitHub Profile</h3>
                  <p className="text-xs text-slate-400">Sync repositories & automatically extract technical skills</p>
                </div>
              </div>
              <button
                onClick={() => setShowGithubModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Instant Username Sync Form */}
              <form onSubmit={handleDirectConnectSubmit} className="space-y-3 p-4 bg-slate-800/50 border border-slate-700/60 rounded-xl">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Instant GitHub Connect (Recommended)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Enter your GitHub username to instantly sync your repositories, languages, and skills without browser redirects.
                </p>
                <div>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Enter GitHub username (e.g. aashishrajput9838)..."
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={connecting}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Instant Sync Repositories & Skills</span>
                </button>
              </form>

              {/* Paste Redirect URL / Code Resolver Form */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setModalError(null);
                  if (!redirectUrlInput.trim()) return;

                  try {
                    let codeVal = redirectUrlInput.trim();
                    let stateVal = '';

                    if (codeVal.includes('code=')) {
                      const parsedUrl = new URL(codeVal.startsWith('http') ? codeVal : `http://localhost/${codeVal}`);
                      codeVal = parsedUrl.searchParams.get('code') || '';
                      stateVal = parsedUrl.searchParams.get('state') || '';
                    }

                    if (!codeVal) {
                      throw new Error('Could not find authorization code in the URL');
                    }

                    await exchangeCode(codeVal, stateVal);
                    setShowGithubModal(false);
                    onRetry?.();
                  } catch (err: any) {
                    setModalError(err.message || 'Failed to exchange code');
                  }
                }}
                className="space-y-2 p-3 bg-slate-800/30 border border-slate-800 rounded-xl"
              >
                <label className="block text-[11px] font-semibold text-slate-400">
                  Got a `localhost:10000` window? Paste redirected URL here:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={redirectUrlInput}
                    onChange={(e) => setRedirectUrlInput(e.target.value)}
                    placeholder="Paste http://localhost:10000/api/github/callback?code=... here"
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-mono"
                  />
                  <button
                    type="submit"
                    disabled={connecting || !redirectUrlInput.trim()}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shrink-0 transition disabled:opacity-50"
                  >
                    Sync URL
                  </button>
                </div>
              </form>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-800 w-full"></div>
                <span className="bg-slate-900 px-3 text-[10px] text-slate-500 font-mono uppercase absolute">OR</span>
              </div>

              {/* OAuth Flow Button */}
              <button
                type="button"
                onClick={async () => {
                  await connectGitHub();
                }}
                disabled={connecting}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <Github className="w-4 h-4" />
                <span>Open GitHub OAuth Window</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

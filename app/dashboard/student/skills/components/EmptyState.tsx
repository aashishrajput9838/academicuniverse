'use client';

import { useState, useEffect } from 'react';
import { GraduationCap, Github, FileText, BookOpen, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';

interface EmptyStateProps {
  onRetry?: () => void;
  syncing?: boolean;
}

export function EmptyState({ onRetry, syncing }: EmptyStateProps) {
  const { backendToken } = useAuth();
  const [connecting, setConnecting] = useState(false);

  const actions = [
    { icon: <GraduationCap className="w-5 h-5" />, label: 'Connect Academic Profile', description: 'Import your transcript', action: null },
    { icon: <Github className="w-5 h-5" />, label: 'Connect GitHub', description: 'Sync your repositories', action: 'github' },
    { icon: <FileText className="w-5 h-5" />, label: 'Upload Certificates', description: 'Add professional certifications', action: null },
    { icon: <BookOpen className="w-5 h-5" />, label: 'Add Research', description: 'Link your publications', action: null },
    { icon: <Code2 className="w-5 h-5" />, label: 'Complete Assessments', description: 'Take skill assessments', action: null },
  ];

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GITHUB_CONNECT_ERROR') {
        console.error('GitHub connection error:', event.data.error);
        setConnecting(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleAction = async (action: string | null) => {
    if (action === 'github' && backendToken) {
      setConnecting(true);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/github/connect`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${backendToken}`,
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to initiate GitHub OAuth');
        }

        const data = await response.json();
        if (data?.success && data?.data?.authUrl) {
          const width = 600;
          const height = 700;
          const left = window.screenX + (window.outerWidth - width) / 2;
          const top = window.screenY + (window.outerHeight - height) / 2;
          const popup = window.open(
            data.data.authUrl,
            'GitHub OAuth',
            `width=${width},height=${height},left=${left},top=${top}`
          );

          if (!popup) {
            setConnecting(false);
            alert('Popup was blocked. Please allow popups for this site.');
          } else {
            const pollTimer = setInterval(() => {
              if (popup.closed) {
                clearInterval(pollTimer);
                setConnecting(false);
              }
            }, 500);
          }
        } else {
          setConnecting(false);
        }
      } catch (error) {
        console.error('GitHub connect error:', error);
        setConnecting(false);
      }
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
    </div>
  );
}

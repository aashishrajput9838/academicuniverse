'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { apiRequest } from '@/utils/api';
import { CodeArenaNav } from '@/components/codeArena/CodeArenaNav';
import { AISuggestionsPanel } from '@/components/codeArena/AISuggestionsPanel';
import { SolutionCard } from '@/components/codeArena/SolutionCard';
import { SubmitSolutionModal } from '@/components/codeArena/SubmitSolutionModal';
import {
  Coins,
  MessageSquare,
  Eye,
  Calendar,
  User,
  Github,
  Link as LinkIcon,
  Download,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowLeft,
  XCircle,
  PlusCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const issueId = resolvedParams.id;

  const { user, backendUser, loading: authLoading } = useAuth();
  const router = useRouter();

  const [issue, setIssue] = useState<any>(null);
  const [solutions, setSolutions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !backendUser)) {
      router.push('/login');
    }
  }, [user, backendUser, authLoading, router]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [issueRes, solutionsRes, walletRes] = await Promise.all([
        apiRequest(`/api/code-arena/issues/${issueId}`),
        apiRequest(`/api/code-arena/solutions/${issueId}`),
        apiRequest('/api/code-arena/wallet/me'),
      ]);

      setIssue(issueRes.data);
      setSolutions(solutionsRes.data || []);
      setWalletBalance(walletRes.data?.balance || 0);
    } catch (err: any) {
      console.error('Failed to load issue detail:', err);
      setActionError(err.message || 'Failed to load issue');
    } font: {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && backendUser && issueId) {
      fetchData();
    }
  }, [user, backendUser, issueId]);

  const handleCancelIssue = async () => {
    if (!window.confirm('Are you sure you want to cancel this issue? Your locked escrow reward will be refunded to your wallet.')) {
      return;
    }

    try {
      await apiRequest(`/api/code-arena/issues/${issueId}`, { method: 'DELETE' });
      fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to cancel issue');
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400 border-opacity-50" />
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="space-y-6 pb-12">
        <CodeArenaNav walletBalance={walletBalance} />
        <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-400">
          <p className="text-sm">Issue not found or access denied.</p>
          <Link href="/dashboard/student/code/issues" className="inline-block mt-3 px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl">
            Back to Issues
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = backendUser?.id === issue.posterId;
  const userHasSubmitted = solutions.some((s) => s.submitterId === backendUser?.id);

  const formattedDate = new Date(issue.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5003';

  return (
    <div className="space-y-8 pb-12">
      <CodeArenaNav walletBalance={walletBalance} />

      {/* Back Link & Poster Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/student/code/issues"
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-medium transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Issues
        </Link>

        {isOwner && (issue.status === 'OPEN' || issue.status === 'IN_PROGRESS') && (
          <button
            onClick={handleCancelIssue}
            className="px-3.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold transition flex items-center gap-1.5"
          >
            <XCircle className="w-4 h-4" /> Cancel Issue & Refund Escrow
          </button>
        )}
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Issue Detail Box */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-white">
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              {issue.category}
            </span>

            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {issue.difficulty}
            </span>

            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {issue.status.replace('_', ' ')}
            </span>
          </div>

          {/* Reward Escrow Pill */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border border-amber-500/30 shadow-lg">
            <Coins className="w-5 h-5 text-yellow-400 animate-pulse" />
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Reward Escrow</span>
              <span className="text-base font-extrabold text-yellow-300">{issue.rewardAmount} CR</span>
            </div>
          </div>
        </div>

        {/* Title & Metadata */}
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
            {issue.title}
          </h1>

          <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <User className="w-4 h-4 text-emerald-400" /> Posted by {issue.posterName}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" /> {formattedDate}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-slate-500" /> {issue.viewCount} Views
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-slate-500" /> {solutions.length} Submissions
            </span>
          </div>
        </div>

        {/* Description Body */}
        <div className="pt-4 border-t border-slate-800">
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider">Description</h3>
          <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
            {issue.description}
          </div>
        </div>

        {/* Expected & Current Output */}
        {(issue.expectedOutput || issue.currentOutput) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
            {issue.expectedOutput && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-[11px] font-bold text-emerald-400 block mb-1">Expected Output / Behavior</span>
                <p className="text-xs text-slate-300 whitespace-pre-wrap">{issue.expectedOutput}</p>
              </div>
            )}

            {issue.currentOutput && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-[11px] font-bold text-rose-400 block mb-1">Current Output / Behavior</span>
                <p className="text-xs text-slate-300 whitespace-pre-wrap">{issue.currentOutput}</p>
              </div>
            )}
          </div>
        )}

        {/* Error Logs Code Block */}
        {issue.errorLogs && (
          <div className="pt-4 border-t border-slate-800">
            <span className="text-[11px] font-bold text-amber-400 block mb-2">Error Logs / Stack Trace</span>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto">
              <pre className="text-xs font-mono text-emerald-400">
                <code>{issue.errorLogs}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Tech Stack & Github Links */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-4 flex-wrap">
          {issue.techStack && issue.techStack.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {issue.techStack.map((tech: string, idx: number) => (
                <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-800 text-emerald-300 border border-slate-700 text-xs font-mono">
                  #{tech}
                </span>
              ))}
            </div>
          )}

          {issue.githubRepo && (
            <a
              href={issue.githubRepo}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs border border-slate-700 transition"
            >
              <Github className="w-4 h-4 text-emerald-400" /> View Repository
            </a>
          )}
        </div>

        {/* GridFS Attachments */}
        {issue.attachments && issue.attachments.length > 0 && (
          <div className="pt-4 border-t border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 block mb-2">Attachments</span>
            <div className="flex flex-wrap gap-3">
              {issue.attachments.map((att: any, idx: number) => (
                <a
                  key={idx}
                  href={`${apiBase}/api/code-arena/attachments/${att.storageId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="truncate max-w-xs">{att.fileName}</span>
                  <span className="text-[10px] text-slate-500">({Math.round(att.size / 1024)} KB)</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Suggestions Box */}
      <AISuggestionsPanel aiSuggestions={issue.aiSuggestions} />

      {/* Solutions Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" /> Submitted Solutions ({solutions.length})
            </h3>
            <p className="text-xs text-slate-400">Review solution proposals submitted by peer developers</p>
          </div>

          {!isOwner && (issue.status === 'OPEN' || issue.status === 'IN_PROGRESS') && (
            <button
              onClick={() => setShowSubmitModal(true)}
              disabled={userHasSubmitted}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              {userHasSubmitted ? 'Solution Already Submitted' : 'Submit Solution'}
            </button>
          )}
        </div>

        {solutions.length > 0 ? (
          <div className="space-y-4">
            {solutions.map((sol) => (
              <SolutionCard
                key={sol._id}
                solution={sol}
                issueOwnerId={issue.posterId}
                currentUserId={backendUser?.id}
                issueStatus={issue.status}
                rewardAmount={issue.rewardAmount}
                onSolutionAccepted={fetchData}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-400">
            <p className="text-xs">No solutions submitted yet.</p>
            {!isOwner && (
              <button
                onClick={() => setShowSubmitModal(true)}
                className="mt-3 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
              >
                Submit the first solution!
              </button>
            )}
          </div>
        )}
      </div>

      {/* Submit Solution Modal */}
      <SubmitSolutionModal
        issueId={issueId}
        issueTitle={issue.title}
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}

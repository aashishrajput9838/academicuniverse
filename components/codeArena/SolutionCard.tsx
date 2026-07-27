'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Code,
  Github,
  Link as LinkIcon,
  User,
  Calendar,
  FileText,
  Award,
  Lock,
} from 'lucide-react';
import { apiRequest } from '@/utils/api';

interface SolutionCardProps {
  solution: {
    _id: string;
    submitterName: string;
    submitterId: string;
    explanation: string;
    codeSnippets?: string[];
    githubCommitUrl?: string;
    githubPrUrl?: string;
    references?: string[];
    attachments?: { storageId: string; fileName: string; mimeType: string; size: number }[];
    isAccepted: boolean;
    acceptedAt?: string;
    createdAt: string;
  };
  issueOwnerId: string;
  currentUserId?: string;
  issueStatus: string;
  rewardAmount: number;
  onSolutionAccepted?: () => void;
}

export const SolutionCard: React.FC<SolutionCardProps> = ({
  solution,
  issueOwnerId,
  currentUserId,
  issueStatus,
  rewardAmount,
  onSolutionAccepted,
}) => {
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const isOwner = currentUserId && currentUserId === issueOwnerId;

  const handleAccept = async () => {
    if (!window.confirm(`Are you sure you want to accept this solution? This will release ${rewardAmount} CR from escrow to ${solution.submitterName} and close the issue.`)) {
      return;
    }

    try {
      setIsAccepting(true);
      setAcceptError(null);
      await apiRequest(`/api/code-arena/solutions/${solution._id}/accept`, {
        method: 'PUT',
      });
      onSolutionAccepted?.();
    } catch (err: any) {
      setAcceptError(err.message || 'Failed to accept solution');
    } finally {
      setIsAccepting(false);
    }
  };

  const formattedDate = new Date(solution.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`rounded-2xl p-5 border transition-all shadow-xl relative ${
        solution.isAccepted
          ? 'bg-emerald-950/20 border-emerald-500/50 ring-1 ring-emerald-500/30'
          : 'bg-slate-900/80 border-slate-800'
      }`}
    >
      {solution.isAccepted && (
        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold shadow-md">
          <CheckCircle2 className="w-4 h-4" /> Accepted Solution
        </div>
      )}

      {/* Header: Submitter Name & Date */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-emerald-400">
          {solution.submitterName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            {solution.submitterName}
          </h4>
          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-500" />
            {formattedDate}
          </p>
        </div>
      </div>

      {acceptError && (
        <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          {acceptError}
        </div>
      )}

      {/* Explanation Text */}
      <div className="prose prose-invert max-w-none text-xs text-slate-300 mb-4 whitespace-pre-wrap leading-relaxed">
        {solution.explanation}
      </div>

      {/* Code Snippets */}
      {solution.codeSnippets && solution.codeSnippets.length > 0 && (
        <div className="space-y-3 mb-4">
          {solution.codeSnippets.map((snippet, idx) => (
            <div key={idx} className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
              <div className="bg-slate-900 px-3 py-1.5 border-b border-slate-800 flex items-center gap-1.5 text-[10px] text-slate-400">
                <Code className="w-3.5 h-3.5 text-emerald-400" /> Solution Code #{idx + 1}
              </div>
              <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto">
                <code>{snippet}</code>
              </pre>
            </div>
          ))}
        </div>
      )}

      {/* GitHub Links & References */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        {solution.githubCommitUrl && (
          <a
            href={solution.githubCommitUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono transition"
          >
            <Github className="w-3.5 h-3.5 text-white" /> View Commit
          </a>
        )}

        {solution.githubPrUrl && (
          <a
            href={solution.githubPrUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono transition"
          >
            <Github className="w-3.5 h-3.5 text-white" /> View Pull Request
          </a>
        )}

        {solution.references &&
          solution.references.map((refUrl, idx) => (
            <a
              key={idx}
              href={refUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              <LinkIcon className="w-3.5 h-3.5 text-emerald-400" /> Reference #{idx + 1}
            </a>
          ))}
      </div>

      {/* Action Bar: Accept Solution */}
      {isOwner && !solution.isAccepted && issueStatus !== 'SOLVED' && (
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Accepting this solution will transfer <strong className="text-amber-400">{rewardAmount} CR</strong> from escrow to {solution.submitterName}.
          </span>

          <button
            onClick={handleAccept}
            disabled={isAccepting}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
          >
            {isAccepting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Releasing Escrow...
              </>
            ) : (
              <>
                <Award className="w-4 h-4" /> Accept Solution & Award Reward
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

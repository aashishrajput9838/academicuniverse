'use client';

import React from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Eye,
  Calendar,
  User,
  CheckCircle2,
  Lock,
  Bookmark,
  HeartHandshake,
  Sparkles,
} from 'lucide-react';

interface IssueCardProps {
  issue: {
    _id: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    status: string;
    rewardAmount: number;
    isCommunityHelp?: boolean;
    posterName: string;
    posterId: string;
    createdAt: string;
    solutionCount: number;
    viewCount: number;
    tags?: string[];
    techStack?: string[];
    savedBy?: string[];
  };
  currentUserId?: string;
  onToggleSave?: (issueId: string) => void;
}

export const IssueCard: React.FC<IssueCardProps> = ({ issue, currentUserId, onToggleSave }) => {
  const isSaved = currentUserId && issue.savedBy?.includes(currentUserId);
  const isCommunity = issue.rewardAmount === 0 || issue.isCommunityHelp;

  const difficultyColors: Record<string, string> = {
    EASY: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    MEDIUM: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    HARD: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    EXPERT: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  const statusColors: Record<string, { bg: string; text: string; icon: any }> = {
    OPEN: { bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400', icon: Sparkles },
    IN_PROGRESS: { bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-400', icon: Lock },
    SOLVED: { bg: 'bg-cyan-500/10 border-cyan-500/30', text: 'text-cyan-400', icon: CheckCircle2 },
    CLOSED: { bg: 'bg-slate-700/30 border-slate-700', text: 'text-slate-400', icon: Lock },
    CANCELLED: { bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-400', icon: Lock },
  };

  const currentStatus = statusColors[issue.status] || statusColors.OPEN;
  const StatusIcon = currentStatus.icon;

  const formattedDate = new Date(issue.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="group bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-emerald-500/40 transition-all duration-300 shadow-lg hover:shadow-xl flex flex-col justify-between relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div>
        {/* Header Row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              {issue.category}
            </span>

            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                difficultyColors[issue.difficulty] || difficultyColors.MEDIUM
              }`}
            >
              {issue.difficulty}
            </span>

            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${currentStatus.bg} ${currentStatus.text}`}
            >
              <StatusIcon className="w-3 h-3" />
              {issue.status.replace('_', ' ')}
            </span>
          </div>

          {onToggleSave && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onToggleSave(issue._id);
              }}
              className={`p-1.5 rounded-lg transition ${
                isSaved ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 hover:text-slate-300'
              }`}
              title={isSaved ? 'Remove Bookmark' : 'Bookmark Issue'}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-emerald-400' : ''}`} />
            </button>
          )}
        </div>

        {/* Issue Title */}
        <Link href={`/dashboard/student/code/issues/${issue._id}`} className="block group-hover:text-emerald-400 transition">
          <h3 className="text-base font-bold text-white line-clamp-2 mb-2 group-hover:text-emerald-400 transition">
            {issue.title}
          </h3>
        </Link>

        {/* Description Snippet */}
        <p className="text-xs text-slate-400 line-clamp-2 mb-4">
          {issue.description.replace(/#+\s/g, '').replace(/[*_`]/g, '')}
        </p>

        {/* Tech Stack Pills */}
        {((issue.techStack && issue.techStack.length > 0) || (issue.tags && issue.tags.length > 0)) && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {(issue.techStack || issue.tags || []).slice(0, 4).map((tech, idx) => (
              <span
                key={idx}
                className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/80 text-emerald-300 border border-slate-700/60 font-mono"
              >
                #{tech}
              </span>
            ))}
            {(issue.techStack || issue.tags || []).length > 4 && (
              <span className="text-[10px] text-slate-500 py-0.5">
                +{(issue.techStack || issue.tags || []).length - 4} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer Row: Reward AP Badge or Community Help Badge */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
        {isCommunity ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-bold">
            <HeartHandshake className="w-4 h-4 text-teal-400" />
            <span>Community Help</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border border-amber-500/30">
            <span className="text-sm font-extrabold text-amber-400">⚡ {issue.rewardAmount} AP</span>
          </div>
        )}

        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1" title="Submissions">
            <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
            {issue.solutionCount}
          </span>
          <span className="flex items-center gap-1" title="Views">
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            {issue.viewCount}
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <Calendar className="w-3.5 h-3.5" />
            {formattedDate}
          </span>
        </div>
      </div>
    </div>
  );
};

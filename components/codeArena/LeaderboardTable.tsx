'use client';

import React from 'react';
import { Trophy, Award, CheckCircle2, Flame, User } from 'lucide-react';

interface LeaderboardTableProps {
  leaderboard: {
    _id: string;
    userId: string;
    totalEarned: number;
    arenaPoints: number;
    issuesSolved: number;
    solutionsAccepted: number;
    acceptanceRate: number;
    totalPoints: number;
    badges?: string[];
  }[];
  currentUserId?: string;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({ leaderboard, currentUserId }) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" /> Developer Leaderboard
          </h3>
          <p className="text-xs text-slate-400">Ranked by Total AP Earned & Solutions Accepted</p>
        </div>
      </div>

      {leaderboard.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Developer</th>
                <th className="px-4 py-3 text-right">Total AP Earned</th>
                <th className="px-4 py-3 text-right">Issues Solved</th>
                <th className="px-4 py-3 text-right">Acceptance Rate</th>
                <th className="px-4 py-3">Badges</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, idx) => {
                const rank = idx + 1;
                const isMe = currentUserId && entry.userId === currentUserId;

                return (
                  <tr
                    key={entry._id}
                    className={`border-b border-slate-800/80 transition ${
                      isMe ? 'bg-emerald-950/20 border-emerald-500/30' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Rank */}
                    <td className="px-4 py-3.5 font-bold text-sm">
                      {rank === 1 ? (
                        <span className="text-xl">🥇</span>
                      ) : rank === 2 ? (
                        <span className="text-xl">🥈</span>
                      ) : rank === 3 ? (
                        <span className="text-xl">🥉</span>
                      ) : (
                        <span className="text-slate-400 font-mono">#{rank}</span>
                      )}
                    </td>

                    {/* Developer */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-emerald-400 text-xs">
                          {entry.userId.slice(-2).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block flex items-center gap-1.5">
                            User #{entry.userId.slice(-6)}
                            {isMe && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                YOU
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* AP Earned */}
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-xs text-amber-400">
                      +{entry.totalEarned.toLocaleString()} AP
                    </td>

                    {/* Issues Solved */}
                    <td className="px-4 py-3.5 text-right font-bold text-xs text-white">
                      {entry.issuesSolved}
                    </td>

                    {/* Acceptance Rate */}
                    <td className="px-4 py-3.5 text-right text-xs font-bold text-emerald-400">
                      {entry.acceptanceRate || 0}%
                    </td>

                    {/* Badges */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {entry.badges && entry.badges.length > 0 ? (
                          entry.badges.slice(0, 3).map((badge, bIdx) => (
                            <span
                              key={bIdx}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold"
                            >
                              🏆 {badge.replace('_', ' ')}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">Member</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-2xl text-slate-500 text-xs">
          No developers on the leaderboard yet. Solve community issues to earn AP and rank #1!
        </div>
      )}
    </div>
  );
};

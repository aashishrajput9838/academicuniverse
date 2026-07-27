'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Calendar, Flame, ArrowUpRight, History, CheckCircle2, Award } from 'lucide-react';
import { apiRequest } from '@/utils/api';

interface ArenaPointsCardProps {
  arenaPoints?: number;
  totalEarned?: number;
  totalSpent?: number;
  loginStreak?: number;
  claimedToday?: boolean;
  isNewUser?: boolean;
  onClaimSuccess?: () => void;
}

export const ArenaPointsCard: React.FC<ArenaPointsCardProps> = ({
  arenaPoints = 1000,
  totalEarned = 1000,
  totalSpent = 0,
  loginStreak = 1,
  claimedToday = false,
  isNewUser = false,
  onClaimSuccess,
}) => {
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);

  const handleClaimDaily = async () => {
    try {
      setIsClaiming(true);
      const res = await apiRequest('/api/code-arena/points/claim-daily', { method: 'POST' });
      setClaimMessage(res.message || 'Daily reward claimed!');
      onClaimSuccess?.();
    } catch (err: any) {
      setClaimMessage(err.message || 'Failed to claim daily reward');
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950/40 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden text-white">
      {/* Background ambient glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* New User Welcome Banner */}
      {isNewUser && (
        <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border border-amber-500/30 text-xs">
          <span className="font-bold text-amber-300 block mb-0.5">🎉 Welcome to Code Arena!</span>
          <span className="text-slate-300">
            <strong>1000 Arena Points (AP)</strong> have been credited to your account. Post issues, help fellow developers, earn more AP, and climb the leaderboard!
          </span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-lg">
            ⚡
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Arena Points Balance</h3>
            <p className="text-[11px] text-slate-400">Platform community currency</p>
          </div>
        </div>

        {/* Daily Reward Claim Button */}
        <button
          onClick={handleClaimDaily}
          disabled={claimedToday || isClaiming}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition ${
            claimedToday
              ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-default'
              : 'bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 shadow-md shadow-amber-500/20'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          {claimedToday ? 'Daily Reward Claimed' : '+5 AP Daily Login'}
        </button>
      </div>

      {claimMessage && (
        <div className="mb-3 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{claimMessage}</span>
        </div>
      )}

      {/* AP Balance Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 font-medium block mb-1">Available Points</span>
          <span className="text-xl font-extrabold text-amber-400 tracking-tight">{arenaPoints.toLocaleString()} AP</span>
        </div>

        <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 font-medium block mb-1">Daily Streak</span>
          <span className="text-lg font-bold text-emerald-400 flex items-center gap-1">
            <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
            {loginStreak} Days
          </span>
        </div>

        <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 font-medium block mb-1">Total AP Earned</span>
          <span className="text-lg font-bold text-cyan-400">+{totalEarned.toLocaleString()} AP</span>
        </div>

        <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 font-medium block mb-1">Total AP Spent</span>
          <span className="text-lg font-bold text-slate-300">{totalSpent.toLocaleString()} AP</span>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Earn AP by solving technical issues & logging in daily
        </span>

        <Link
          href="/dashboard/student/code/ledger"
          className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 transition"
        >
          AP Ledger <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};

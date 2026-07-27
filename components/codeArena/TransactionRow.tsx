'use client';

import React from 'react';
import { Sparkles, Calendar, Flame, ArrowUpRight, ArrowDownLeft, RefreshCw, Award } from 'lucide-react';

interface TransactionRowProps {
  tx: {
    _id: string;
    type: string;
    amount: number;
    balanceAfter: number;
    description: string;
    createdAt: string;
    counterpartyUserId?: string;
  };
}

export const TransactionRow: React.FC<TransactionRowProps> = ({ tx }) => {
  const typeConfig: Record<string, { label: string; color: string; bg: string; icon: any; sign: string }> = {
    WELCOME_BONUS: {
      label: 'Welcome Bonus',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      icon: Sparkles,
      sign: '+',
    },
    DAILY_LOGIN: {
      label: 'Daily Login',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      icon: Calendar,
      sign: '+',
    },
    STREAK_BONUS: {
      label: 'Streak Bonus',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      icon: Flame,
      sign: '+',
    },
    ISSUE_CREATED: {
      label: 'Issue Post Reward',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20',
      icon: ArrowUpRight,
      sign: '',
    },
    ISSUE_REWARD: {
      label: 'Solution Reward Earned',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      icon: ArrowDownLeft,
      sign: '+',
    },
    ISSUE_REFUND: {
      label: 'Issue AP Refund',
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20',
      icon: RefreshCw,
      sign: '+',
    },
    ADMIN_ADJUSTMENT: {
      label: 'Admin Adjustment',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
      icon: Award,
      sign: '',
    },
  };

  const config = typeConfig[tx.type] || typeConfig.WELCOME_BONUS;
  const Icon = config.icon;

  const formattedDate = new Date(tx.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const displayAmount = tx.amount > 0 ? `+${tx.amount}` : `${tx.amount}`;

  return (
    <tr className="border-b border-slate-800/80 hover:bg-slate-800/40 transition">
      {/* Type & Icon */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border ${config.bg}`}>
            <Icon className={`w-4 h-4 ${config.color}`} />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">{config.label}</span>
            <span className="text-[10px] text-slate-500">{formattedDate}</span>
          </div>
        </div>
      </td>

      {/* Description */}
      <td className="px-4 py-3.5 text-xs text-slate-300">
        {tx.description}
      </td>

      {/* Amount */}
      <td className="px-4 py-3.5 text-right font-mono font-bold text-xs">
        <span className={tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}>
          {displayAmount} AP
        </span>
      </td>

      {/* Balance Snapshot */}
      <td className="px-4 py-3.5 text-right font-mono text-xs text-amber-400">
        {tx.balanceAfter} AP
      </td>
    </tr>
  );
};

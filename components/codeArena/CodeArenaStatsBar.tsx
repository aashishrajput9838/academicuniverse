'use client';

import React from 'react';
import { HelpCircle, CheckCircle2, Users, Trophy } from 'lucide-react';

interface CodeArenaStatsBarProps {
  openIssues?: number;
  solvedToday?: number;
  activeDevelopers?: number;
  totalRewardPool?: number;
  isLoading?: boolean;
}

export const CodeArenaStatsBar: React.FC<CodeArenaStatsBarProps> = ({
  openIssues = 0,
  solvedToday = 0,
  activeDevelopers = 0,
  totalRewardPool = 0,
  isLoading = false,
}) => {
  const stats = [
    {
      label: 'Open Issues',
      value: openIssues,
      icon: HelpCircle,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      label: 'Solved Today',
      value: solvedToday,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'Active Developers',
      value: activeDevelopers,
      icon: Users,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20',
    },
    {
      label: 'Total AP Reward Pool',
      value: `${totalRewardPool.toLocaleString()} AP`,
      icon: Trophy,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10 border-yellow-500/20',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-slate-800/60 rounded-2xl animate-pulse border border-slate-700/50" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className={`p-4 rounded-2xl bg-slate-900/80 border ${stat.bg} backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] shadow-lg flex items-center justify-between`}
          >
            <div>
              <p className="text-xs text-slate-400 font-medium mb-1">{stat.label}</p>
              <h3 className={`text-xl sm:text-2xl font-bold ${stat.color} tracking-tight`}>{stat.value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${stat.bg}`}>
              <Icon className={`w-5 h-5 ${stat.color}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

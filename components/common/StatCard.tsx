'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  subtitle?: string;
  accentColor?: 'emerald' | 'cyan' | 'purple' | 'amber' | 'blue';
  className?: string;
}

const accentMap = {
  emerald: {
    icon: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  cyan: {
    icon: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
  purple: {
    icon: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
  amber: {
    icon: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  blue: {
    icon: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
};

export function StatCard({ label, value, icon: Icon, subtitle, accentColor = 'emerald', className }: StatCardProps) {
  const accent = accentMap[accentColor];

  return (
    <div
      className={cn(
        'bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4',
        'flex flex-col gap-2',
        className
      )}
    >
      {Icon && (
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center border', accent.bg, accent.border)}>
          <Icon className={cn('w-4 h-4', accent.icon)} />
        </div>
      )}
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
      {subtitle && <p className="text-[10px] text-slate-500">{subtitle}</p>}
    </div>
  );
}

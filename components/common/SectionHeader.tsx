'use client';

import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: 'emerald' | 'cyan' | 'purple' | 'amber';
  className?: string;
}

const badgeColorMap = {
  emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
  purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
};

export function SectionHeader({ title, subtitle, badge, badgeColor = 'emerald', className }: SectionHeaderProps) {
  return (
    <div className={cn('mb-4', className)}>
      {badge && (
        <span
          className={cn(
            'inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold border mb-2',
            badgeColorMap[badgeColor]
          )}
        >
          {badge}
        </span>
      )}
      <h2 className="text-lg font-bold text-white">{title}</h2>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
}

'use client';

import { TrendingUp } from 'lucide-react';
import { SkillGrowthStage, ProficiencyLevel } from '../types/skills';
import { cn } from '@/lib/utils';

const stageColors: Record<ProficiencyLevel, string> = {
  BEGINNER: 'bg-red-500',
  INTERMEDIATE: 'bg-yellow-500',
  ADVANCED: 'bg-blue-500',
  EXPERT: 'bg-emerald-500',
};

interface SkillGrowthTrackerProps {
  stages: SkillGrowthStage[];
}

export function SkillGrowthTracker({ stages }: SkillGrowthTrackerProps) {
  if (!stages || stages.length === 0) {
    return (
      <div className="text-center py-6 text-slate-400 text-sm">
        No historical progression data available yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
        Skill Growth
      </h4>
      <div className="relative">
        {stages.map((stage, idx) => (
          <div key={idx} className="flex items-start gap-4 relative">
            {idx < stages.length - 1 && (
              <div className="absolute left-[11px] top-6 w-0.5 h-[calc(100%-12px)] bg-slate-700" />
            )}
            <div className={cn('w-6 h-6 rounded-full border-2 border-slate-900 shrink-0 z-10', stageColors[stage.level])} />
            <div className="flex-1 pb-4">
              <div className="text-white font-medium text-sm">{stage.level}</div>
              <div className="text-slate-400 text-xs mt-0.5">{stage.source}</div>
              <div className="text-slate-500 text-xs mt-0.5">
                {new Date(stage.achievedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

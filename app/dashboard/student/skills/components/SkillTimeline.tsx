'use client';

import { SkillEvidenceDTO } from '../types/skills';
import { cn } from '@/lib/utils';

interface SkillTimelineProps {
  evidence: SkillEvidenceDTO[];
}

export function SkillTimeline({ evidence }: SkillTimelineProps) {
  if (!evidence || evidence.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p>No timeline data available.</p>
      </div>
    );
  }

  const sorted = [...evidence].sort(
    (a, b) => {
      const dateA = a.primarySource === 'GITHUB' && a.sourceDetails?.metadata?.firstCommitDate
        ? new Date(a.sourceDetails.metadata.firstCommitDate).getTime()
        : new Date(a.effectiveFrom).getTime();
      const dateB = b.primarySource === 'GITHUB' && b.sourceDetails?.metadata?.firstCommitDate
        ? new Date(b.sourceDetails.metadata.firstCommitDate).getTime()
        : new Date(b.effectiveFrom).getTime();
      return dateA - dateB;
    }
  );

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
        Skill Evolution Timeline
      </h4>
      <div className="relative">
        {sorted.map((item, idx) => (
          <div key={item.id} className="flex items-start gap-4 relative pb-6">
            {idx < sorted.length - 1 && (
              <div className="absolute left-[11px] top-6 w-0.5 h-[calc(100%-12px)] bg-slate-700" />
            )}
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 border-2 border-emerald-500 shrink-0 z-10 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-medium text-sm capitalize">
                  {item.primarySource.replace(/_/g, ' ')}
                </span>
                {item.sourceSubtype && (
                  <span className="text-slate-500 text-xs">• {item.sourceSubtype}</span>
                )}
              </div>
              <div className="text-slate-400 text-xs mb-1">
                {new Date(
                  item.primarySource === 'GITHUB' && item.sourceDetails?.metadata?.firstCommitDate
                    ? item.sourceDetails.metadata.firstCommitDate
                    : item.effectiveFrom
                ).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-400 font-medium">{Math.round(item.confidence * 100)}%</span>
                <span className="text-slate-500">confidence</span>
                <span className="text-slate-500">•</span>
                <span className="capitalize text-slate-400">{item.status.toLowerCase()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';

import { SkillEvidenceDTO } from '../types/skills';
import { cn } from '@/lib/utils';

interface SkillTimelineProps {
  evidence: SkillEvidenceDTO[];
  timelineData?: Array<{ year: number; evidenceCount: number; proficiencyScore: number }>;
}

export function SkillTimeline({ evidence, timelineData }: SkillTimelineProps) {
  return (
    <div className="space-y-6">
      {/* Yearly Dynamic Evolution Bar Chart */}
      {timelineData && timelineData.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            Multi-Year Skill Evolution ({timelineData[0].year} – {timelineData[timelineData.length - 1].year})
          </h4>
          <div className="space-y-2.5">
            {timelineData.map((entry) => (
              <div key={entry.year} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300 font-semibold">{entry.year}</span>
                  <span className="text-emerald-400">{entry.proficiencyScore}% ({entry.evidenceCount} artifacts)</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 border border-slate-700">
                  <div
                    className="bg-gradient-to-r from-emerald-600 to-cyan-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${entry.proficiencyScore}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Granular Evidence Log Timeline */}
      {(!evidence || evidence.length === 0) ? (
        <div className="text-center py-4 text-slate-400 text-xs">
          <p>No granular evidence timeline records found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Verified Evidence Artifact Log
          </h4>
          <div className="relative pl-2">
            {evidence.map((item, idx) => (
              <div key={item.id} className="flex items-start gap-3 relative pb-5">
                {idx < evidence.length - 1 && (
                  <div className="absolute left-[9px] top-5 w-0.5 h-[calc(100%-10px)] bg-slate-800" />
                )}
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 border-2 border-emerald-500 shrink-0 z-10 flex items-center justify-center mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 min-w-0 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-white font-medium text-xs capitalize">
                      {item.primarySource.replace(/_/g, ' ')}
                    </span>
                    <span className="text-emerald-400 font-mono text-[11px]">
                      Confidence: {Math.round(item.confidence * 100)}%
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] font-mono">
                    {new Date(item.effectiveFrom).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { SkillEvidenceDTO, EvidenceSourceType } from '../types/skills';
import { cn } from '@/lib/utils';

interface SourceContributionChartProps {
  evidence: SkillEvidenceDTO[];
}

export function SourceContributionChart({ evidence }: SourceContributionChartProps) {
  if (!evidence || evidence.length === 0) {
    return (
      <div className="text-center py-6 text-slate-400 text-sm">
        No evidence data available for contribution analysis.
      </div>
    );
  }

  const sourceCounts: Record<string, { count: number; label: string }> = {};
  for (const item of evidence) {
    const key = item.primarySource;
    if (!sourceCounts[key]) {
      sourceCounts[key] = { count: 0, label: formatSourceLabel(key) };
    }
    sourceCounts[key].count++;
  }

  const total = evidence.length;
  const entries = Object.entries(sourceCounts)
    .map(([source, data]) => ({
      source: source as EvidenceSourceType,
      label: data.label,
      count: data.count,
      percentage: (data.count / total) * 100,
    }))
    .sort((a, b) => b.percentage - a.percentage);

  const barColors = [
    'bg-emerald-500',
    'bg-blue-500',
    'bg-purple-500',
    'bg-amber-500',
    'bg-cyan-500',
    'bg-pink-500',
    'bg-orange-500',
    'bg-slate-500',
  ];

  return (
    <div className="space-y-4">
      {entries.map((entry, idx) => (
        <div key={entry.source} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300">{entry.label}</span>
            <span className="text-slate-400">
              {entry.count} ({entry.percentage.toFixed(1)}%)
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className={cn('h-2 rounded-full transition-all duration-500', barColors[idx % barColors.length])}
              style={{ width: `${entry.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function formatSourceLabel(source: string): string {
  return source
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

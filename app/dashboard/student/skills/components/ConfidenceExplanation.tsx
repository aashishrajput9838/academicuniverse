'use client';

import { Shield, CheckCircle2 } from 'lucide-react';
import { SkillEvidenceDTO, EvidenceSourceType } from '../types/skills';
import { cn } from '@/lib/utils';

interface ConfidenceExplanationProps {
  confidence: number;
  evidence: SkillEvidenceDTO[];
}

export function ConfidenceExplanation({ confidence, evidence }: ConfidenceExplanationProps) {
  const evidenceBySource = new Map<string, SkillEvidenceDTO[]>();
  for (const e of evidence) {
    const key = e.primarySource;
    if (!evidenceBySource.has(key)) {
      evidenceBySource.set(key, []);
    }
    evidenceBySource.get(key)!.push(e);
  }

  const reasons = Array.from(evidenceBySource.entries()).map(([source, items]) => {
    const count = items.length;
    const avgConfidence = items.reduce((sum, i) => sum + i.confidence, 0) / count;
    return { source: source as EvidenceSourceType, count, avgConfidence };
  });

  const sourceLabels: Record<EvidenceSourceType, string> = {
    ACADEMIC_RECORD: 'Academic Records',
    GITHUB: 'GitHub Repositories',
    CERTIFICATE: 'Certificates',
    RESEARCH: 'Research Papers',
    CODING_ARENA: 'Coding Arena Submissions',
    PROJECT: 'Projects',
    ASSESSMENT: 'Assessments',
    MANUAL: 'Manual Evidence',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
          <Shield className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <div className="text-2xl font-bold text-white">{Math.round(confidence * 100)}%</div>
          <div className="text-sm text-slate-400">Confidence Score</div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-slate-300">Because:</p>
        <ul className="space-y-2">
          {reasons.map((reason) => (
            <li key={reason.source} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300">
                {reason.count} {sourceLabels[reason.source] || reason.source}
                {reason.count > 1 ? 's' : ''}
              </span>
              <span className="text-slate-500 text-xs ml-auto">
                {Math.round(reason.avgConfidence * 100)}% avg
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

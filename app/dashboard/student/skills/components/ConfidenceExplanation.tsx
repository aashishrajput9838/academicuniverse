'use client';

import { Shield, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
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
    const explanation = items[0]?.explanation;
    const isSourceDefault = explanation?.isSourceDefault ?? true;
    return { source: source as EvidenceSourceType, count, avgConfidence, isSourceDefault, explanation };
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

  const overallIsSourceDefault = reasons.every(r => r.isSourceDefault);
  const primarySource = reasons[0]?.source;
  const primaryExplanation = reasons[0]?.explanation;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
          <Shield className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <div className="text-2xl font-bold text-white">{Math.round(confidence * 100)}%</div>
          <div className="text-sm text-slate-400">
            {overallIsSourceDefault ? 'Source Default Confidence' : 'Average Confidence'}
          </div>
        </div>
      </div>

      {overallIsSourceDefault && primaryExplanation && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-200">
            This confidence value is a <strong>source default</strong>, not a repository quality assessment.
            {primaryExplanation.description}
          </p>
        </div>
      )}

      {!overallIsSourceDefault && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <AlertTriangle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-200">
            Confidence values vary across evidence items. Some evidence uses custom confidence values
            instead of source defaults.
          </p>
        </div>
      )}

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
              {reason.isSourceDefault && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 border border-slate-600">
                  default
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {primarySource === 'GITHUB' && (
        <div className="text-xs text-slate-500 mt-2">
          GitHub evidence confidence is currently a fixed source default. Future versions will assess
          each repository individually based on size, activity, and community engagement.
        </div>
      )}
    </div>
  );
}

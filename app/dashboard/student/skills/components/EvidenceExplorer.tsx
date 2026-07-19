'use client';

import { FileText, Github, GraduationCap, BookOpen, Code2, Briefcase, ClipboardCheck, User, ExternalLink } from 'lucide-react';
import { SkillEvidenceDTO, EvidenceSourceType } from '../types/skills';
import { cn } from '@/lib/utils';

const sourceIcons: Record<EvidenceSourceType, React.ReactNode> = {
  ACADEMIC_RECORD: <GraduationCap className="w-5 h-5" />,
  GITHUB: <Github className="w-5 h-5" />,
  CERTIFICATE: <FileText className="w-5 h-5" />,
  RESEARCH: <BookOpen className="w-5 h-5" />,
  CODING_ARENA: <Code2 className="w-5 h-5" />,
  PROJECT: <Briefcase className="w-5 h-5" />,
  ASSESSMENT: <ClipboardCheck className="w-5 h-5" />,
  MANUAL: <User className="w-5 h-5" />,
};

const sourceLabels: Record<EvidenceSourceType, string> = {
  ACADEMIC_RECORD: 'Academic Record',
  GITHUB: 'GitHub',
  CERTIFICATE: 'Certificate',
  RESEARCH: 'Research',
  CODING_ARENA: 'Coding Arena',
  PROJECT: 'Project',
  ASSESSMENT: 'Assessment',
  MANUAL: 'Manual Evidence',
};

const sourceColors: Record<EvidenceSourceType, string> = {
  ACADEMIC_RECORD: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  GITHUB: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  CERTIFICATE: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  RESEARCH: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  CODING_ARENA: 'bg-green-500/10 text-green-400 border-green-500/20',
  PROJECT: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  ASSESSMENT: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  MANUAL: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
};

interface EvidenceExplorerProps {
  evidence: SkillEvidenceDTO[];
}

export function EvidenceExplorer({ evidence }: EvidenceExplorerProps) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!evidence || evidence.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No evidence records found for this skill.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
        Evidence Sources ({evidence.length})
      </h4>
      <div className="space-y-2.5">
        {evidence.map((item) => (
          <div
            key={item.id}
            className={cn(
              'flex items-start gap-3 p-3.5 rounded-lg border transition-colors',
              'bg-slate-800/30 border-slate-700 hover:border-slate-600',
            )}
          >
            <div
              className={cn(
                'p-2 rounded-lg border shrink-0',
                sourceColors[item.primarySource],
              )}
            >
              {sourceIcons[item.primarySource]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-white font-medium text-sm">
                  {sourceLabels[item.primarySource]}
                </span>
                <span className="text-slate-500 text-xs">•</span>
                <span className="text-slate-400 text-xs">{item.sourceType}</span>
                {item.sourceSubtype && (
                  <>
                    <span className="text-slate-500 text-xs">•</span>
                    <span className="text-slate-400 text-xs">{item.sourceSubtype}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                <span className="flex items-center gap-1">
                  <span className="text-emerald-400 font-medium">{Math.round(item.confidence * 100)}%</span>
                  confidence
                </span>
                <span>•</span>
                <span>{formatDate(item.effectiveFrom)}</span>
                <span>•</span>
                <span className="capitalize">{item.status.toLowerCase()}</span>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-500 shrink-0 mt-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

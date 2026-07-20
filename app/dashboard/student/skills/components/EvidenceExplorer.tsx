'use client';

import { FileText, Github, GraduationCap, BookOpen, Code2, Briefcase, ClipboardCheck, User, ExternalLink, Calendar } from 'lucide-react';
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
        <p>No evidence available for this skill.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
        Evidence Sources ({evidence.length})
      </h4>
      <div className="space-y-3">
        {evidence.map((item) => (
          <div
            key={item.id}
            className={cn(
              'rounded-xl p-5 border transition-colors',
              'bg-slate-800/30 border-slate-700 hover:border-slate-600'
            )}
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'p-2.5 rounded-lg border shrink-0',
                  sourceColors[item.primarySource]
                )}
              >
                {sourceIcons[item.primarySource]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
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
                  <span
                    className={cn(
                      'ml-auto text-xs px-2 py-0.5 rounded-full border',
                      item.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    )}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-3">
                  {item.sourceDetails?.repository && (
                    <>
                      <div>
                        <span className="text-slate-500 text-xs block">Repository</span>
                        {item.sourceDetails.repository.url ? (
                          <a
                            href={item.sourceDetails.repository.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 text-sm font-medium hover:underline inline-flex items-center gap-1"
                          >
                            {item.sourceDetails.repository.name}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-white text-sm font-medium">
                            {item.sourceDetails.repository.name}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-500 text-xs block">Owner</span>
                        <span className="text-white text-sm">
                          {item.sourceDetails.repository.owner}
                        </span>
                      </div>
                    </>
                  )}

                  {item.sourceDetails?.title && !item.sourceDetails?.repository && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-500 text-xs block">
                        {item.primarySource === 'ACADEMIC_RECORD'
                          ? 'Document'
                          : item.primarySource === 'CERTIFICATE'
                          ? 'Certificate'
                          : item.primarySource === 'RESEARCH'
                          ? 'Paper'
                          : 'Title'}
                      </span>
                      <span className="text-white text-sm font-medium">
                        {item.sourceDetails.title}
                      </span>
                      {item.sourceDetails.subtitle && (
                        <span className="text-slate-400 text-sm ml-2">
                          ({item.sourceDetails.subtitle})
                        </span>
                      )}
                    </div>
                  )}

                  {item.sourceDetails?.detectedLanguage && (
                    <div>
                      <span className="text-slate-500 text-xs block">Detected Language</span>
                      <span className="text-white text-sm">{item.sourceDetails.detectedLanguage}</span>
                    </div>
                  )}

                  {item.sourceDetails?.owner && !item.sourceDetails?.repository && (
                    <div>
                      <span className="text-slate-500 text-xs block">Owner</span>
                      <span className="text-white text-sm">{item.sourceDetails.owner}</span>
                    </div>
                  )}

                  <div>
                    <span className="text-slate-500 text-xs block flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Detected
                    </span>
                    <span className="text-white text-sm">{formatDate(item.effectiveFrom)}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-xs block flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Last Verified
                    </span>
                    <span className="text-white text-sm">{formatDate(item.updatedAt)}</span>
                  </div>

                  {item.sourceDetails?.metadata?.grade && (
                    <div>
                      <span className="text-slate-500 text-xs block">Grade</span>
                      <span className="text-white text-sm">{item.sourceDetails.metadata.grade}</span>
                    </div>
                  )}

                  {item.sourceDetails?.metadata?.credits != null && (
                    <div>
                      <span className="text-slate-500 text-xs block">Credits</span>
                      <span className="text-white text-sm">{item.sourceDetails.metadata.credits}</span>
                    </div>
                  )}

                  {item.sourceDetails?.metadata?.issuedDate && (
                    <div>
                      <span className="text-slate-500 text-xs block">Issued Date</span>
                      <span className="text-white text-sm">
                        {formatDate(item.sourceDetails.metadata.issuedDate)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

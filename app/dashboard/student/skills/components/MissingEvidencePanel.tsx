'use client';

import { GraduationCap, Github, FileText, BookOpen, Briefcase, User, Plus } from 'lucide-react';
import { EvidenceSourceType, MissingEvidenceItem } from '../types/skills';
import { cn } from '@/lib/utils';

const missingIcons: Record<EvidenceSourceType, React.ReactNode> = {
  ACADEMIC_RECORD: <GraduationCap className="w-5 h-5" />,
  GITHUB: <Github className="w-5 h-5" />,
  CERTIFICATE: <FileText className="w-5 h-5" />,
  RESEARCH: <BookOpen className="w-5 h-5" />,
  CODING_ARENA: <Plus className="w-5 h-5" />,
  PROJECT: <Briefcase className="w-5 h-5" />,
  MANUAL: <User className="w-5 h-5" />,
} as any;

interface MissingEvidencePanelProps {
  missingItems: MissingEvidenceItem[];
}

export function MissingEvidencePanel({ missingItems }: MissingEvidencePanelProps) {
  if (!missingItems || missingItems.length === 0) {
    return (
      <div className="text-center py-6 text-slate-400 text-sm">
        No missing evidence — your profile is well-supported!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-300 mb-3">Adding these would strengthen your profile:</p>
      <div className="space-y-2.5">
        {missingItems.map((item, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3 p-3 rounded-lg border border-slate-700 bg-slate-800/20"
          >
            <div className="p-2 bg-slate-700/30 rounded-lg text-slate-400 shrink-0">
              {missingIcons[item.type] || <Plus className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-medium text-sm">{item.label}</div>
              <div className="text-slate-400 text-xs mt-0.5 whitespace-pre-line">{item.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

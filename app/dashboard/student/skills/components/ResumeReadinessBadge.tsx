'use client';

import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { ResumeReadiness } from '../types/skills';

interface ResumeReadinessBadgeProps {
  readiness: ResumeReadiness;
  score: number;
}

export function ResumeReadinessBadge({ readiness, score }: ResumeReadinessBadgeProps) {
  const config = {
    RESUME_READY: {
      icon: <CheckCircle2 className="w-5 h-5" />,
      label: 'Resume Ready',
      description: 'Strong evidence backing this skill',
      className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    NEEDS_MORE_EVIDENCE: {
      icon: <AlertTriangle className="w-5 h-5" />,
      label: 'Needs More Evidence',
      description: 'Some evidence present but could be strengthened',
      className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    },
    NOT_VERIFIED: {
      icon: <XCircle className="w-5 h-5" />,
      label: 'Not Verified',
      description: 'Insufficient evidence for verification',
      className: 'bg-red-500/10 text-red-400 border-red-500/20',
    },
  };

  const c = config[readiness];

  return (
    <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium', c.className)}>
      {c.icon}
      <span>{c.label}</span>
    </div>
  );
}

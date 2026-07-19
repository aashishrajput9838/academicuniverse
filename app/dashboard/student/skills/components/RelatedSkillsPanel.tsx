'use client';

import { Network, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RelatedSkill {
  name: string;
  relationship: string;
}

interface RelatedSkillsPanelProps {
  skills: RelatedSkill[];
}

export function RelatedSkillsPanel({ skills }: RelatedSkillsPanelProps) {
  if (!skills || skills.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <Network className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Related skills will appear here as ontology relationships are populated.</p>
        <p className="text-xs text-slate-500 mt-1">This feature is coming soon.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
        Related Skills
      </h4>
      <div className="space-y-2.5">
        {skills.map((skill, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 p-3 rounded-lg border border-slate-700 bg-slate-800/20 hover:border-slate-600 transition-colors"
          >
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-medium text-sm">{skill.name}</div>
              <div className="text-slate-400 text-xs">{skill.relationship}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

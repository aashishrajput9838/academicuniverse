'use client';

import type { ResumeTemplateDTO } from '@/components/Resume/types/resume';

interface TemplateCardProps {
  template: ResumeTemplateDTO;
  isSelected: boolean;
  onClick: () => void;
}

export function TemplateCard({ template, isSelected, onClick }: TemplateCardProps) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-xl border transition-colors ${
        isSelected
          ? 'bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/30'
          : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
      }`}
    >
      <h3 className="text-white font-medium mb-1">{template.templateName}</h3>
      <p className="text-slate-400 text-sm mb-2">
        {template.target || 'Global'}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 capitalize">
          {template.type}
        </span>
        <span className="text-xs text-slate-500">
          {template.questions.length} fields
        </span>
      </div>
    </button>
  );
}

'use client';

import { useState } from 'react';
import { TemplateCard } from './TemplateCard';
import { TemplateFilters } from './TemplateFilters';
import { ResumeSkeleton } from '@/components/Resume/shared/ResumeSkeleton';
import { ResumeEmptyState } from '@/components/Resume/shared/ResumeEmptyState';
import { ResumeErrorState } from '@/components/Resume/shared/ResumeErrorState';
import type { ResumeTemplateDTO } from '@/components/Resume/types/resume';

interface TemplateSelectionProps {
  templates: ResumeTemplateDTO[];
  isLoading: boolean;
  error: string | null;
  selectedTemplate: ResumeTemplateDTO | null;
  onSelectTemplate: (template: ResumeTemplateDTO) => void;
  onRetry: () => void;
  onRefresh: () => void;
}

export function TemplateSelection({
  templates,
  isLoading,
  error,
  selectedTemplate,
  onSelectTemplate,
  onRetry,
  onRefresh,
}: TemplateSelectionProps) {
  const [filteredTemplates, setFilteredTemplates] = useState<ResumeTemplateDTO[]>(templates);

  if (error) {
    return (
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700">
        <ResumeErrorState error={error} onRetry={onRetry} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700">
        <ResumeSkeleton count={6} variant="card" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700">
        <ResumeEmptyState
          icon={
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          title="No templates available"
          description="There are no resume templates available yet. Contact your faculty to upload templates."
          action={{
            label: 'Refresh',
            onClick: onRefresh,
            variant: 'secondary',
          }}
        />
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700">
      <h2 className="text-xl font-semibold text-white mb-4">Select a Template</h2>
      <TemplateFilters templates={templates} onFilterChange={setFilteredTemplates} />
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-slate-400">No templates match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <TemplateCard
              key={template._id}
              template={template}
              isSelected={selectedTemplate?._id === template._id}
              onClick={() => onSelectTemplate(template)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

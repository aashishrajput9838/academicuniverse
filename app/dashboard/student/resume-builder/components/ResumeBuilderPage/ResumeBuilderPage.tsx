'use client';

import { useAuth } from '@/lib/AuthContext';
import { ResumeEmptyState } from '@/components/Resume/shared/ResumeEmptyState';
import { ResumeErrorState } from '@/components/Resume/shared/ResumeErrorState';
import { ResumeSkeleton } from '@/components/Resume/shared/ResumeSkeleton';
import { TemplateSelection } from '../TemplateSelection/TemplateSelection';
import { ResumeForm } from '../ResumeForm/ResumeForm';
import { useResumeBuilder } from './hooks/useResumeBuilder';
import { useTemplateSelection } from './hooks/useTemplateSelection';
import type { ResumeTemplateDTO } from '@/components/Resume/types/resume';

export default function ResumeBuilderPage() {
  const { backendToken } = useAuth();
  const {
    error,
    setError,
    selectedTemplate,
    selectTemplate,
    resetBuilder,
  } = useResumeBuilder(backendToken || '');

  const {
    templates,
    isLoading,
    error: templatesError,
    refreshTemplates,
  } = useTemplateSelection(backendToken || '');

  const handleErrorRetry = () => {
    setError(null);
    refreshTemplates();
  };

  const handleTemplateSelect = (template: ResumeTemplateDTO) => {
    selectTemplate(template);
  };

  const handleFormBack = () => {
    resetBuilder();
  };

  const handleFormNext = (data: Record<string, any>) => {
    console.log('Form valid, ready for next phase:', data);
  };

  if (!backendToken) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
          <h1 className="text-3xl font-bold text-white mb-2">Resume Builder</h1>
          <p className="text-slate-400">
            Select a template provided by your faculty, fill out your details, and instantly generate your customized resume in PDF or DOCX format.
          </p>
        </div>
        <ResumeErrorState
          error={new Error('Authentication required. Please log in to access Resume Builder.')}
          onGoHome={() => (window.location.href = '/dashboard/student')}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
          <h1 className="text-3xl font-bold text-white mb-2">Resume Builder</h1>
          <p className="text-slate-400">
            Select a template provided by your faculty, fill out your details, and instantly generate your customized resume in PDF or DOCX format.
          </p>
        </div>
        <ResumeErrorState error={error} onRetry={handleErrorRetry} />
      </div>
    );
  }

  if (selectedTemplate) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
          <h1 className="text-3xl font-bold text-white mb-2">Resume Builder</h1>
          <p className="text-slate-400">
            Fill out the form below to generate your resume.
          </p>
        </div>

        <ResumeForm
          template={selectedTemplate}
          backendToken={backendToken}
          onBack={handleFormBack}
          onNext={handleFormNext}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
        <h1 className="text-3xl font-bold text-white mb-2">Resume Builder</h1>
        <p className="text-slate-400">
          Select a template provided by your faculty, fill out your details, and instantly generate your customized resume in PDF or DOCX format.
        </p>
      </div>

      <TemplateSelection
        templates={templates}
        isLoading={isLoading}
        error={templatesError}
        selectedTemplate={null}
        onSelectTemplate={handleTemplateSelect}
        onRetry={handleErrorRetry}
        onRefresh={refreshTemplates}
      />
    </div>
  );
}

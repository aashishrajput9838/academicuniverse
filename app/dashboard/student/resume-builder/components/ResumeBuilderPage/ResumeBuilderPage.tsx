'use client';

import { useAuth } from '@/lib/AuthContext';
import { ResumeEmptyState } from '@/components/Resume/shared/ResumeEmptyState';
import { ResumeErrorState } from '@/components/Resume/shared/ResumeErrorState';
import { ResumeSkeleton } from '@/components/Resume/shared/ResumeSkeleton';
import { TemplateSelection } from '../TemplateSelection/TemplateSelection';
import { ResumeForm } from '../ResumeForm/ResumeForm';
import { GenerationLoading } from '../Generation/GenerationLoading';
import { GenerationError } from '../Generation/GenerationError';
import { ResumePreview } from '../Preview/ResumePreview';
import { PreviewToolbar } from '../Preview/PreviewToolbar';
import { DownloadToolbar } from '../Preview/DownloadToolbar';
import { useResumeBuilder } from './hooks/useResumeBuilder';
import { useTemplateSelection } from './hooks/useTemplateSelection';
import type { ResumeTemplateDTO } from '@/components/Resume/types/resume';

export default function ResumeBuilderPage() {
  const { backendToken } = useAuth();
  const {
    error,
    setError,
    generationError,
    setGenerationError,
    selectedTemplate,
    selectTemplate,
    generatePreview,
    resetBuilder,
    isGenerating,
    generatedPreview,
    generatedDocx,
    isDownloading,
    downloadError,
    setDownloadError,
    isDownloadingPdf,
    pdfDownloadError,
    setPdfDownloadError,
    downloadResume,
    downloadPdf,
    retryGeneration,
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

  const handleGenerate = (data: Record<string, any>) => {
    if (selectedTemplate) {
      generatePreview(selectedTemplate._id, data);
    }
  };

  const handleRetryGeneration = () => {
    retryGeneration();
  };

  const handleBackToForm = () => {
    setError(null);
    setGenerationError(null);
  };

  const handleDownloadDocx = () => {
    downloadResume();
  };

  const handleDownloadPdf = () => {
    downloadPdf();
  };

  const handleRetryDocx = () => {
    setDownloadError(null);
    downloadResume();
  };

  const handleRetryPdf = () => {
    setPdfDownloadError(null);
    downloadPdf();
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

  if (error && !isGenerating && !generatedPreview) {
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

  if (generatedPreview) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
          <h1 className="text-3xl font-bold text-white mb-2">Resume Builder</h1>
          <p className="text-slate-400">
            Review your generated resume below.
          </p>
        </div>

        <DownloadToolbar
          onBackToForm={handleBackToForm}
          isGenerating={isGenerating}
          isDownloading={isDownloading || isDownloadingPdf}
          downloadError={downloadError || pdfDownloadError}
          onRetryDownload={handleRetryDocx}
        />
        <ResumePreview
          htmlPreview={generatedPreview}
          onDownloadDocx={handleDownloadDocx}
          onDownloadPdf={handleDownloadPdf}
          isDownloadingDocx={isDownloading}
          isDownloadingPdf={isDownloadingPdf}
          downloadError={downloadError}
          pdfDownloadError={pdfDownloadError}
          onRetryDocx={handleRetryDocx}
          onRetryPdf={handleRetryPdf}
        />
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
          <h1 className="text-3xl font-bold text-white mb-2">Resume Builder</h1>
          <p className="text-slate-400">
            Generating your resume...
          </p>
        </div>

        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700">
          <GenerationLoading />
        </div>
      </div>
    );
  }

  if (generationError) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
          <h1 className="text-3xl font-bold text-white mb-2">Resume Builder</h1>
          <p className="text-slate-400">
            Something went wrong during generation.
          </p>
        </div>

        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700">
          <GenerationError
            error={generationError}
            onRetry={handleRetryGeneration}
            onBackToForm={handleBackToForm}
          />
        </div>
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
          onNext={() => {}}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
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

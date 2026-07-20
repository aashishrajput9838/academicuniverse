'use client';

import { useState, useEffect, useCallback } from 'react';
import { FormFieldRenderer } from './FormFieldRenderer';
import { FormSection } from './FormSection';
import { FormNavigation } from './FormNavigation';
import { DraftIndicator } from '../Draft/DraftIndicator';
import { ResumeSkeleton } from '@/components/Resume/shared/ResumeSkeleton';
import { useAutoSave } from '../ResumeBuilderPage/hooks/useAutoSave';
import { fetchDraft } from '@/components/Resume/api/resumeApi';
import type { ResumeTemplateDTO } from '@/components/Resume/types/resume';

interface ResumeFormProps {
  template: ResumeTemplateDTO;
  backendToken: string;
  onBack: () => void;
  onNext: (data: Record<string, any>) => void;
  onGenerate: (data: Record<string, any>) => void;
  isGenerating: boolean;
}

export function ResumeForm({ template, backendToken, onBack, onNext, onGenerate, isGenerating }: ResumeFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);

  const loadDraft = useCallback(async () => {
    setIsLoadingDraft(true);
    try {
      const draft = await fetchDraft(backendToken, template._id);
      if (draft) {
        setFormData(draft);
      }
    } catch (err) {
      console.error('Failed to load draft:', err);
    } finally {
      setIsLoadingDraft(false);
    }
  }, [backendToken, template._id]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  const handleChange = useCallback((tag: string, value: string) => {
    setFormData(prev => ({ ...prev, [tag]: value }));
    setErrors(prev => {
      if (!prev[tag]) return prev;
      const next = { ...prev };
      delete next[tag];
      return next;
    });
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    for (const question of template.questions) {
      const value = formData[question.tag];
      if (!value || value.trim() === '') {
        newErrors[question.tag] = 'This field is required';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [template.questions, formData]);

  const handleNext = useCallback(() => {
    if (validate()) {
      if (onGenerate) {
        onGenerate(formData);
      } else {
        onNext(formData);
      }
    }
  }, [validate, formData, onNext, onGenerate]);

  const handleSaveStart = useCallback(() => {
    setDraftStatus('saving');
  }, []);

  const handleSaveSuccess = useCallback(() => {
    setDraftStatus('saved');
    setLastSavedAt(new Date());
  }, []);

  const handleSaveError = useCallback((error: Error) => {
    setDraftStatus('error');
    console.error('Auto-save failed:', error);
  }, []);

  const handleRetrySave = useCallback(() => {
    setDraftStatus('idle');
  }, []);

  useAutoSave(
    backendToken,
    template._id,
    formData,
    handleSaveStart,
    handleSaveSuccess,
    handleSaveError
  );

  if (isLoadingDraft) {
    return (
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700">
        <ResumeSkeleton count={template.questions.length} variant="form" />
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">{template.templateName}</h2>
          <p className="text-sm text-slate-400 mt-1">
            Fill out the form below to generate your resume.
          </p>
        </div>
        <DraftIndicator
          status={draftStatus}
          lastSavedAt={lastSavedAt}
          onRetry={handleRetrySave}
        />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
        <FormSection>
          {template.questions.map((question) => (
            <FormFieldRenderer
              key={question.tag}
              question={question}
              value={formData[question.tag] || ''}
              onChange={(value) => handleChange(question.tag, value)}
              error={errors[question.tag]}
            />
          ))}
        </FormSection>

        <FormNavigation
          currentStep={0}
          totalSteps={1}
          onPrevious={onBack}
          onNext={handleNext}
          canProceed={template.questions.every(q => formData[q.tag]?.trim())}
          isSubmitting={isGenerating}
          nextLabel="Generate Resume"
        />
      </form>
    </div>
  );
}

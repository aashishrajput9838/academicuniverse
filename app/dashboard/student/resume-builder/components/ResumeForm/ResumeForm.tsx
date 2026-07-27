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
import { SECTION_LABELS, SECTION_ORDER } from '@/components/Resume/config/resumePlaceholders';
import { generateSampleResumeData } from './utils/sampleResumeData';

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

  const isDev = process.env.NODE_ENV !== 'production';

  const handleAutoFill = useCallback(() => {
    const sampleData = generateSampleResumeData(template.questions);
    setFormData(sampleData);
    setErrors({});
  }, [template.questions]);

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

  const groupedQuestions = useCallback(() => {
    const groups: Record<string, typeof template.questions> = {};
    for (const q of template.questions) {
      const section = (q as any).section || 'other';
      if (!groups[section]) groups[section] = [];
      groups[section].push(q);
    }
    const sortedSections = Object.keys(groups).sort((a, b) => {
      const orderA = SECTION_ORDER[a] ?? 99;
      const orderB = SECTION_ORDER[b] ?? 99;
      return orderA - orderB;
    });
    return sortedSections.map(section => ({
      section,
      label: SECTION_LABELS[section] || section,
      questions: groups[section],
    }));
  }, [template.questions]);

  if (isLoadingDraft) {
    return (
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700">
        <ResumeSkeleton count={template.questions.length} variant="form" />
      </div>
    );
  }

  const sections = groupedQuestions();

  return (
    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">{template.templateName}</h2>
          <p className="text-sm text-slate-400 mt-1">
            Fill out the form below to generate your resume.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {isDev && (
            <button
              type="button"
              onClick={handleAutoFill}
              className="px-3.5 py-1.5 bg-purple-900/40 hover:bg-purple-800/50 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-medium transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Auto-fill form with realistic sample resume data (Dev Only)"
            >
              <span>✨</span>
              <span>AI Auto Fill (Dev)</span>
            </button>
          )}
          <DraftIndicator
            status={draftStatus}
            lastSavedAt={lastSavedAt}
            onRetry={handleRetrySave}
          />
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
        {sections.map(({ section, label, questions }) => (
          <div key={section} className="mb-6">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
              {label}
            </h3>
            <FormSection>
              {questions.map((question) => (
                <FormFieldRenderer
                  key={question._id || question.tag}
                  question={question}
                  value={formData[question.tag] || ''}
                  onChange={(value) => handleChange(question.tag, value)}
                  error={errors[question.tag]}
                />
              ))}
            </FormSection>
          </div>
        ))}

        <FormNavigation
          currentStep={0}
          totalSteps={1}
          onPrevious={onBack}
          onNext={handleNext}
          canProceed={template.questions.every(q => formData[q.tag]?.trim())}
          isSubmitting={isGenerating}
          nextLabel="Generate Resume"
          onAutoFill={handleAutoFill}
        />
      </form>
    </div>
  );
}

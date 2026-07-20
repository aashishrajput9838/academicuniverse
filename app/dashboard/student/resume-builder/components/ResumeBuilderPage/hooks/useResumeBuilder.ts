'use client';

import { useState, useCallback } from 'react';
import { generateResume } from '@/components/Resume/api/resumeApi';
import type { ResumeTemplateDTO } from '@/components/Resume/types/resume';

export function useResumeBuilder(backendToken: string) {
  const [currentStep, setCurrentStep] = useState<'template' | 'form' | 'preview'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplateDTO | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);
  const [generatedDocx, setGeneratedDocx] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const selectTemplate = useCallback((template: ResumeTemplateDTO) => {
    setSelectedTemplate(template);
    setCurrentStep('form');
    setError(null);
  }, []);

  const updateFormData = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const generatePreview = useCallback(async (templateId: string, data: Record<string, any>) => {
    if (!backendToken) return;

    setIsGenerating(true);
    setError(null);
    setGenerationError(null);

    try {
      const response = await generateResume(backendToken, templateId, data, 'none');
      setGeneratedPreview(response.htmlPreview);
      setGeneratedDocx(response.docxBase64);
      setCurrentStep('preview');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate resume';
      setGenerationError(message);
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  }, [backendToken]);

  const resetBuilder = useCallback(() => {
    setCurrentStep('template');
    setSelectedTemplate(null);
    setFormData({});
    setGeneratedPreview(null);
    setGeneratedDocx(null);
    setIsGenerating(false);
    setError(null);
    setGenerationError(null);
    setDraftStatus('idle');
    setLastSavedAt(null);
  }, []);

  return {
    currentStep,
    selectedTemplate,
    formData,
    generatedPreview,
    generatedDocx,
    isGenerating,
    error,
    generationError,
    setGenerationError,
    draftStatus,
    lastSavedAt,
    setCurrentStep,
    selectTemplate,
    updateFormData,
    generatePreview,
    setGeneratedPreview,
    setGeneratedDocx,
    setIsGenerating,
    setError,
    setDraftStatus,
    setLastSavedAt,
    resetBuilder,
  };
}

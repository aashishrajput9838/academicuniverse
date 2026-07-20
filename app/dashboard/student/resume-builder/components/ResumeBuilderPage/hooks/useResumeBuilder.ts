'use client';

import { useState, useCallback } from 'react';
import type { ResumeTemplateDTO } from '@/components/Resume/types/resume';

export function useResumeBuilder(backendToken: string) {
  const [currentStep, setCurrentStep] = useState<'template' | 'form' | 'preview'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplateDTO | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);
  const [generatedDocx, setGeneratedDocx] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const resetBuilder = useCallback(() => {
    setCurrentStep('template');
    setSelectedTemplate(null);
    setFormData({});
    setGeneratedPreview(null);
    setGeneratedDocx(null);
    setIsGenerating(false);
    setError(null);
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
    draftStatus,
    lastSavedAt,
    setCurrentStep,
    selectTemplate,
    updateFormData,
    setGeneratedPreview,
    setGeneratedDocx,
    setIsGenerating,
    setError,
    setDraftStatus,
    setLastSavedAt,
    resetBuilder,
  };
}

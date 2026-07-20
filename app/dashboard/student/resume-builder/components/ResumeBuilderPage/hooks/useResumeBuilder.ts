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
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

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

  const downloadResume = useCallback(async () => {
    if (!generatedDocx || !selectedTemplate) return;

    setIsDownloading(true);
    setDownloadError(null);

    try {
      const byteCharacters = atob(generatedDocx);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedTemplate.templateName.replace(/\s+/g, '_')}_resume.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download resume';
      setDownloadError(message);
    } finally {
      setIsDownloading(false);
    }
  }, [generatedDocx, selectedTemplate]);

  const retryGeneration = useCallback(() => {
    setError(null);
    setGenerationError(null);
    if (selectedTemplate && formData) {
      generatePreview(selectedTemplate._id, formData);
    }
  }, [selectedTemplate, formData, generatePreview]);

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
    setIsDownloading(false);
    setDownloadError(null);
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
    isDownloading,
    downloadError,
    setDownloadError,
    setCurrentStep,
    selectTemplate,
    updateFormData,
    generatePreview,
    downloadResume,
    retryGeneration,
    setGeneratedPreview,
    setGeneratedDocx,
    setIsGenerating,
    setError,
    setDraftStatus,
    setLastSavedAt,
    resetBuilder,
  };
}

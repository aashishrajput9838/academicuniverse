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
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfDownloadError, setPdfDownloadError] = useState<string | null>(null);

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

  const downloadPdf = useCallback(async () => {
    if (!generatedPreview || !selectedTemplate) return;

    setIsDownloadingPdf(true);
    setPdfDownloadError(null);

    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const blob = new Blob([generatedPreview], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
        try {
          const element = iframe.contentDocument?.body;
          if (!element) {
            throw new Error('Failed to load preview content');
          }
          
            const opt = {
            margin: 10,
            filename: `${selectedTemplate.templateName.replace(/\s+/g, '_')}_resume.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
          };
          
          html2pdf().set(opt).from(element).save().then(() => {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(url);
          });
        } catch (err) {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
          throw err;
        }
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download PDF';
      setPdfDownloadError(message);
    } finally {
      setIsDownloadingPdf(false);
    }
  }, [generatedPreview, selectedTemplate]);

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
    setIsDownloadingPdf(false);
    setPdfDownloadError(null);
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
    isDownloadingPdf,
    pdfDownloadError,
    setPdfDownloadError,
    setCurrentStep,
    selectTemplate,
    updateFormData,
    generatePreview,
    downloadResume,
    downloadPdf,
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

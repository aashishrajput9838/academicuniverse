'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchTemplates, fetchDraft } from '@/components/Resume/api/resumeApi';
import type { ResumeTemplateDTO } from '@/components/Resume/types/resume';

export function useTemplateSelection(backendToken: string) {
  const [templates, setTemplates] = useState<ResumeTemplateDTO[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplateDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    if (!backendToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchTemplates(backendToken);
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  }, [backendToken]);

  const selectTemplate = useCallback(async (template: ResumeTemplateDTO) => {
    setSelectedTemplate(template);

    try {
      const draft = await fetchDraft(backendToken, template._id);
      return draft;
    } catch (err) {
      console.error('Failed to load draft:', err);
      return null;
    }
  }, [backendToken]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    templates,
    selectedTemplate,
    isLoading,
    error,
    selectTemplate,
    refreshTemplates: loadTemplates,
    setSelectedTemplate,
  };
}

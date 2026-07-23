'use client';

import { useEffect, useRef, useCallback } from 'react';
import { saveDraft as saveDraftApi } from '@/components/Resume/api/resumeApi';

export function useAutoSave(
  backendToken: string,
  templateId: string | null,
  formData: Record<string, any>,
  onSaveStart: () => void,
  onSaveSuccess: (data: Record<string, any>) => void,
  onSaveError: (error: Error) => void
) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);

  const saveDraft = useCallback(async () => {
    if (!templateId || !backendToken || isSavingRef.current) return;

    isSavingRef.current = true;
    onSaveStart();

    try {
      await saveDraftApi(backendToken, templateId, formData);
      onSaveSuccess(formData);
    } catch (error) {
      onSaveError(error instanceof Error ? error : new Error('Failed to save draft'));
    } finally {
      isSavingRef.current = false;
    }
  }, [backendToken, templateId, formData, onSaveStart, onSaveSuccess, onSaveError]);

  useEffect(() => {
    if (!templateId || !backendToken) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      saveDraft();
    }, 2000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [formData, templateId, backendToken, saveDraft]);

  return { saveDraft };
}

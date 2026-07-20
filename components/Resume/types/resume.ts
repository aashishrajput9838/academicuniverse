import type { ResumeTemplateDTO, GenerateResumeRequest, GenerateResumeResponse, DraftDTO } from '../types/api';

export interface ResumeState {
  currentStep: 'template' | 'form' | 'preview';
  selectedTemplate: ResumeTemplateDTO | null;
  formData: Record<string, any>;
  generatedPreview: string | null;
  generatedDocx: string | null;
  isGenerating: boolean;
  error: string | null;
  draftStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt: Date | null;
}

export { ResumeTemplateDTO, GenerateResumeRequest, GenerateResumeResponse, DraftDTO };

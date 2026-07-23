export interface ResumeTemplateDTO {
  _id: string;
  templateName: string;
  type: 'global' | 'section' | 'department';
  target: string;
  fileUrl: string;
  organizationId: string;
  uploadedBy: string;
  questions: TemplateQuestion[];
  createdAt: string;
  updatedAt: string;
  originalFileUrl?: string;
  sections?: Array<{
    id: string;
    title: string;
    order: number;
    repeatable: boolean;
    maxEntries?: number;
    minEntries?: number;
    fields: Array<{
      key: string;
      label: string;
      type: 'text' | 'textarea' | 'date' | 'email' | 'phone' | 'url' | 'select' | 'list';
      required: boolean;
      aiEnhanceable: boolean;
      placeholder?: string;
      validation?: {
        pattern?: string;
        minLength?: number;
        maxLength?: number;
      };
      options?: string[];
    }>;
    aiPrompt?: string;
  }>;
  formattingMetadata?: {
    styles: Record<string, any>;
    headingLevels: Record<string, number>;
    bulletMarker: string;
    dateFormat: string;
  };
  confidence?: number;
  reviewed?: boolean;
  reviewNotes?: string;
}

export interface TemplateQuestion {
  _id?: string;
  tag: string;
  question: string;
  type: 'text' | 'textarea';
  aiEnhanceable: boolean;
}

export interface GenerateResumeRequest {
  templateId: string;
  data: Record<string, any>;
  tone?: 'professional' | 'creative' | 'concise' | 'none';
}

export interface GenerateResumeResponse {
  htmlPreview: string;
  docxBase64: string;
  studentResumeId: string;
}

export interface DraftDTO {
  filledData: Record<string, any>;
  studentResumeId: string;
}

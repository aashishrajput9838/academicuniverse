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
}

export interface TemplateQuestion {
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

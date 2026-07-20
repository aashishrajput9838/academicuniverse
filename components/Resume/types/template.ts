import type { ResumeTemplateDTO } from '../types/api';

export type TemplateType = 'global' | 'section' | 'department';

export interface TemplateQuestion {
  tag: string;
  question: string;
  type: 'text' | 'textarea';
  aiEnhanceable: boolean;
}

export { ResumeTemplateDTO };

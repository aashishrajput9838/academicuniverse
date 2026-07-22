import { DocxLocation } from '../docxExtraction.service';

export interface ExtractionOptions {
  enableAiAssistance: boolean;
}

export interface ExtractionIssue {
  severity: 'info' | 'warning' | 'error';
  message: string;
  location?: DocxLocation;
  timestamp?: Date;
}

export interface ExtractedEntity {
  type: 'name' | 'email' | 'phone' | 'url' | 'date' | 'address' | 'education' | 'skill' | 'experience';
  value: string;
  location?: DocxLocation;
  confidence: number;
}

export interface DetectedSection {
  id: string;
  title: string;
  order: number;
  repeatable: boolean;
  maxEntries?: number;
  minEntries?: number;
  fields: TemplateField[];
  aiPrompt?: string;
}

export interface Milestone2Result {
  sections: DetectedSection[];
  entities: ExtractedEntity[];
  confidence: number;
  formattingMetadata: {
    styles: Record<string, any>;
    headingLevels: Record<string, number>;
    bulletMarker: string;
    dateFormat: string;
  };
  extractionIssues: ExtractionIssue[];
}

export interface TemplateField {
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
}

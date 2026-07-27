export interface ExtractedPlaceholder {
  raw: string;
  key: string;
  location: string;
  context: string;
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: 'MISSING' | 'DUPLICATE' | 'UNKNOWN' | 'MISSPELLED' | 'RESERVED_CONFLICT' | 'STYLE_MISMATCH' | 'DEPRECATED';
  placeholder: string;
  message: string;
  suggestion?: string;
  location?: string;
}

export interface ValidationReport {
  valid: boolean;
  placeholders: ExtractedPlaceholder[];
  issues: ValidationIssue[];
  summary: {
    total: number;
    unique: number;
    duplicates: number;
    missingRequired: string[];
    unknown: string[];
    misspelled: string[];
    reservedConflicts: string[];
    deprecated: string[];
  };
}

export interface CanonicalField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'email' | 'phone' | 'url' | 'select' | 'list';
  required: boolean;
  section: string;
  aliases: string[];
  suggestions: string[];
}

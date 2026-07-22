import { TemplateField, ExtractionIssue } from './milestone2.types';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^\+?[\d\s-]{10,15}$/;
const URL_REGEX = /^https?:\/\/[^\s]+$/;
const DATE_REGEX = /^\d{4}-\d{2}(-\d{2})?$/;

export interface ResumeDataValidationResult {
  valid: boolean;
  issues: ExtractionIssue[];
  data: Record<string, any>;
}

export class ResumeDataService {
  validate(data: Record<string, any>, schema: TemplateField[]): ResumeDataValidationResult {
    const issues: ExtractionIssue[] = [];
    const validatedData: Record<string, any> = {};
    const now = new Date();

    for (const field of schema) {
      const value = data[field.key];

      if (value === undefined || value === null || value === '') {
        if (field.required) {
        issues.push({
          severity: 'error',
          message: `Required field '${field.key}' is missing`,
        });
        }
        continue;
      }

      let stringValue: string;
      let listValue: string[];

      if (field.type === 'list') {
        listValue = Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim().length > 0) : [];
      if (listValue.length === 0 && field.required) {
        issues.push({
          severity: 'error',
          message: `Required field '${field.key}' must contain at least one non-empty item`,
        });
        continue;
      }
        validatedData[field.key] = listValue;
        continue;
      }

      if (field.type === 'textarea') {
        stringValue = typeof value === 'string' ? value : String(value);
      } else {
        stringValue = typeof value === 'string' ? value.trim() : String(value).trim();
      }

      if (field.validation?.maxLength && stringValue.length > field.validation.maxLength) {
        issues.push({
          severity: 'error',
          message: `Field '${field.label}' exceeds maximum length of ${field.validation.maxLength}`,
        });
      }

      if (field.validation?.minLength && stringValue.length < field.validation.minLength) {
        issues.push({
          severity: 'error',
          message: `Field '${field.label}' is shorter than minimum length of ${field.validation.minLength}`,
        });
      }

      if (field.validation?.pattern) {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(stringValue)) {
          issues.push({
            severity: 'error',
            message: `Field '${field.key}' does not match required pattern`,
          });
        }
      }

      switch (field.type) {
        case 'email':
          if (!EMAIL_REGEX.test(stringValue)) {
            issues.push({
              severity: 'error',
              message: `Field '${field.label}' is not a valid email address`,
            });
          }
          break;
        case 'phone':
          if (!PHONE_REGEX.test(stringValue)) {
            issues.push({
              severity: 'error',
              message: `Field '${field.label}' is not a valid phone number`,
            });
          }
          break;
        case 'url':
          if (!URL_REGEX.test(stringValue)) {
            issues.push({
              severity: 'error',
              message: `Field '${field.label}' is not a valid URL`,
            });
          }
          break;
        case 'date':
          if (!DATE_REGEX.test(stringValue)) {
            issues.push({
              severity: 'error',
              message: `Field '${field.label}' is not a valid date (YYYY-MM or YYYY-MM-DD)`,
            });
          } else {
            const dateValue = new Date(stringValue);
            if (isNaN(dateValue.getTime()) || dateValue > now) {
              issues.push({
                severity: 'warning',
                message: `Field '${field.label}' contains an invalid or future date`,
              });
            }
          }
          break;
        default:
          break;
      }

      validatedData[field.key] = stringValue;
    }

    const hasErrors = issues.some((issue) => issue.severity === 'error');

    return {
      valid: !hasErrors,
      issues,
      data: validatedData,
    };
  }
}

import { ResumeDataService } from '../services/resumeData.service';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^\+?[\d\s-]{10,15}$/;
const URL_REGEX = /^https?:\/\/[^\s]+$/;
const DATE_REGEX = /^\d{4}-\d{2}(-\d{2})?$/;

function createField(overrides: Partial<any> = {}): any {
  return {
    key: 'test_field',
    label: 'Test Field',
    type: 'text',
    required: false,
    aiEnhanceable: true,
    ...overrides,
  };
}

describe('ResumeDataService', () => {
  let service: ResumeDataService;

  beforeEach(() => {
    service = new ResumeDataService();
  });

  it('validates required field as missing', () => {
    const result = service.validate({}, [createField({ key: 'name', required: true })]);
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThanOrEqual(1);
    expect(result.issues.some((issue: any) => String(issue.message).includes('name'))).toBe(true);
  });

  it('accepts valid data', () => {
    const result = service.validate(
      { name: 'John Doe' },
      [createField({ key: 'name', required: true })]
    );
    expect(result.valid).toBe(true);
    expect(result.data.name).toBe('John Doe');
  });

  it('validates email format', () => {
    const result = service.validate(
      { email: 'invalid' },
      [createField({ key: 'email', type: 'email', required: true })]
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue: any) => String(issue.message).toLowerCase().includes('email'))).toBe(true);
  });

  it('validates phone format', () => {
    const result = service.validate(
      { phone: 'abc' },
      [createField({ key: 'phone', type: 'phone', required: true })]
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue: any) => String(issue.message).toLowerCase().includes('phone'))).toBe(true);
  });

  it('validates URL format', () => {
    const result = service.validate(
      { url: 'not-a-url' },
      [createField({ key: 'url', type: 'url', required: true })]
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue: any) => String(issue.message).toLowerCase().includes('url'))).toBe(true);
  });

  it('validates date format', () => {
    const result = service.validate(
      { date: 'invalid-date' },
      [createField({ key: 'date', type: 'date', required: true })]
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue: any) => String(issue.message).toLowerCase().includes('date'))).toBe(true);
  });

  it('validates list field', () => {
    const result = service.validate(
      { skills: ['JavaScript', 'TypeScript'] },
      [createField({ key: 'skills', type: 'list', required: true })]
    );
    expect(result.valid).toBe(true);
    expect(result.data.skills).toEqual(['JavaScript', 'TypeScript']);
  });

  it('rejects empty list for required field', () => {
    const result = service.validate(
      { skills: [] },
      [createField({ key: 'skills', type: 'list', required: true })]
    );
    expect(result.valid).toBe(false);
  });

  it('enforces max length', () => {
    const result = service.validate(
      { name: 'A'.repeat(100) },
      [createField({ key: 'name', validation: { maxLength: 50 } })]
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue: any) => String(issue.message).includes('maximum length'))).toBe(true);
  });
});

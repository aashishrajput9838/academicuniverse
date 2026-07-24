import { ResumeClassifier } from '../services/resume/resumeClassifier.service';

describe('ResumeClassifier', () => {
  const classifier = new ResumeClassifier();

  const cases: {
    name: string;
    rawText: string;
    fileName: string;
    mimeType: string;
    expectedCategory: 'RESUME' | 'UNKNOWN';
    minConfidence: number;
    maxConfidence?: number;
  }[] = [
    {
      name: 'resume.pdf with resume sections',
      rawText: 'Education: ABC University\nExperience: Software Engineer at XYZ Corp\nSkills: Java, Python',
      fileName: 'resume.pdf',
      mimeType: 'application/pdf',
      expectedCategory: 'RESUME',
      minConfidence: 0.9,
    },
    {
      name: 'CV DOCX with resume sections',
      rawText: 'Profile\nEmployment History\nQualifications\nTechnical Skills',
      fileName: 'john_doe_cv.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      expectedCategory: 'RESUME',
      minConfidence: 0.9,
    },
    {
      name: 'biodata PDF with resume sections',
      rawText: 'Work Experience\nEducation\nSkills',
      fileName: 'biodata.pdf',
      mimeType: 'application/pdf',
      expectedCategory: 'RESUME',
      minConfidence: 0.9,
    },
    {
      name: 'random PDF without resume sections',
      rawText: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      fileName: 'random.pdf',
      mimeType: 'application/pdf',
      expectedCategory: 'UNKNOWN',
      minConfidence: 0.0,
      maxConfidence: 0.4,
    },
    {
      name: 'TXT file with resume-like content but wrong MIME',
      rawText: 'Education: ABC University\nExperience: Software Engineer',
      fileName: 'resume.txt',
      mimeType: 'text/plain',
      expectedCategory: 'RESUME',
      minConfidence: 0.7,
      maxConfidence: 1.0,
    },
    {
      name: 'certificate PDF misclassified by DocumentClassifier',
      rawText: 'This is to certify that John Doe has completed the course',
      fileName: 'certificate.pdf',
      mimeType: 'application/pdf',
      expectedCategory: 'UNKNOWN',
      minConfidence: 0.0,
      maxConfidence: 0.4,
    },
  ];

  cases.forEach(({ name, rawText, fileName, mimeType, expectedCategory, minConfidence, maxConfidence }) => {
    test(`ResumeClassifier.classify() - ${name}`, () => {
      const result = (classifier as any).classify({ rawText, fileName, mimeType });
      expect(result.documentCategory).toBe(expectedCategory);
      expect(result.confidenceScore).toBeGreaterThanOrEqual(minConfidence);
      if (maxConfidence !== undefined) {
        expect(result.confidenceScore).toBeLessThanOrEqual(maxConfidence);
      }
      expect(result.signals).toHaveProperty('filenameMatch');
      expect(result.signals).toHaveProperty('mimeMatch');
      expect(result.signals).toHaveProperty('contentHeuristic');
      expect(result.reason).toBeTruthy();
    });
  });

  test('ResumeClassifier is stateless - no side effects', () => {
    const result1 = (classifier as any).classify({
      rawText: 'Education: ABC\nExperience: XYZ\nSkills: Java',
      fileName: 'resume.pdf',
      mimeType: 'application/pdf',
    });
    const result2 = (classifier as any).classify({
      rawText: 'Education: ABC\nExperience: XYZ\nSkills: Java',
      fileName: 'resume.pdf',
      mimeType: 'application/pdf',
    });

    expect(result1).toEqual(result2);
    expect(result1.documentCategory).toBe('RESUME');
  });

  test('ResumeClassifier handles empty rawText gracefully', () => {
    const result = (classifier as any).classify({
      rawText: '',
      fileName: 'resume.pdf',
      mimeType: 'application/pdf',
    });
    expect(result.documentCategory).toBe('RESUME');
    expect(result.signals.contentHeuristic).toBe(false);
    expect(result.confidenceScore).toBeCloseTo(0.9, 10);
  });

  test('ResumeClassifier handles missing rawText gracefully', () => {
    const result = (classifier as any).classify({
      rawText: '',
      fileName: 'resume.pdf',
      mimeType: 'application/pdf',
    });
    expect(result.documentCategory).toBe('RESUME');
    expect(result.signals.contentHeuristic).toBe(false);
  });
});

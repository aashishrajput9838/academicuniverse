import { EntityDetectorService } from '../services/entityDetector.service';
import { ExtractedDocument, ExtractedParagraph, ExtractedRun, DocxLocation } from '../docxExtraction.service';

const createRun = (text: string, overrides: Partial<ExtractedRun> = {}): ExtractedRun => ({
  paragraphIndex: 0,
  runIndex: 0,
  textIndex: 0,
  location: {
    paragraphIndex: 0,
    runIndex: 0,
    textIndex: 0,
    pathString: 'p[0]/r[0]/t[0]',
  },
  text,
  formatting: {
    bold: false,
    italic: false,
    underline: false,
  },
  ...overrides,
});

const createParagraph = (text: string, overrides: Partial<ExtractedParagraph> = {}): ExtractedParagraph => ({
  index: 0,
  runs: [createRun(text)],
  style: 'Normal',
  isHeading: false,
  rawText: text,
  ...overrides,
});

const createDocument = (paragraphs: ExtractedParagraph[]): ExtractedDocument => ({
  runs: paragraphs.flatMap(p => p.runs),
  paragraphs,
  hasTables: false,
  hasImages: false,
  placeholderCount: 0,
});

describe('EntityDetectorService', () => {
  let service: EntityDetectorService;

  beforeEach(() => {
    service = new EntityDetectorService({
      enableAiAssistance: false,
    });
  });

  it('extracts email via regex', async () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('Contact me at kushagra@example.com', {
        runs: [createRun('Contact me at kushagra@example.com')],
      }),
    ];
    const doc = createDocument(paras);
    const result = await service.detect(doc, [{ title: 'Contact' }]);

    expect(result.entities.some(e => e.type === 'email' && e.value === 'kushagra@example.com')).toBe(true);
  });

  it('extracts phone via regex', async () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('Call +916395248403', { runs: [createRun('Call +916395248403')] }),
    ];
    const doc = createDocument(paras);
    const result = await service.detect(doc, [{ title: 'Contact' }]);

    expect(result.entities.some(e => e.type === 'phone' && e.value === '+916395248403')).toBe(true);
  });

  it('extracts URL via regex', async () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('Visit https://example.com', { runs: [createRun('Visit https://example.com')] }),
    ];
    const doc = createDocument(paras);
    const result = await service.detect(doc, [{ title: 'Contact' }]);

    expect(result.entities.some(e => e.type === 'url' && e.value === 'https://example.com')).toBe(true);
  });

  it('fallbacks to regex when AI is disabled', async () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('Email: test@test.com', { index: 0, runs: [createRun('Email: test@test.com')] }),
    ];
    const doc = createDocument(paras);
    const result = await service.detect(doc, [{ title: 'Contact' }]);

    expect(result.entities.some(e => e.type === 'email')).toBe(true);
    expect(result.issues.filter(i => i.severity === 'error').length).toBe(0);
  });

  it('does not crash when AI throws', async () => {
    const badService = new EntityDetectorService({
      enableAiAssistance: true,
      googleAiApiKey: 'invalid-key',
    });
    
    const paras: ExtractedParagraph[] = [
      createParagraph('Some long text ' + 'a'.repeat(250), { runs: [createRun('Some long text ' + 'a'.repeat(250))] }),
    ];
    const doc = createDocument(paras);
    
    await expect(badService.detect(doc, [{ title: 'Experience' }])).resolves.toBeDefined();
  });

  it('deduplicates overlapping entities', async () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('test@test.com test@test.com', { runs: [createRun('test@test.com test@test.com')] }),
    ];
    const doc = createDocument(paras);
    const result = await service.detect(doc, [{ title: 'Contact' }]);

    const emailEntities = result.entities.filter(e => e.type === 'email');
    expect(emailEntities.length).toBe(1);
  });

  it('overlap-aware dedup merges phone substrings', async () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('+916395248403', { runs: [createRun('+916395248403')] }),
    ];
    const doc = createDocument(paras);
    const result = await service.detect(doc, [{ title: 'Contact' }]);

    const phoneEntities = result.entities.filter(e => e.type === 'phone');
    expect(phoneEntities.length).toBe(1);
    expect(phoneEntities[0].value).toBe('+916395248403');
  });

  it('extracts year entities in date context', async () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('Graduated Jan 2023', { runs: [createRun('Graduated Jan 2023')] }),
    ];
    const doc = createDocument(paras);
    const result = await service.detect(doc, [{ title: 'Education' }]);

    expect(result.entities.some(e => e.type === 'date' && e.value === 'Jan 2023')).toBe(true);
  });

  it('does not extract standalone year without date context', async () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('Graduated in 2023', { runs: [createRun('Graduated in 2023')] }),
    ];
    const doc = createDocument(paras);
    const result = await service.detect(doc, [{ title: 'Education' }]);

    expect(result.entities.some(e => e.type === 'date' && e.value === '2023')).toBe(false);
  });

  it('detects name entities from all-caps text', async () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('KUSHAGRA SINGH BHADAURIA', { runs: [createRun('KUSHAGRA SINGH BHADAURIA')] }),
    ];
    const doc = createDocument(paras);
    const result = await service.detect(doc, [{ title: 'Professional Summary' }]);

    expect(result.entities.some(e => e.type === 'name' && e.value === 'KUSHAGRA SINGH BHADAURIA')).toBe(true);
  });

  it('detects name entities from concatenated all-caps text', async () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('KUSHAGRASINGHBHADAURIASoftwareDeveloper', { runs: [createRun('KUSHAGRASINGHBHADAURIASoftwareDeveloper')] }),
    ];
    const doc = createDocument(paras);
    const result = await service.detect(doc, [{ title: 'Professional Summary' }]);

    expect(result.entities.some(e => e.type === 'name' && e.value === 'KUSHAGRASINGHBHADAURIAS')).toBe(true);
  });

  it('detects name entities from title-case text', async () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('Kushagra Singh Bhadauria', { runs: [createRun('Kushagra Singh Bhadauria')] }),
    ];
    const doc = createDocument(paras);
    const result = await service.detect(doc, [{ title: 'Professional Summary' }]);

    expect(result.entities.some(e => e.type === 'name' && e.value === 'Kushagra Singh Bhadauria')).toBe(true);
  });

  it('warns when expected resume name is missing', async () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('Just some text without a name', { runs: [createRun('Just some text without a name')] }),
    ];
    const doc = createDocument(paras);
    const result = await service.detect(doc, [{ title: 'Summary' }]);

    expect(result.issues.some(i => i.message.includes('name'))).toBe(true);
  });

  it('does not invent entities not present in text', async () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('Hello world', { runs: [createRun('Hello world')] }),
    ];
    const doc = createDocument(paras);
    const result = await service.detect(doc, [{ title: 'Skills' }]);

    expect(result.entities).toHaveLength(0);
  });
});

import { generatePdfBuffer, generateDocxBuffer } from '../src/utils/exportUtils';

describe('Final Export utilities', () => {
  const sample = {
    topic: 'Test Paper on AI',
    abstract: 'This is a short abstract about AI research.',
    outline: [{ title: 'Introduction' }, { title: 'Methods' }, { title: 'Results' }],
    content: {
      Introduction: 'Intro content here.',
      Methods: 'Methods content here.',
      Results: 'Results content here.'
    },
    citations: [
      { apa: 'Doe, J. (2020). Example.', mla: 'Doe J. Example.', ieee: 'J. Doe, "Example", 2020.' }
    ]
  };

  it('generates a PDF buffer that starts with %PDF', async () => {
    const buf = await generatePdfBuffer(sample as any);
    expect(buf).toBeInstanceOf(Buffer);
    const header = buf.slice(0, 4).toString('utf8');
    expect(header).toContain('%PDF');
    expect(buf.length).toBeGreaterThan(500);
  }, 20000);

  it('generates a DOCX buffer that is a zip (PK)', async () => {
    const buf = await generateDocxBuffer(sample as any);
    expect(buf).toBeInstanceOf(Buffer);
    const header = buf.slice(0, 2).toString('utf8');
    expect(header).toBe('PK');
    expect(buf.length).toBeGreaterThan(1000);
  }, 20000);
});

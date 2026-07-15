// src/services/parsing/__tests__/ImageParser.test.ts
import { ImageParser } from '../imageParser';

describe('ImageParser', () => {
  it('should return empty string for any buffer', async () => {
    const parser = new ImageParser();
    const dummyBuffer = Buffer.from([0, 1, 2, 3]);
    const content = await parser.parse(dummyBuffer);
    expect(content).toBe('');
  });
});

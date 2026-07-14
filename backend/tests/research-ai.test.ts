import { GeminiAIProvider } from '../src/core/ai/gemini.provider';
import { MockAIProvider } from '../src/core/ai/mock.provider';
import { FailoverAIProvider } from '../src/core/ai/failover.provider';
import { OpenRouterAIProvider } from '../src/core/ai/openrouter.provider';
import { ResearchService } from '../src/modules/research/research.service';

describe('GeminiAIProvider JSON recovery', () => {
  it('recovers markdown-wrapped truncated arrays into valid JSON', () => {
    const provider = new GeminiAIProvider();

    const parsed = (provider as any).parseJSON(
      '```json\n["Topic 1", "Topic 2"'
    );

    expect(parsed).toEqual(['Topic 1', 'Topic 2']);
  });
});

describe('Research writing improvement fallback', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fails closed when the mock provider is used for a rewrite request', async () => {
    const provider = new MockAIProvider();
    const service = new ResearchService(provider as any, {} as any);

    await expect(service.improveContent({
      text: 'Artificial intelligence is transforming healthcare through improved diagnostics, treatment personalization, and evidence-based clinical decision support.'
    })).rejects.toThrow('AI service is temporarily unavailable. Please try again later.');
  });

  it('does not fall back to the mock provider in production when Gemini returns a quota error', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const provider = new GeminiAIProvider();
    const generateContentSpy = jest.spyOn(provider as any, 'generateContent')
      .mockRejectedValueOnce(Object.assign(new Error('AI generation failed: quota exceeded'), {
        status: 429,
        code: 'RESOURCE_EXHAUSTED',
      }));

    await expect(provider.generateJSON('{"improvedText": "Rewritten paragraph"}', {
      temperature: 0.35,
      maxTokens: 300,
    })).rejects.toThrow('The AI service has reached its temporary usage limit. Please try again in a few moments.');

    expect(generateContentSpy).toHaveBeenCalledTimes(1);
    process.env.NODE_ENV = previousNodeEnv;
  });

  it('retries transient Gemini failures before surfacing a real error', async () => {
    const provider = new GeminiAIProvider();
    const mockedGenerateContent = jest.fn()
      .mockRejectedValueOnce(Object.assign(new Error('AI generation failed: rate limit exceeded'), {
        status: 429,
        code: 'RESOURCE_EXHAUSTED',
      }))
      .mockRejectedValueOnce(Object.assign(new Error('AI generation failed: service unavailable'), {
        status: 503,
        code: 'SERVICE_UNAVAILABLE',
      }))
      .mockResolvedValueOnce({
        text: '{"improvedText": "Artificial intelligence is reshaping healthcare by improving diagnostic precision and supporting evidence-based decision making."}',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      });

    (provider as any).ai = {
      models: {
        generateContent: mockedGenerateContent,
      },
    };

    await expect(provider.generateContent('test prompt', {
      temperature: 0.35,
      maxTokens: 300,
    })).resolves.toEqual({
      text: '{"improvedText": "Artificial intelligence is reshaping healthcare by improving diagnostic precision and supporting evidence-based decision making."}',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    });

    expect(mockedGenerateContent).toHaveBeenCalledTimes(3);
  });

  it('fails closed when the model cannot return a transformed paragraph', async () => {
    const provider = {
      async generateContent() {
        return { text: 'copy', usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
      },
      async generateJSON<T>() {
        return { improvedText: 'Artificial intelligence is transforming healthcare through improved diagnostics, treatment personalization, and evidence-based clinical decision support.' } as T;
      },
      isAvailable() { return true; },
      getProviderName() { return 'Gemini'; },
    } as any;

    const service = new ResearchService(provider, {} as any);

    await expect(service.improveContent({
      text: 'Artificial intelligence is transforming healthcare through improved diagnostics, treatment personalization, and evidence-based clinical decision support.'
    })).rejects.toThrow('AI service is temporarily unavailable. Please try again later.');
  });

  it('normalizes a successful provider output to a single academic paragraph', async () => {
    const provider = {
      async generateJSON<T>() {
        return {
          improvedText: '\n\nHere is a stronger academic rewrite: Artificial intelligence is reshaping healthcare by improving diagnostic precision, supporting personalized treatment strategies, and strengthening evidence-based decision making.\n'
        } as T;
      },
      async generateContent() {
        return { text: 'ok', usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
      },
      isAvailable() { return true; },
      getProviderName() { return 'Gemini'; },
    } as any;

    const service = new ResearchService(provider, {} as any);

    const improved = await service.improveContent({
      text: 'Artificial intelligence is transforming healthcare through improved diagnostics, treatment personalization, and evidence-based clinical decision support.'
    });

    expect(improved).toBeTruthy();
    expect(improved).not.toMatch(/Here is/i);
    expect(improved.split(/\n+/).length).toBe(1);
  });

  it('falls back to OpenRouter when Gemini returns quota errors', async () => {
    const gemini = {
      async generateContent() { throw Object.assign(new Error('quota exceeded'), { status: 429, code: 'RESOURCE_EXHAUSTED' }); },
      isAvailable() { return true; },
      getProviderName() { return 'Gemini'; }
    } as any;

    const openrouter = {
      async generateContent() { return { text: '["t1","t2"]', usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } }; },
      async generateJSON<T>(p: string) { return JSON.parse('["t1","t2"]') as unknown as T; },
      isAvailable() { return true; },
      getProviderName() { return 'OpenRouter'; }
    } as any;

    const failover = new FailoverAIProvider(gemini, openrouter);

    const res = await failover.generateJSON<string[]>('prompt');
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(2);
  });

  it('returns friendly error when both providers unavailable', async () => {
    const gemini = {
      async generateContent() { throw Object.assign(new Error('quota exceeded'), { status: 429, code: 'RESOURCE_EXHAUSTED' }); },
      isAvailable() { return true; },
      getProviderName() { return 'Gemini'; }
    } as any;

    const openrouter = {
      async generateContent() { throw Object.assign(new Error('service unavailable'), { status: 503, code: 'SERVICE_UNAVAILABLE' }); },
      isAvailable() { return true; },
      getProviderName() { return 'OpenRouter'; }
    } as any;

    const failover = new FailoverAIProvider(gemini, openrouter);

    await expect(failover.generateJSON('prompt')).rejects.toThrow('The AI service is temporarily unavailable. Please try again later.');
  });
});

import axios, { AxiosError, AxiosResponse } from 'axios';
import { IAIProvider, AIConfig, AIResponse } from './ai.provider';
import { Logger } from '../../shared/utils';

const logger = new Logger('OpenRouterAIProvider');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL;
const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_TIMEOUT_MS = Number(process.env.OPENROUTER_TIMEOUT_MS ?? 60000);
const OPENROUTER_MAX_TOKENS = Number(process.env.OPENROUTER_MAX_TOKENS ?? 1500);
const OPENROUTER_TEMPERATURE = Number(process.env.OPENROUTER_TEMPERATURE ?? 0.7);
const OPENROUTER_RETRY_COUNT = Math.max(0, Number(process.env.OPENROUTER_RETRY_COUNT ?? 2));
const OPENROUTER_PROMPT_MAX_LENGTH = Number(process.env.OPENROUTER_PROMPT_MAX_LENGTH ?? 12000);
const OPENROUTER_RESPONSE_MAX_LENGTH = Number(process.env.OPENROUTER_RESPONSE_MAX_LENGTH ?? 100000);

const BACKOFF_BASE_MS = 300;

interface OpenRouterRequestBody {
  model: string;
  messages: Array<{ role: 'system' | 'user'; content: string }>;
  temperature: number;
  max_tokens: number;
}

interface OpenRouterUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

interface OpenRouterResponseData {
  choices?: Array<{ message?: { content?: string } }>;
  output?: string;
  text?: string;
  usage?: OpenRouterUsage;
}

interface OpenRouterProviderError extends Error {
  code?: string;
  status?: number;
  response?: unknown;
  request?: unknown;
  provider?: string;
  cause?: unknown;
}

export class OpenRouterAIProvider implements IAIProvider {
  private apiKey: string | undefined = OPENROUTER_API_KEY;
  private model: string | undefined = OPENROUTER_MODEL;
  private timeoutMs = OPENROUTER_TIMEOUT_MS;
  private maxTokens = OPENROUTER_MAX_TOKENS;
  private temperature = OPENROUTER_TEMPERATURE;
  private retryCount = OPENROUTER_RETRY_COUNT;
  private promptMaxLength = Math.max(1, OPENROUTER_PROMPT_MAX_LENGTH);
  private responseMaxLength = Math.max(1, OPENROUTER_RESPONSE_MAX_LENGTH);

  constructor() {
    if (!this.apiKey) {
      logger.warn('OpenRouter provider disabled: OPENROUTER_API_KEY is not configured.');
    }

    if (!this.model) {
      logger.warn('OpenRouter provider disabled: OPENROUTER_MODEL is not configured.');
    }

    if (this.apiKey && this.model) {
      logger.info('OpenRouter provider initialized', {
        provider: this.getProviderName(),
        model: this.model,
        timeoutMs: this.timeoutMs,
      });
    }
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.model);
  }

  getProviderName(): string {
    return 'OpenRouter';
  }

  async generateContent(prompt: string, config?: AIConfig): Promise<AIResponse> {
    if (!this.apiKey) {
      throw this.createProviderError('OpenRouter provider is not configured', 'OPENROUTER_NOT_CONFIGURED', 500);
    }

    const model = config?.model || this.model;
    if (!model) {
      throw this.createProviderError('OpenRouter model is not configured', 'OPENROUTER_MODEL_NOT_CONFIGURED', 500);
    }

    const validatedPrompt = this.validatePrompt(prompt);
    let lastError: OpenRouterProviderError | null = null;

    for (let attempt = 0; attempt <= this.retryCount; attempt += 1) {
      try {
        return await this.requestModel(validatedPrompt, model, config);
      } catch (error: unknown) {
        lastError = this.normalizeError(error);
        if (attempt < this.retryCount && this.isRetryableError(lastError)) {
          const delayMs = BACKOFF_BASE_MS * Math.pow(2, attempt);
          logger.warn('OpenRouter request retry scheduled', {
            provider: this.getProviderName(),
            model,
            attempt: attempt + 1,
            maxRetries: this.retryCount,
            delayMs,
            error: this.errorSummary(lastError),
          });
          await this.delay(delayMs);
          continue;
        }

        throw lastError;
      }
    }

    throw this.createProviderError('OpenRouter request failed after retry attempts', 'OPENROUTER_REQUEST_FAILED', this.extractStatus(lastError) ?? undefined, lastError ?? undefined);
  }

  async generateJSON<T>(prompt: string, config?: AIConfig): Promise<T> {
    // Encourage the model to return strict JSON output.
    const jsonInstruction = '\n\nIMPORTANT: Return ONLY a single valid JSON object matching the requested schema and nothing else. Do not include any explanation, markdown, or extra text.';
    const augmentedPrompt = `${prompt}${jsonInstruction}`;

    const response = await this.generateContent(augmentedPrompt, config);

    // Try parsing as JSON first. If parsing fails, treat the whole response as plain text
    // and return it wrapped under a sensible default key so callers (e.g. ResearchService)
    // that expect `{ improvedText: string }` continue to work.
    try {
      return this.parseJsonResponse<T>(response.text);
    } catch (err) {
      logger.warn('OpenRouter JSON parse failed; returning raw text wrapped in fallback object', {
        provider: this.getProviderName(),
        parseError: String(err),
        snippet: (response.text || '').slice(0, 200),
      });

      const fallback = { improvedText: response.text } as unknown as T;
      return fallback;
    }
  }


  private async requestModel(prompt: string, model: string, config?: AIConfig): Promise<AIResponse> {
    const start = Date.now();
    const body: OpenRouterRequestBody = {
      model,
      messages: this.buildMessages(prompt, config),
      temperature: config?.temperature ?? this.temperature,
      max_tokens: config?.maxTokens ?? this.maxTokens,
    };

    logger.info('OpenRouter request started', {
      provider: this.getProviderName(),
      providerClass: this.constructor.name,
      model,
      promptLength: prompt.length,
      maxTokens: body.max_tokens,
      timeoutMs: this.timeoutMs,
      requestTimestamp: new Date().toISOString(),
    });

    try {
      const response: AxiosResponse<OpenRouterResponseData> = await axios.post(OPENROUTER_API_URL, body, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          Referer: 'https://academicuniverse.com',
          'X-Title': 'Academic Universe',
        },
        timeout: this.timeoutMs,
      });

      const text = this.extractText(response.data);
      const usage = this.extractUsage(response.data);
      const responseTimeMs = Date.now() - start;

      logger.info('OpenRouter response received', {
        provider: this.getProviderName(),
        model,
        httpStatus: response.status,
        responseTimeMs,
        usage,
        rawResponse: this.safeSerialize(response.data),
        parsedResponse: text,
        finalReturnedValue: { text: text.slice(0, 4000), usage },
      });

      return { text, usage };
    } catch (error: unknown) {
      const normalized = this.normalizeError(error);
      logger.error('OpenRouter error', {
        provider: this.getProviderName(),
        model,
        status: this.extractStatus(normalized),
        code: this.extractCode(normalized),
        error: this.errorSummary(normalized),
        responseBody: normalized.response,
        stack: normalized.stack,
      });
      throw normalized;
    }
  }

  private buildMessages(prompt: string, config?: AIConfig) {
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (config?.systemInstruction) {
      messages.push({ role: 'system', content: config.systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });
    return messages;
  }

  private safeSerialize(value: unknown): unknown {
    try {
      return JSON.parse(JSON.stringify(value, (_key, val) => {
        if (typeof val === 'string' && val.length > 4000) {
          return `${val.slice(0, 4000)}...`;
        }
        return val;
      }));
    } catch {
      return String(value);
    }
  }

  private extractText(data: OpenRouterResponseData): string {
    if (!data) {
      throw this.createProviderError('OpenRouter response is empty', 'OPENROUTER_INVALID_RESPONSE', 502);
    }

    const content = data.choices?.[0]?.message?.content;
    if (typeof content === 'string' && content.trim()) {
      return content;
    }

    throw this.createProviderError('OpenRouter response did not contain choices[0].message.content', 'OPENROUTER_INVALID_RESPONSE', 502);
  }

  private extractUsage(data: OpenRouterResponseData) {
    return {
      promptTokens: Number(data.usage?.prompt_tokens ?? data.usage?.promptTokens ?? 0),
      completionTokens: Number(data.usage?.completion_tokens ?? data.usage?.completionTokens ?? 0),
      totalTokens: Number(data.usage?.total_tokens ?? data.usage?.totalTokens ?? 0),
    };
  }

  private normalizeError(error: unknown): OpenRouterProviderError {
    if (!error) {
      return this.createProviderError('Unknown OpenRouter error', 'OPENROUTER_UNKNOWN_ERROR', 500);
    }

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const normalized = new Error(axiosError.message) as OpenRouterProviderError;
      normalized.name = axiosError.name;
      normalized.code = axiosError.code;
      normalized.status = axiosError.response?.status ?? undefined;
      normalized.response = axiosError.response?.data ?? undefined;
      normalized.request = axiosError.request ?? undefined;
      return normalized;
    }

    if (error instanceof Error) {
      return error as OpenRouterProviderError;
    }

    return new Error(String(error)) as OpenRouterProviderError;
  }

  private isRetryableError(error: OpenRouterProviderError): boolean {
    const status = this.extractStatus(error);
    const message = String(error?.message || '').toLowerCase();
    const networkCodes = ['ecancelled', 'etimedout', 'ecanceled', 'econnreset', 'eai_again', 'econnrefused', 'econnaborted', 'ehostunreach'];

    return (
      (status !== null && [429, 500, 502, 503, 504].includes(status)) ||
      networkCodes.includes(String(error?.code || '').toLowerCase()) ||
      /rate limit|quota|temporarily unavailable|server error|timeout|connection aborted|socket hang up/i.test(message)
    );
  }

  private shouldFallbackModel(error: OpenRouterProviderError, isLastModel: boolean): boolean {
    if (isLastModel) {
      return false;
    }

    if (this.isRetryableError(error)) {
      return true;
    }

    const status = this.extractStatus(error);
    const message = String(error?.message || '').toLowerCase();
    if (status !== null && [400, 404].includes(status) && /model|invalid|not found|unavailable|unsupported|does not exist/.test(message)) {
      return true;
    }

    return false;
  }

  private extractStatus(error: OpenRouterProviderError | null): number | null {
    if (!error) return null;
    if (typeof error.status === 'number') return error.status;
    if (this.isRecord(error.response)) {
      if (typeof error.response.status === 'number') {
        return error.response.status;
      }
      if (this.isRecord(error.response.data) && typeof error.response.data.status === 'number') {
        return error.response.data.status;
      }
    }
    const match = String(error?.message || '').match(/(\d{3})/);
    return match ? Number(match[1]) : null;
  }

  private extractCode(error: OpenRouterProviderError | null): string | null {
    if (!error) return null;
    if (typeof error.code === 'string') return error.code;
    if (this.isRecord(error.response) && this.isRecord(error.response.data)) {
      const responseData = error.response.data;
      const nestedError = responseData.error;
      if (this.isRecord(nestedError) && typeof nestedError.code === 'string') {
        return nestedError.code;
      }
    }
    return null;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private errorSummary(error: OpenRouterProviderError) {
    return {
      status: this.extractStatus(error),
      code: this.extractCode(error),
      message: String(error?.message || ''),
    };
  }

  private validatePrompt(prompt: string): string {
    const normalized = this.normalizeControlCharacters(prompt);
    if (normalized.length > this.promptMaxLength) {
      throw this.createProviderError(
        `Prompt exceeds maximum allowed length of ${this.promptMaxLength} characters`,
        'OPENROUTER_PROMPT_TOO_LARGE',
        400,
      );
    }
    return normalized;
  }

  private normalizeControlCharacters(value: string): string {
    return value.replace(/[\u0000-\u001F\u007F]/g, (char) => {
      if (char === '\n' || char === '\r' || char === '\t') {
        return char;
      }
      return ' ';
    });
  }

  private parseJsonResponse<T>(text: string): T {
    if (typeof text !== 'string' || !text.trim()) {
      throw this.createProviderError('OpenRouter JSON response is empty', 'OPENROUTER_JSON_EMPTY', 500);
    }

    if (text.length > this.responseMaxLength) {
      throw this.createProviderError(
        `OpenRouter JSON response exceeds maximum allowed length of ${this.responseMaxLength} characters`,
        'OPENROUTER_JSON_TOO_LARGE',
        500,
      );
    }

    const primaryParsed = this.safeParseJson(text);
    if (primaryParsed !== null) {
      return primaryParsed as T;
    }

    const cleaned = this.normalizeControlCharacters(String(text)).replace(/```json|```/g, '').trim();
    const secondaryParsed = this.safeParseJson(cleaned);
    if (secondaryParsed !== null) {
      return secondaryParsed as T;
    }

    throw this.createProviderError('OpenRouter response could not be parsed as JSON', 'OPENROUTER_JSON_PARSE_FAILED', 500);
  }

  private safeParseJson(text: string): unknown | null {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private createProviderError(message: string, code: string, status?: number, cause?: unknown): OpenRouterProviderError {
    const error = new Error(message) as OpenRouterProviderError;
    error.code = code;
    error.status = status;
    error.provider = this.getProviderName();
    if (cause) error.cause = cause;
    return error;
  }
}

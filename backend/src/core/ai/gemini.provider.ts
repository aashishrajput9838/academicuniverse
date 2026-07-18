/**
 * Gemini AI Provider Implementation
 * Implements IAIProvider using Google's Gemini API
 */

import { GoogleGenAI } from '@google/genai';
import { IAIProvider, AIConfig, AIResponse } from './ai.provider';
import { MockAIProvider } from './mock.provider';
import { Logger } from '../../shared/utils';
import * as crypto from 'crypto';

const logger = new Logger('GeminiAIProvider');
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 500;
const QUOTA_EXCEEDED_MESSAGE = 'The AI service has reached its temporary usage limit. Please try again in a few moments.';
const GEMINI_DEFAULT_MODEL = process.env.GEMINI_DEFAULT_MODEL || 'gemini-2.5-flash';
const GEMINI_CACHE_TTL_MS = Number(process.env.GEMINI_CACHE_TTL_MS || 5 * 60 * 1000);
const GEMINI_CACHE_MAX_ENTRIES = Number(process.env.GEMINI_CACHE_MAX_ENTRIES || 200);

export class GeminiAIProvider implements IAIProvider {
  private ai: GoogleGenAI | null = null;
  private defaultModel: string = GEMINI_DEFAULT_MODEL;
  private responseCache = new Map<string, { response: AIResponse; expiresAt: number }>();
  private inFlightRequests = new Map<string, Promise<AIResponse>>();

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      logger.warn('GEMINI_API_KEY is not set or using placeholder. AI features will be limited.');
      return;
    }

    try {
      this.ai = new GoogleGenAI({ apiKey });
      logger.info('Google Gemini client initialized successfully', {
        geminiKeyMasked: this.maskApiKey(apiKey),
      });
    } catch (error) {
      logger.error('Failed to initialize Gemini AI client:', error);
    }
  }

  /**
   * Check if Gemini is available
   */
  isAvailable(): boolean {
    return this.ai !== null;
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'Google Gemini';
  }

  /**
   * Generate content from prompt
   */
  async generateContent(prompt: string, config?: AIConfig): Promise<AIResponse> {
    if (!this.ai) {
      throw new Error('Gemini AI provider is not initialized');
    }

    // Testing hook: allow forcing Gemini to fail (simulate quota/resource errors)
    if (process.env.GEMINI_FORCE_FAIL === '1') {
      const err: any = new Error('AI generation failed: quota exceeded');
      err.status = 429;
      err.code = 'RESOURCE_EXHAUSTED';
      throw err;
    }

    const model = config?.model || this.defaultModel;
    const temperature = config?.temperature ?? 0.7;
    const maxTokens = config?.maxTokens ?? 1500;
    const requestTimestamp = new Date().toISOString();
    const requestStartedAt = Date.now();
    const cacheKey = this.getCacheKey(prompt, { model, temperature, maxTokens, systemInstruction: config?.systemInstruction });
    const cachedResponse = this.getCachedResponse(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    const inFlight = this.inFlightRequests.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    let lastError: any;
    const execution = (async (): Promise<AIResponse> => {
      for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
        try {
          logger.info('Gemini request started', {
            provider: this.getProviderName(),
            model,
            requestTimestamp,
            attempt,
            maxRetries: MAX_RETRIES,
          });

          const response = await this.ai!.models.generateContent({
            model,
            contents: config?.systemInstruction 
              ? `${config.systemInstruction}\n\n${prompt}`
              : prompt,
            config: {
              temperature,
              maxOutputTokens: maxTokens,
            }
          });

          const rawText = response?.text || '';
          const responseTimeMs = Date.now() - requestStartedAt;

          logger.info('Gemini request completed', {
            provider: this.getProviderName(),
            model,
            requestTimestamp,
            responseTimeMs,
            httpStatus: 200,
            errorCode: null,
          });

          // Log raw response object for troubleshooting (keeps in structured logs)
          try {
            logger.info('Gemini raw response before processing', {
              rawText: rawText.slice ? rawText.slice(0, 4000) : rawText,
              rawResponse: this.safeSerialize(response),
            });
          } catch (e) {
            logger.warn('Failed to serialize Gemini response for logs', { err: String(e) });
          }

          // TEMP: Instrument raw response for truncation debugging
          try {
            const finishReason = response?.candidates?.[0]?.finishReason || 'UNKNOWN';
            const usageMetadata = response?.usageMetadata || {};
            logger.info('Gemini raw response instrumentation', {
              rawTextLength: rawText.length,
              finishReason,
              usageMetadata,
              rawTextPreview: rawText.slice ? rawText.slice(0, 2000) : rawText,
            });
          } catch (e) {
            logger.warn('Failed to log Gemini instrumentation', { err: String(e) });
          }

          return {
            text: rawText,
            usage: {
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0,
            }
          };
        } catch (error: any) {
          const statusCode = this.extractHttpStatus(error);
          const errorCode = this.extractErrorCode(error);
          const responseTimeMs = Date.now() - requestStartedAt;

          // Enrich logs with HTTP error details when available
          const httpErrorDetails: any = {
            httpStatus: statusCode || 500,
            errorCode,
            attempt,
            message: error?.message,
          };

          if (error?.response) {
            httpErrorDetails.responseHeaders = error.response.headers || null;
            httpErrorDetails.responseBody = error.response.data || error.response.body || null;
          }

          logger.error('Error calling Gemini API:', {
            provider: this.getProviderName(),
            model,
            requestTimestamp,
            responseTimeMs,
            ...httpErrorDetails,
            stack: error?.stack,
          });

          lastError = error;

          if (this.shouldRetry(error) && attempt <= MAX_RETRIES) {
            const delayMs = Math.min(INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1), 4000);

            logger.warn('Transient Gemini failure detected; retrying request', {
              provider: this.getProviderName(),
              model,
              requestTimestamp,
              retryAttempt: attempt + 1,
              delayMs,
              httpStatus: statusCode || 500,
              errorCode,
            });

            await this.sleep(delayMs);
            continue;
          }

          break;
        }
      }

      const friendlyMessage = this.buildFriendlyProviderError(lastError);
      const err = new Error(friendlyMessage);
      (err as any).cause = lastError;
      const statusCode = this.extractHttpStatus(lastError);
      const errorCode = this.extractErrorCode(lastError);
      (err as any).status = statusCode || 429;
      (err as any).code = errorCode || 'RESOURCE_EXHAUSTED';
      throw err;
    })();

    this.inFlightRequests.set(cacheKey, execution);
    try {
      const result = await execution;
      this.saveResponseToCache(cacheKey, result);
      return result;
    } finally {
      this.inFlightRequests.delete(cacheKey);
    }
  }

  /**
   * Generate and parse JSON response
   */
  async generateJSON<T>(prompt: string, config?: AIConfig): Promise<T> {
    try {
      const response = await this.generateContent(prompt, {
        ...config,
        temperature: config?.temperature ?? 0.3,
        maxTokens: config?.maxTokens ?? 4000,
      });

      return this.parseJSON<T>(response.text);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Parse JSON from AI response (handles markdown code blocks and truncated responses)
   */
  private parseJSON<T>(rawText: string): T {
    let cleanJson = this.normalizeJson(rawText);
    const extracted = this.extractJson(cleanJson);
    cleanJson = extracted;

    // TEMP: Instrument raw text before JSON parse
    let rawSubjectCount = 0;
    try {
      const rawObj = JSON.parse(cleanJson);
      if (rawObj && Array.isArray(rawObj.subjects)) {
        rawSubjectCount = rawObj.subjects.length;
      }
    } catch {
      // expected if truncated
    }

    try {
      const result = JSON.parse(cleanJson) as T;
      logger.info('Gemini JSON parse: first attempt succeeded', {
        rawTextLength: rawText.length,
        subjectCount: rawSubjectCount,
      });
      return result;
    } catch (error) {
      logger.info('Gemini JSON parse: first attempt failed, attempting repair', {
        rawTextLength: rawText.length,
        cleanJsonLength: cleanJson.length,
        rawSubjectCount,
        error: error.message,
      });

      const repairedJson = this.repairTruncatedJson(cleanJson);

      if (repairedJson !== cleanJson) {
        try {
          const result = JSON.parse(repairedJson) as T;
          let repairedSubjectCount = 0;
          try {
            const repairedObj = result as any;
            if (Array.isArray(repairedObj?.subjects)) {
              repairedSubjectCount = repairedObj.subjects.length;
            }
          } catch {
            // ignore
          }
          logger.info('Gemini JSON parse: repair succeeded', {
            rawTextLength: rawText.length,
            repairedJsonLength: repairedJson.length,
            rawSubjectCount,
            repairedSubjectCount,
          });
          return result;
        } catch (repairError) {
          logger.error('Gemini JSON parse: repair also failed', {
            rawTextLength: rawText.length,
            repairedJsonLength: repairedJson.length,
            error: repairError instanceof Error ? repairError.message : String(repairError),
          });
        }
      }

      logger.error('Failed to parse JSON from AI response:', { rawText, error });
      throw new Error('Invalid JSON response from AI');
    }
  }

  private extractJson(text: string): string {
    const startObj = text.indexOf('{');
    const startArr = text.indexOf('[');
    
    if (startObj === -1 && startArr === -1) return text;
    
    const startIndex = (startObj !== -1 && startArr !== -1) 
      ? Math.min(startObj, startArr) 
      : Math.max(startObj, startArr);

    const isArray = text[startIndex] === '[';
    let stack = 0;
    let inString = false;
    let escaped = false;
    
    for (let i = startIndex; i < text.length; i++) {
      const char = text[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
      } else {
        if (char === '"') inString = true;
        else if (char === (isArray ? '[' : '{')) stack++;
        else if (char === (isArray ? ']' : '}')) stack--;
        
        if (stack === 0) {
          return text.slice(startIndex, i + 1);
        }
      }
    }
    
    return text.slice(startIndex);
  }

  private shouldFallbackToMock(error: any): boolean {
    const message = String(error?.message || error || '');
    return message.includes('Gemini AI provider is not initialized')
      || message.includes('quota')
      || message.includes('429')
      || message.includes('RESOURCE_EXHAUSTED')
      || message.includes('rate limit')
      || message.includes('exceeded your current quota');
  }

  private shouldRetry(error: any): boolean {
    const statusCode = this.extractHttpStatus(error);
    const errorCode = this.extractErrorCode(error);
    const message = String(error?.message || error || '');

    return statusCode === 429 || statusCode === 503
      || errorCode === 'RESOURCE_EXHAUSTED'
      || errorCode === 'SERVICE_UNAVAILABLE'
      || /quota|rate limit|temporarily unavailable|service unavailable/i.test(message);
  }

  private extractHttpStatus(error: any): number | null {
    if (typeof error?.status === 'number') {
      return error.status;
    }

    if (typeof error?.response?.status === 'number') {
      return error.response.status;
    }

    const message = String(error?.message || error || '');
    const match = message.match(/"code":\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : null;
  }

  private extractErrorCode(error: any): string | null {
    if (typeof error?.code === 'string') {
      return error.code;
    }

    const message = String(error?.message || error || '').toUpperCase();
    if (message.includes('RESOURCE_EXHAUSTED')) {
      return 'RESOURCE_EXHAUSTED';
    }
    if (message.includes('SERVICE_UNAVAILABLE')) {
      return 'SERVICE_UNAVAILABLE';
    }
    if (message.includes('QUOTA')) {
      return 'QUOTA_EXCEEDED';
    }

    return null;
  }

  private buildFriendlyProviderError(error: any): string {
    const message = String(error?.message || error || '');
    if (this.shouldRetry(error) || /quota|RESOURCE_EXHAUSTED|rate limit|usage limit/i.test(message)) {
      return QUOTA_EXCEEDED_MESSAGE;
    }

    return message || 'AI generation failed';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private normalizeJson(rawText: string): string {
    let cleanJson = rawText.trim();

    // Remove markdown code blocks if present
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/```json/g, '').replace(/```/g, '').trim();
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/```/g, '').trim();
    }

    return cleanJson;
  }

  private maskApiKey(key: string | undefined | null): string {
    if (!key) return '<none>';
    try {
      const k = String(key);
      if (k.length <= 8) return '****';
      return `${k.slice(0, 4)}...${k.slice(-4)}`;
    } catch {
      return '<masked>';
    }
  }

  private safeSerialize(obj: any): any {
    try {
      return JSON.parse(JSON.stringify(obj, (_k, v) => {
        if (typeof v === 'string' && v.length > 4000) return `${v.slice(0,4000)}...`;
        return v;
      }));
    } catch (e) {
      return String(obj);
    }
  }

  private getCacheKey(prompt: string, config: Pick<AIConfig, 'model' | 'temperature' | 'maxTokens' | 'systemInstruction'>): string {
    const normalized = JSON.stringify({
      prompt: prompt.trim(),
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      systemInstruction: config.systemInstruction?.trim() || '',
    });
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  private getCachedResponse(cacheKey: string): AIResponse | null {
    const entry = this.responseCache.get(cacheKey);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.responseCache.delete(cacheKey);
      return null;
    }

    return entry.response;
  }

  private saveResponseToCache(cacheKey: string, response: AIResponse): void {
    this.trimCacheIfNecessary();
    this.responseCache.set(cacheKey, {
      response,
      expiresAt: Date.now() + GEMINI_CACHE_TTL_MS,
    });
  }

  private trimCacheIfNecessary(): void {
    while (this.responseCache.size >= GEMINI_CACHE_MAX_ENTRIES) {
      const oldestKey = this.responseCache.keys().next().value;
      if (!oldestKey) break;
      this.responseCache.delete(oldestKey);
    }
  }

  private repairTruncatedJson(rawText: string): string {
    if (!rawText) {
      return rawText;
    }

    const startIndex = rawText.search(/[\[{]/);
    if (startIndex === -1) {
      return rawText;
    }

    let candidate = rawText.slice(startIndex).trim();
    const originalCandidate = candidate;
    let stack: string[] = [];
    let inString = false;
    let escaped = false;

    for (const char of candidate) {
      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }

        if (char === '\\') {
          escaped = true;
          continue;
        }

        if (char === '"') {
          inString = false;
        }

        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === '[' || char === '{') {
        stack.push(char);
        continue;
      }

      if (char === ']' || char === '}') {
        const expectedOpen = stack[stack.length - 1];
        const expectedClose = expectedOpen === '[' ? ']' : '}';

        if (expectedClose === char) {
          stack.pop();
        }
      }
    }

    if (inString) {
      candidate += '"';
    }

    while (stack.length > 0) {
      const opener = stack.pop();
      candidate += opener === '[' ? ']' : '}';
    }

    // TEMP: Throw instead of silently repairing to expose raw malformed JSON
    if (candidate !== originalCandidate) {
      throw new Error(`TEMPORARY: repairTruncatedJson would have modified JSON. Raw length=${rawText.length}, repaired length=${candidate.length}. Stack remaining: ${JSON.stringify(stack)}. Original preview: ${originalCandidate.slice(0, 500)}`);
    }

    return candidate.replace(/,\s*([}\]])/g, '$1');
  }
}

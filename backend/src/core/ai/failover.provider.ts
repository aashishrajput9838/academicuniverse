import { IAIProvider, AIConfig, AIResponse } from './ai.provider';
import { Logger } from '../../shared/utils';

const logger = new Logger('FailoverAIProvider');

function normalizeError(error: any): any {
  let err = error;
  while (err && (err.cause || err.originalError)) {
    err = err.cause || err.originalError;
  }
  return err || null;
}

function isAvailabilityError(error: any): boolean {
  const err = normalizeError(error);
  if (!err) return false;

  const msg = String(err?.message || err || '').toLowerCase();
  const status = extractHttpStatus(err);
  const code = extractErrorCode(err);

  if (process.env.NODE_ENV !== 'production') return true;
  if (status === 429 || status === 503) return true;
  if (code === 'RESOURCE_EXHAUSTED' || code === 'SERVICE_UNAVAILABLE') return true;
  if (/quota|usage limit|rate limit|temporarily unavailable|service unavailable|exceeded your current quota|temporary usage limit|fetch failed/i.test(msg)) return true;

  return false;
}

function extractHttpStatus(error: any): number | null {
  const err = normalizeError(error);
  if (!err) return null;
  if (typeof err.status === 'number') return err.status;
  if (typeof err.response?.status === 'number') return err.response.status;
  if (typeof err.response?.data?.error?.status === 'number') return err.response.data.error.status;
  if (typeof err.response?.data?.status === 'number') return err.response.data.status;

  const message = String(err?.message || err || '');
  const match = message.match(/"code"\s*[:=]\s*(\d{3})/i) || message.match(/(?:status|code)\s*[:=]\s*(\d{3})/i);
  return match ? Number(match[1]) : null;
}

function extractErrorCode(error: any): string | null {
  const err = normalizeError(error);
  if (!err) return null;
  if (typeof err.code === 'string') return err.code;
  if (typeof err.response?.data?.error?.code === 'string') return err.response.data.error.code;
  if (typeof err.response?.data?.code === 'string') return err.response.data.code;

  const message = String(err?.message || err || '');
  if (message.includes('RESOURCE_EXHAUSTED')) return 'RESOURCE_EXHAUSTED';
  if (message.includes('SERVICE_UNAVAILABLE')) return 'SERVICE_UNAVAILABLE';
  if (message.includes('quota') || message.includes('usage limit') || message.includes('rate limit')) return 'QUOTA_EXCEEDED';

  return null;
}

export class FailoverAIProvider implements IAIProvider {
  constructor(private primary: IAIProvider, private fallback?: IAIProvider) {}

  isAvailable(): boolean {
    return this.primary?.isAvailable() || Boolean(this.fallback?.isAvailable && this.fallback.isAvailable());
  }

  getProviderName(): string {
    return `Failover(${this.primary.getProviderName()}->${this.fallback?.getProviderName() || 'none'})`;
  }

  async generateContent(prompt: string, config?: AIConfig): Promise<AIResponse> {
    const start = Date.now();
    let primaryError: any = null;
    try {
      const res = await this.primary.generateContent(prompt, config);
      logger.info('AI request succeeded', { provider: this.primary.getProviderName(), model: config?.model || 'default', responseTimeMs: Date.now() - start, fallback: false });
      return res;
    } catch (err: any) {
      primaryError = err;
      logger.warn('Primary provider failed', { provider: this.primary.getProviderName(), error: String(err?.message || err), code: err?.code, status: err?.status });
      if (!isAvailabilityError(err) || !this.fallback || !this.fallback.isAvailable()) {
        logger.error('Will not fallback — either error is not availability-related or no fallback available', { provider: this.primary.getProviderName(), code: err?.code, status: err?.status });
        throw err;
      }

      logger.warn('Primary provider availability error detected; attempting fallback', {
        provider: this.primary.getProviderName(),
        code: err?.code,
        status: err?.status,
        fallbackProvider: this.fallback.getProviderName(),
      });
    }

    // Attempt fallback
    try {
      const fallbackStart = Date.now();
      const res = await this.fallback!.generateContent(prompt, config);
      logger.info('Fallback provider succeeded', { primary: this.primary.getProviderName(), fallback: this.fallback!.getProviderName(), responseTimeMs: Date.now() - fallbackStart });
      return res;
    } catch (err2: any) {
      logger.error('Fallback provider failed', { primaryError: String(primaryError?.message || primaryError), fallbackError: String(err2?.message || err2) });
      // Throw friendly provider error for availability issues
      if (isAvailabilityError(err2) || isAvailabilityError(primaryError)) {
        throw new Error('The AI service is temporarily unavailable. Please try again later.');
      }

      // If fallback failed with a non-availability error, rethrow original primary error if availability-related, else throw fallback error
      throw err2;
    }
  }

  async generateJSON<T>(prompt: string, config?: AIConfig): Promise<T> {
    let primaryError: any = null;
    try {
      const res = await this.primary.generateJSON<T>(prompt, config);
      return res;
    } catch (err: any) {
      primaryError = err;
      if (!isAvailabilityError(err) || !this.fallback || !this.fallback.isAvailable()) {
        throw err;
      }
    }

    // Attempt fallback
    try {
      const res = await this.fallback!.generateJSON<T>(prompt, config);
      return res;
    } catch (err2: any) {
      if (isAvailabilityError(err2) || isAvailabilityError(primaryError)) {
        throw new Error('The AI service is temporarily unavailable. Please try again later.');
      }
      throw err2;
    }
  }
}

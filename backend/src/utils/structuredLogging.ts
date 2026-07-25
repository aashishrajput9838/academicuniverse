import { Logger } from './logger';

export interface ResumeLogMeta {
  processingId?: string;
  organizationId?: string;
  userId?: string;
  stage?: string;
  durationMs?: number;
  [key: string]: any;
}

const PII_FIELDS = ['email', 'phone', 'rawEmail', 'rawPhone', 'primaryEmail', 'primaryPhone'];

export function scrubPII(meta: any): any {
  if (!meta || typeof meta !== 'object') return meta;
  const scrubbed = { ...meta };
  for (const field of PII_FIELDS) {
    if (scrubbed[field]) {
      scrubbed[field] = '[REDACTED]';
    }
  }
  return scrubbed;
}

export function createResumeLogger(service: string): Logger {
  return new Logger(service);
}

export function logStageEntry(logger: Logger, stage: string, meta: ResumeLogMeta = {}): void {
  logger.info(`[${stage}] START`, { stage, status: 'START', ...scrubPII(meta) });
}

export function logStageExit(logger: Logger, stage: string, meta: ResumeLogMeta = {}, durationMs?: number): void {
  logger.info(`[${stage}] SUCCESS`, { stage, status: 'SUCCESS', durationMs, ...scrubPII(meta) });
}

export function logStateTransition(logger: Logger, state: string, meta: ResumeLogMeta = {}): void {
  logger.info(`ResumeParseResult state transition: ${state}`, { state, ...scrubPII(meta) });
}

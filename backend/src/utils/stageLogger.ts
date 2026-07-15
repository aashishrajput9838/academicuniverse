// src/utils/stageLogger.ts
import { createChildLogger } from './logger';

const logger = createChildLogger('stage-logger');

export interface StageLog {
  processingId: string;
  stage: string;
  timestamp: string;
  durationMs?: number;
  status: string;
}

export function logStage(entry: StageLog) {
  const { processingId, stage, timestamp, durationMs, status } = entry;
  const msg = durationMs !== undefined ? `${stage} ${status} - ${durationMs}ms` : `${stage} ${status}`;
  logger.info(msg, { processingId, stage, timestamp, durationMs, status });
}

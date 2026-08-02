import logger from './logger';

export interface MemoryStats {
  rssMb: number;
  heapUsedMb: number;
  heapTotalMb: number;
  externalMb: number;
  arrayBuffersMb: number;
}

/**
 * Capture current process memory usage in Megabytes (MB)
 */
export function getMemoryStats(): MemoryStats {
  const mem = process.memoryUsage();
  const toMb = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100;

  return {
    rssMb: toMb(mem.rss),
    heapUsedMb: toMb(mem.heapUsed),
    heapTotalMb: toMb(mem.heapTotal),
    externalMb: toMb(mem.external),
    arrayBuffersMb: toMb(mem.arrayBuffers || 0),
  };
}

/**
 * Log structured memory checkpoint with stage label and optional delta
 */
export function logMemoryCheckpoint(stage: string, extraContext: Record<string, any> = {}): MemoryStats {
  const stats = getMemoryStats();
  logger.info(`[MEMORY-CHECKPOINT] ${stage}`, {
    stage,
    ...stats,
    ...extraContext,
    timestamp: new Date().toISOString(),
  });
  return stats;
}

/**
 * Calculate memory delta between two checkpoints
 */
export function calculateMemoryDelta(start: MemoryStats, end: MemoryStats): Record<string, number> {
  const round = (num: number) => Math.round(num * 100) / 100;
  return {
    rssDeltaMb: round(end.rssMb - start.rssMb),
    heapUsedDeltaMb: round(end.heapUsedMb - start.heapUsedMb),
    externalDeltaMb: round(end.externalMb - start.externalMb),
    arrayBuffersDeltaMb: round(end.arrayBuffersMb - start.arrayBuffersMb),
  };
}

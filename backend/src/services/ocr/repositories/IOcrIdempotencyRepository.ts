// src/services/ocr/repositories/IOcrIdempotencyRepository.ts
export interface IOcrIdempotencyRepository {
  /** Check if OCR has already been processed for the given processingId. */
  has(processingId: string): Promise<boolean>;
  /** Record that OCR has been processed for the given processingId. */
  record(processingId: string): Promise<void>;
  /** Delete a processingId record (used on failure for retry). */
  delete(processingId: string): Promise<void>;
}

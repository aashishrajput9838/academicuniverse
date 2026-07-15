import { GrowthResponse } from './types/growth';
import {
  GrowthUploadHistory,
  GrowthUploadResponse,
  GrowthProcessingStatus,
} from './types/growthUpload';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

/**
 * Fetch growth data for the logged‑in student.
 * Mirrors the exact request/response contract used in the page component.
 */
export async function fetchGrowthData(backendToken: string): Promise<GrowthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/growth/me`, {
    headers: {
      Authorization: `Bearer ${backendToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('growth-request-failed');
  }

  const payload = await response.json();
  if (!payload?.success || !payload?.data?.metrics) {
    throw new Error('growth-response-invalid');
  }

  // The payload structure matches GrowthResponse exactly
  return payload.data as GrowthResponse;
}

/**
 * Upload an academic document through the UAIP pipeline.
 * Returns the processingId for status polling.
 */
export async function uploadDocument(
  backendToken: string,
  file: File,
): Promise<GrowthUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/growth/documents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${backendToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    const message = errorPayload?.message || `Upload failed with status ${response.status}`;
    throw new Error(message);
  }

  const payload = await response.json();
  if (!payload?.success || !payload?.data?.processingId) {
    throw new Error('upload-response-invalid');
  }

  return payload.data as GrowthUploadResponse;
}

/**
 * Fetch paginated upload history for the authenticated student.
 */
export async function fetchUploadHistory(
  backendToken: string,
  limit?: number,
  cursor?: string,
): Promise<GrowthUploadHistory> {
  const params = new URLSearchParams();
  if (limit !== undefined) params.set('limit', String(limit));
  if (cursor) params.set('cursor', cursor);

  const queryString = params.toString();
  const url = `${API_BASE_URL}/api/growth/uploads${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${backendToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('upload-history-request-failed');
  }

  const payload = await response.json();
  if (!payload?.success || !payload?.data) {
    throw new Error('upload-history-response-invalid');
  }

  return payload.data as GrowthUploadHistory;
}

/**
 * Fetch processing status detail for a single upload.
 */
export async function fetchProcessingStatus(
  backendToken: string,
  processingId: string,
): Promise<GrowthProcessingStatus> {
  const response = await fetch(`${API_BASE_URL}/api/growth/uploads/${encodeURIComponent(processingId)}`, {
    headers: {
      Authorization: `Bearer ${backendToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('processing-status-request-failed');
  }

  const payload = await response.json();
  if (!payload?.success || !payload?.data) {
    throw new Error('processing-status-response-invalid');
  }

  return payload.data as GrowthProcessingStatus;
}


/**
 * reviewApi.ts
 * 
 * Client-side API functions for the Human-in-the-Loop review workflow.
 * All calls hit /api/review/:processingId/* endpoints on the backend.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

async function reviewRequest(
  method: string,
  path: string,
  token: string,
  body?: Record<string, unknown>,
): Promise<{ success: boolean; data: any; message?: string }> {
  const res = await fetch(`${API_BASE_URL}/api/review${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const message = payload?.message || `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  return payload;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface CandidateState {
  processingId: string;
  reviewStatus: 'NOT_READY' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  version: number;
  documentCategory: string;
  candidateFields: Record<string, unknown>;
  extractedEntities: Record<string, unknown>;
  summary?: string;
  primaryTargetModule?: { id: string; name?: string; confidence: number; reason?: string };
  routingDecision?: {
    documentType: string;
    primaryModule: string;
    secondaryModules: string[];
    routingConfidence: number;
    reasoning: string;
  };
  routingStatus?: string;
}

export interface RoutingInfo {
  processingId: string;
  routingDecision: {
    documentType: string;
    primaryModule: string;
    secondaryModules: string[];
    routingConfidence: number;
    reasoning: string;
  };
  routingStatus: string;
  documentCategory: string;
  moduleRegistry: Array<{
    moduleId: string;
    moduleName: string;
    description: string;
    acceptedDocumentCategories: string[];
    canonicalCollection: string;
    priority: number;
  }>;
}

export interface ApproveResult {
  processingId: string;
  status: 'APPROVED';
  canonicalCollection: string;
  canonicalRecordIds: string[];
  affectedModules?: string[];
}

export interface ReviewHistoryEntry {
  _id: string;
  action: 'DRAFT_SAVED' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'ROLLBACK';
  reviewerId: string;
  reviewerRole: string;
  version: number;
  timestamp: string;
  rejectionReason?: string;
  canonicalCollection?: string;
  canonicalRecordIds?: string[];
  candidateFieldsBefore?: Record<string, unknown>;
  candidateFieldsAfter?: Record<string, unknown>;
  canonicalWrites?: any[];
}

// ── API Functions ─────────────────────────────────────────────────────────────

export async function getCandidateState(token: string, processingId: string): Promise<CandidateState> {
  const res = await reviewRequest('GET', `/${encodeURIComponent(processingId)}`, token);
  return res.data as CandidateState;
}

export async function saveDraft(
  token: string,
  processingId: string,
  editedFields: Record<string, unknown>,
): Promise<{ version: number }> {
  const res = await reviewRequest('POST', `/${encodeURIComponent(processingId)}/draft`, token, { editedFields });
  return res.data as { version: number };
}

export async function rejectDocument(
  token: string,
  processingId: string,
  reason: string,
): Promise<void> {
  await reviewRequest('POST', `/${encodeURIComponent(processingId)}/reject`, token, { reason });
}

export async function approveDocument(
  token: string,
  processingId: string,
  editedFields?: Record<string, unknown>,
  routingDecisionOverride?: { primaryModule: string; secondaryModules: string[] },
): Promise<ApproveResult> {
  const body: Record<string, unknown> = {};
  if (editedFields) body.editedFields = editedFields;
  if (routingDecisionOverride) body.routingDecisionOverride = routingDecisionOverride;
  const res = await reviewRequest('POST', `/${encodeURIComponent(processingId)}/approve`, token, body);
  return res.data as ApproveResult;
}

export async function rollbackDocument(
  token: string,
  processingId: string,
): Promise<void> {
  await reviewRequest('POST', `/${encodeURIComponent(processingId)}/rollback`, token);
}

export async function canRollback(
  token: string,
  processingId: string,
): Promise<{ canRollback: boolean; reason?: string }> {
  const res = await reviewRequest('GET', `/${encodeURIComponent(processingId)}/can-rollback`, token);
  return res.data as { canRollback: boolean; reason?: string };
}

/** Soft-delete an eligible document workflow and its non-canonical records. */
export async function softDeleteDocument(
  token: string,
  processingId: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/api/document-intelligence/documents/${encodeURIComponent(processingId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(payload?.message || `Request failed with status ${res.status}`);
  }
}

export interface BulkDeleteResult {
  totalMatched: number;
  successfullyDeleted: number;
  failedCount: number;
  failedProcessingIds: string[];
  deletedProcessingIds: string[];
  durationMs: number;
}

/** Bulk soft-delete all Review Required documents for the authenticated user and organization. */
export async function bulkDeleteReviewRequiredDocuments(
  token: string
): Promise<BulkDeleteResult> {
  const res = await fetch(
    `${API_BASE_URL}/api/document-intelligence/documents/review-required`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(payload?.message || `Request failed with status ${res.status}`);
  }
  return payload.data as BulkDeleteResult;
}

export async function getReviewHistory(
  token: string,
  processingId: string,
): Promise<{ entries: ReviewHistoryEntry[] }> {
  const res = await reviewRequest('GET', `/${encodeURIComponent(processingId)}/history`, token);
  return res.data as { entries: ReviewHistoryEntry[] };
}

export async function getRoutingInfo(
  token: string,
  processingId: string,
): Promise<RoutingInfo> {
  const res = await reviewRequest('GET', `/${encodeURIComponent(processingId)}/routing`, token);
  return res.data as RoutingInfo;
}


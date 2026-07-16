'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useModuleRefresh } from '@/hooks/useModuleRefresh';
import { rollbackDocument, canRollback } from '@/app/dashboard/student/growth/reviewApi';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReviewStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'NOT_READY' | 'ALL';

interface DicDocument {
  processingId: string;
  fileName: string;
  mimeType: string;
  size: number | null;
  uploadStatus: string;
  reviewStatus: ReviewStatus;
  documentCategory: string | null;
  documentSubtype: string | null;
  confidenceScore: number | null;
  parserStrategy: string | null;
  language: string | null;
  isScanned: boolean | null;
  suggestedModule: string | null;
  summary: string | null;
  fileHash: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  durationMs: number | null;
  hasCandidateFields: boolean;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

interface DicAnalytics {
  totalDocuments: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  notReady: number;
  byCategory: Array<{ category: string; count: number }>;
  averageConfidenceScore: number | null;
  recentActivity: Array<{
    processingId: string;
    fileName: string;
    action: string;
    timestamp: string;
  }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5003';

function formatBytes(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function statusColor(status: ReviewStatus | string): string {
  switch (status) {
    case 'APPROVED': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
    case 'PENDING_REVIEW': return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
    case 'REJECTED': return 'text-red-400 bg-red-400/10 border-red-400/30';
    case 'NOT_READY': return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
    default: return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
  }
}

function statusLabel(status: ReviewStatus | string): string {
  switch (status) {
    case 'APPROVED': return '✓ Approved';
    case 'PENDING_REVIEW': return '⏳ Pending Review';
    case 'REJECTED': return '✗ Rejected';
    case 'NOT_READY': return '◌ Not Ready';
    default: return status;
  }
}

function actionIcon(action: string): string {
  switch (action) {
    case 'APPROVED': return '✓';
    case 'REJECTED': return '✗';
    case 'SUBMITTED': return '→';
    case 'DRAFT_SAVED': return '◎';
    case 'ROLLBACK': return '↩';
    default: return '·';
  }
}

function categoryIcon(cat: string | null): string {
  if (!cat) return '📄';
  const c = cat.toUpperCase();
  if (c.includes('TRANSCRIPT')) return '🎓';
  if (c.includes('CERTIFICATE')) return '🏅';
  if (c.includes('MARKSHEET') || c.includes('MARK')) return '📊';
  if (c.includes('SYLLABUS')) return '📚';
  if (c.includes('TIMETABLE') || c.includes('SCHEDULE')) return '🗓️';
  if (c.includes('RESUME') || c.includes('CV')) return '📋';
  if (c.includes('REPORT')) return '📈';
  return '📄';
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color,
  subtitle,
}: {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  subtitle?: string;
}) {
  return (
    <div
      className={`relative bg-slate-800/50 backdrop-blur-sm border rounded-2xl p-5 overflow-hidden group hover:scale-[1.02] transition-all duration-200 ${color}`}
    >
      <div className="absolute -top-6 -right-6 text-5xl opacity-10 group-hover:opacity-20 transition-opacity select-none">
        {icon}
      </div>
      <div className="relative z-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
          {label}
        </p>
        <p className="text-3xl font-bold text-white">{value}</p>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function ConfidenceBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-slate-500 text-xs">—</span>;
  const pct = Math.round(score * 100);
  const color =
    pct >= 80
      ? 'bg-emerald-500'
      : pct >= 50
      ? 'bg-amber-500'
      : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

function DocumentRow({
  doc,
  onSelect,
}: {
  doc: DicDocument;
  onSelect: (d: DicDocument) => void;
}) {
  return (
    <tr
      onClick={() => onSelect(doc)}
      className="group border-b border-slate-700/40 hover:bg-slate-700/30 cursor-pointer transition-colors duration-150"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg select-none">
            {categoryIcon(doc.documentCategory)}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate max-w-[220px] group-hover:text-emerald-300 transition-colors">
              {doc.fileName}
            </p>
            <p className="text-xs text-slate-500">{formatBytes(doc.size)}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor(doc.reviewStatus)}`}
        >
          {statusLabel(doc.reviewStatus)}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-slate-300">
          {doc.documentCategory ?? <span className="text-slate-600">—</span>}
        </span>
      </td>
      <td className="px-4 py-3">
        <ConfidenceBar score={doc.confidenceScore} />
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-slate-400">{formatDate(doc.createdAt)}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(doc);
          }}
          className="text-xs text-emerald-400 hover:text-emerald-300 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
          id={`dic-view-${doc.processingId}`}
        >
          View →
        </button>
      </td>
    </tr>
  );
}

function DetailDrawer({
  doc,
  onClose,
  onDelete,
  onRollback,
  onRefresh,
  onCheckCanRollback,
}: {
  doc: DicDocument | null;
  onClose: () => void;
  onDelete: (document: DicDocument) => Promise<void>;
  onRollback?: (document: DicDocument) => Promise<void>;
  onRefresh?: () => Promise<void> | void;
  onCheckCanRollback?: (processingId: string) => Promise<{ canRollback: boolean; reason?: string }>;
}) {
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showRollbackRequired, setShowRollbackRequired] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [rollingBack, setRollingBack] = useState(false);
  const [rollbackError, setRollbackError] = useState<string | null>(null);
  const [canRollback, setCanRollback] = useState<boolean | null>(null);
  const [rollbackReason, setRollbackReason] = useState<string | null>(null);
  const [checkingRollback, setCheckingRollback] = useState(false);

  useEffect(() => {
    if (!doc) return;
    if (showRollbackRequired && doc.reviewStatus === 'APPROVED' && canRollback === null && !checkingRollback && onCheckCanRollback) {
      setCheckingRollback(true);
      onCheckCanRollback(doc.processingId)
        .then(result => {
          setCanRollback(result.canRollback);
          setRollbackReason(result.reason || null);
        })
        .catch(() => {
          setCanRollback(false);
          setRollbackReason('Failed to check rollback eligibility');
        })
        .finally(() => setCheckingRollback(false));
    }
  }, [showRollbackRequired, doc, canRollback, checkingRollback, onCheckCanRollback, doc?.processingId]);

  if (!doc) return null;

  // DRAFT_SAVED stays PENDING_REVIEW in the existing review-status contract.
  const isApproved = doc.reviewStatus === 'APPROVED';

  const handleDelete = async () => {
    if (deleting) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(doc);
      setShowDeleteConfirmation(false);
      onClose();
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete document');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      {/* Panel */}
      <div
        className="relative w-full max-w-xl bg-slate-900 border-l border-slate-700 h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{categoryIcon(doc.documentCategory)}</span>
            <div>
              <h2 className="text-base font-semibold text-white truncate max-w-xs">
                {doc.fileName}
              </h2>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border mt-0.5 ${statusColor(doc.reviewStatus)}`}
              >
                {statusLabel(doc.reviewStatus)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl leading-none transition-colors"
            id="dic-drawer-close"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Processing ID', value: doc.processingId.slice(0, 12) + '…' },
              { label: 'MIME Type', value: doc.mimeType },
              { label: 'File Size', value: formatBytes(doc.size) },
              { label: 'Language', value: doc.language ?? '—' },
              { label: 'Parser', value: doc.parserStrategy ?? '—' },
              { label: 'Scanned', value: doc.isScanned === null ? '—' : doc.isScanned ? 'Yes' : 'No' },
              { label: 'Upload Status', value: doc.uploadStatus },
              { label: 'Duration', value: formatDuration(doc.durationMs) },
              { label: 'Uploaded', value: formatDate(doc.createdAt) },
              { label: 'Completed', value: formatDate(doc.completedAt) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-800/50 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                <p className="text-sm text-white font-medium break-all">{value}</p>
              </div>
            ))}
          </div>

          {/* Category & Confidence */}
          <div className="bg-slate-800/40 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              AI Classification
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Category</p>
                <p className="text-sm text-white font-semibold">
                  {doc.documentCategory ?? '—'}
                  {doc.documentSubtype ? ` / ${doc.documentSubtype}` : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 mb-1">Confidence</p>
                <ConfidenceBar score={doc.confidenceScore} />
              </div>
            </div>
            {doc.suggestedModule && (
              <div>
                <p className="text-xs text-slate-500">Suggested Module</p>
                <p className="text-sm text-emerald-400 font-medium">{doc.suggestedModule}</p>
              </div>
            )}
          </div>

          {/* AI Summary */}
          {doc.summary && (
            <div className="bg-indigo-950/40 border border-indigo-700/30 rounded-xl p-4">
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-2">
                AI Summary
              </p>
              <p className="text-sm text-slate-300 leading-relaxed">{doc.summary}</p>
            </div>
          )}

          {/* Review info */}
          {(doc.reviewStatus === 'APPROVED' || doc.reviewStatus === 'REJECTED') && (
            <div
              className={`rounded-xl p-4 border ${
                doc.reviewStatus === 'APPROVED'
                  ? 'bg-emerald-950/30 border-emerald-700/30'
                  : 'bg-red-950/30 border-red-700/30'
              }`}
            >
              <p
                className={`text-xs font-semibold uppercase tracking-widest mb-2 ${
                  doc.reviewStatus === 'APPROVED' ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                Review Decision
              </p>
              <p className="text-sm text-slate-300">
                Reviewer: <span className="text-white font-medium">{doc.reviewedBy ?? '—'}</span>
              </p>
              <p className="text-sm text-slate-300">
                At: <span className="text-white font-medium">{formatDate(doc.reviewedAt)}</span>
              </p>
              {doc.rejectionReason && (
                <p className="text-sm text-red-300 mt-2">
                  Reason: <em>{doc.rejectionReason}</em>
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {doc.errorMessage && (
            <div className="bg-red-950/30 border border-red-700/30 rounded-xl p-4">
              <p className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-2">
                Error
              </p>
              <p className="text-sm text-red-300 font-mono break-all">{doc.errorMessage}</p>
            </div>
          )}

          {/* Candidate Fields badge */}
          {doc.hasCandidateFields && (
            <div className="bg-amber-950/30 border border-amber-700/30 rounded-xl p-4">
              <p className="text-amber-400 text-sm font-semibold">
                ⏳ Candidate fields available for review
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Use the Growth Hub Review tab to inspect and approve extracted data.
              </p>
            </div>
          )}

          {/* File hash */}
          {doc.fileHash && (
            <div>
              <p className="text-xs text-slate-600 mb-1">SHA-256 Fingerprint</p>
              <p className="text-xs font-mono text-slate-500 break-all bg-slate-800/40 rounded-lg p-2">
                {doc.fileHash}
              </p>
            </div>
          )}

           <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
             <p className="text-sm font-semibold text-red-200">Delete document</p>
             {isApproved ? (
               <>
                 <p className="mt-1 text-xs leading-relaxed text-slate-400">
                   This document has already produced canonical records. Rollback is required before deletion.
                 </p>
                 <button
                   type="button"
                   id={`dic-delete-${doc.processingId}`}
                   onClick={() => {
                     setDeleteError(null);
                     setShowRollbackRequired(true);
                   }}
                   className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/20"
                 >
                   Rollback required
                 </button>
               </>
             ) : (
               <>
                 <p className="mt-1 text-xs leading-relaxed text-slate-400">
                   Remove this document and its non-canonical workflow records from active views.
                 </p>
                 <button
                   type="button"
                   id={`dic-delete-${doc.processingId}`}
                   onClick={() => {
                     setDeleteError(null);
                     setShowDeleteConfirmation(true);
                   }}
                   className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/20"
                 >
                   Delete document
                 </button>
               </>
             )}
           </div>


        </div>
      </div>
    </div>
    {showDeleteConfirmation && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
          <h3 className="text-base font-semibold text-white">Delete this document?</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            This will remove &quot;{doc.fileName}&quot; from active document workflows. MongoDB documents are retained as soft-deleted records.
          </p>
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs leading-relaxed text-slate-300">
            <p className="font-semibold text-red-200">This soft-deletes:</p>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              <li>the uploaded document record (UaipUpload);</li>
              <li>its AI-extracted KnowledgeRecord; and</li>
              <li>any saved review drafts.</li>
            </ul>
            <p className="mt-2 text-emerald-200">Canonical collections and records will not be changed.</p>
          </div>
          {deleteError && <p className="mt-3 text-xs text-red-300">{deleteError}</p>}
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              disabled={deleting}
              onClick={() => setShowDeleteConfirmation(false)}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete document'}
            </button>
          </div>
        </div>
       </div>
     )}
      {showRollbackRequired && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-white">Rollback required before deletion</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              This document has already produced canonical records. You must rollback the approval before this document can be deleted.
            </p>
            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-relaxed text-slate-300">
              <p className="font-semibold text-amber-200">Why is this required?</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                <li>Canonical collections have been updated from this document.</li>
                <li>Deleting without rollback would leave orphaned canonical records.</li>
                <li>Rollback reverses all canonical writes and restores the document to PENDING_REVIEW.</li>
              </ul>
            </div>
            {rollbackError && <p className="mt-3 text-xs text-red-300">{rollbackError}</p>}
            {checkingRollback ? (
              <div className="mt-5 flex justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              </div>
            ) : canRollback === true ? (
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  disabled={rollingBack}
                  onClick={() => {
                    setShowRollbackRequired(false);
                    setRollbackError(null);
                  }}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={rollingBack}
                  onClick={async () => {
                    if (!doc) return;
                    setRollingBack(true);
                    setRollbackError(null);
                    try {
                      await onRollback?.(doc);
                      setShowRollbackRequired(false);
                      onClose();
                      await onRefresh?.();
                    } catch (err: any) {
                      setRollbackError(err?.message || 'Rollback failed');
                    } finally {
                      setRollingBack(false);
                    }
                  }}
                  className="flex-1 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-50"
                >
                  {rollingBack ? 'Rolling back...' : 'Rollback Document'}
                </button>
              </div>
            ) : (
              <div className="mt-5">
                <p className="text-xs text-slate-400 mb-3">
                  {rollbackReason || 'You can only rollback documents that you uploaded.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowRollbackRequired(false);
                    setRollbackError(null);
                    setCanRollback(null);
                    setRollbackReason(null);
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:text-white"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
     </>
   );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DocumentIntelligencePage() {
  const { user, backendUser, backendToken, loading: authLoading } = useAuth();
  const router = useRouter();

  const [analytics, setAnalytics] = useState<DicAnalytics | null>(null);
  const [documents, setDocuments] = useState<DicDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detail drawer
  const [selectedDoc, setSelectedDoc] = useState<DicDocument | null>(null);

  // Tab
  const [activeTab, setActiveTab] = useState<'documents' | 'analytics'>('documents');

  const fetchToken = useCallback(async () => backendToken, [backendToken]);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const token = await fetchToken();
      const res = await fetch(`${API_BASE}/api/document-intelligence/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load analytics');
      const data = await res.json();
      setAnalytics(data.data ?? data);
    } catch (e: any) {
      console.error('DIC analytics error:', e);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [fetchToken]);

  const loadDocuments = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      setError(null);
      try {
        const token = await fetchToken();
        const params = new URLSearchParams();
        if (statusFilter !== 'ALL') params.set('status', statusFilter);
        if (search) params.set('search', search);
        params.set('limit', '25');
        params.set('sortBy', 'createdAt');
        params.set('sortOrder', 'desc');
        if (cursor) params.set('cursor', cursor);

        const res = await fetch(
          `${API_BASE}/api/document-intelligence/documents?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error('Failed to load documents');
        const data = await res.json();
        const payload = data.data ?? data;

        if (cursor) {
          setDocuments((prev) => [...prev, ...(payload.items ?? [])]);
        } else {
          setDocuments(payload.items ?? []);
        }
        setTotal(payload.total ?? 0);
        setNextCursor(payload.nextCursor ?? null);
      } catch (e: any) {
        setError(e.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    },
    [fetchToken, statusFilter, search]
  );

  const handleDeleteDocument = useCallback(
    async (document: DicDocument) => {
      const token = await fetchToken();
      const res = await fetch(
        `${API_BASE}/api/document-intelligence/documents/${encodeURIComponent(document.processingId)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.message || 'Failed to delete document');
      }

      setDocuments((current) => current.filter((item) => item.processingId !== document.processingId));
      setTotal((current) => Math.max(0, current - 1));
      await loadAnalytics();
    },
    [fetchToken, loadAnalytics]
  );

  const handleRollbackDocument = useCallback(
    async (document: DicDocument) => {
      const token = await fetchToken();
      if (!token) throw new Error('Authentication required');
      await rollbackDocument(token, document.processingId);
    },
    [fetchToken]
  );

  // Auth guard
  useEffect(() => {
    if (!authLoading && (!user || !backendUser)) router.push('/login');
  }, [user, backendUser, authLoading, router]);

  useModuleRefresh(['growth_hub', 'academic_records', 'academic_schedule', 'certificates', 'career_profile', 'resume_builder', 'research_wing', 'github'], () => {
    loadAnalytics();
    loadDocuments();
  });

  // Initial load
  useEffect(() => {
    if (user && backendUser && backendToken) {
      loadAnalytics();
      loadDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, backendUser, backendToken]);

  // Reload on filter change
  useEffect(() => {
    if (user && backendUser && backendToken) loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, search]);

  // Debounced search
  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 400);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-emerald-400" />
      </div>
    );
  }

  if (!user || !backendUser) return null;

  const STATUS_TABS: Array<{ label: string; value: ReviewStatus | 'ALL'; color: string }> = [
    { label: 'All', value: 'ALL', color: 'text-slate-300' },
    { label: 'Pending Review', value: 'PENDING_REVIEW', color: 'text-amber-400' },
    { label: 'Approved', value: 'APPROVED', color: 'text-emerald-400' },
    { label: 'Rejected', value: 'REJECTED', color: 'text-red-400' },
    { label: 'Not Ready', value: 'NOT_READY', color: 'text-slate-500' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <span className="text-xl">🧠</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Document Intelligence Center
              </h1>
              <p className="text-slate-400 text-sm">
                Central management for all ingested documents
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            id="dic-tab-documents"
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === 'documents'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                : 'bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            📋 Documents
          </button>
          <button
            id="dic-tab-analytics"
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === 'analytics'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                : 'bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            📊 Analytics
          </button>
        </div>
      </div>

      {/* ─── Stat cards (always visible) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Documents"
          value={analyticsLoading ? '…' : analytics?.totalDocuments ?? 0}
          icon="🗂️"
          color="border-slate-700"
          subtitle="In this organization"
        />
        <StatCard
          label="Pending Review"
          value={analyticsLoading ? '…' : analytics?.pendingReview ?? 0}
          icon="⏳"
          color="border-amber-500/30"
          subtitle="Awaiting decision"
        />
        <StatCard
          label="Approved"
          value={analyticsLoading ? '…' : analytics?.approved ?? 0}
          icon="✅"
          color="border-emerald-500/30"
          subtitle="Canonical records created"
        />
        <StatCard
          label="Avg. Confidence"
          value={
            analyticsLoading
              ? '…'
              : analytics?.averageConfidenceScore !== null &&
                analytics?.averageConfidenceScore !== undefined
              ? `${Math.round(analytics.averageConfidenceScore * 100)}%`
              : '—'
          }
          icon="🎯"
          color="border-indigo-500/30"
          subtitle="AI classification accuracy"
        />
      </div>

      {/* ─── Documents Tab ─── */}
      {activeTab === 'documents' && (
        <div className="bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-2xl overflow-hidden">
          {/* Toolbar */}
          <div className="px-5 py-4 border-b border-slate-700/50 flex flex-col md:flex-row md:items-center gap-3">
            {/* Status filter pills */}
            <div className="flex flex-wrap gap-1.5">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  id={`dic-filter-${tab.value.toLowerCase()}`}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 ${
                    statusFilter === tab.value
                      ? 'bg-violet-600 text-white'
                      : `bg-slate-800 border border-slate-700 ${tab.color} hover:border-slate-500`
                  }`}
                >
                  {tab.label}
                  {tab.value !== 'ALL' && analytics && (
                    <span className="ml-1 opacity-60">
                      (
                      {tab.value === 'PENDING_REVIEW'
                        ? analytics.pendingReview
                        : tab.value === 'APPROVED'
                        ? analytics.approved
                        : tab.value === 'REJECTED'
                        ? analytics.rejected
                        : analytics.notReady}
                      )
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="ml-auto relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                🔍
              </span>
              <input
                id="dic-search"
                type="text"
                placeholder="Search by filename, category…"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-8 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors w-72"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading && documents.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                  <p className="text-slate-500 text-sm">Loading documents…</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <p className="text-red-400 text-sm font-medium">⚠ {error}</p>
                  <button
                    onClick={() => loadDocuments()}
                    className="mt-3 text-xs text-violet-400 hover:text-violet-300"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <span className="text-5xl opacity-20">🗂️</span>
                <p className="text-slate-500 text-sm">No documents found</p>
                {(statusFilter !== 'ALL' || search) && (
                  <button
                    onClick={() => { setStatusFilter('ALL'); setSearch(''); setSearchInput(''); }}
                    className="text-xs text-violet-400 hover:text-violet-300"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    {['Document', 'Status', 'Category', 'Confidence', 'Uploaded', ''].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <DocumentRow key={doc.processingId} doc={doc} onSelect={setSelectedDoc} />
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination footer */}
          {documents.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-700/50 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Showing <span className="text-slate-300 font-medium">{documents.length}</span> of{' '}
                <span className="text-slate-300 font-medium">{total}</span> documents
              </p>
              {nextCursor && (
                <button
                  id="dic-load-more"
                  onClick={() => loadDocuments(nextCursor)}
                  disabled={loading}
                  className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-sm text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Loading…' : 'Load more'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Analytics Tab ─── */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Category */}
          <div className="bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-4">
              Documents by Category
            </h3>
            {analyticsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 bg-slate-700/40 rounded animate-pulse" />
                ))}
              </div>
            ) : analytics?.byCategory?.length ? (
              <div className="space-y-3">
                {analytics.byCategory.map(({ category, count }) => {
                  const max = analytics.byCategory[0].count;
                  const pct = Math.round((count / max) * 100);
                  return (
                    <div key={category}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300 flex items-center gap-1">
                          {categoryIcon(category)} {category}
                        </span>
                        <span className="text-slate-500">{count}</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-600 text-sm">No category data yet.</p>
            )}
          </div>

          {/* Status breakdown donut-style */}
          <div className="bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-4">
              Review Status Breakdown
            </h3>
            {analyticsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 bg-slate-700/40 rounded animate-pulse" />
                ))}
              </div>
            ) : analytics ? (
              <div className="space-y-3">
                {[
                  { label: 'Approved', count: analytics.approved, color: 'bg-emerald-500', textColor: 'text-emerald-400' },
                  { label: 'Pending Review', count: analytics.pendingReview, color: 'bg-amber-500', textColor: 'text-amber-400' },
                  { label: 'Rejected', count: analytics.rejected, color: 'bg-red-500', textColor: 'text-red-400' },
                  { label: 'Not Ready', count: analytics.notReady, color: 'bg-slate-600', textColor: 'text-slate-400' },
                ].map(({ label, count, color, textColor }) => {
                  const pct =
                    analytics.totalDocuments > 0
                      ? Math.round((count / analytics.totalDocuments) * 100)
                      : 0;
                  return (
                    <div key={label} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
                      <span className="text-slate-400 text-sm flex-1">{label}</span>
                      <span className={`text-sm font-semibold ${textColor}`}>{count}</span>
                      <span className="text-xs text-slate-600 w-10 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-4">
              Recent Review Activity
            </h3>
            {analyticsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-slate-700/40 rounded animate-pulse" />
                ))}
              </div>
            ) : analytics?.recentActivity?.length ? (
              <div className="space-y-2">
                {analytics.recentActivity.map((item, i) => (
                  <div
                    key={`${item.processingId}-${i}`}
                    className="flex items-center gap-4 p-3 rounded-xl bg-slate-900/40 hover:bg-slate-900/60 transition-colors"
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        item.action === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : item.action === 'REJECTED'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {actionIcon(item.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{item.fileName}</p>
                      <p className="text-xs text-slate-500">{item.action}</p>
                    </div>
                    <p className="text-xs text-slate-500 flex-shrink-0">
                      {formatDate(item.timestamp)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-600 text-sm">No review activity yet.</p>
            )}
          </div>
        </div>
      )}

      {/* ─── Detail Drawer ─── */}
      <DetailDrawer
        doc={selectedDoc}
        onClose={() => setSelectedDoc(null)}
        onDelete={handleDeleteDocument}
        onRollback={handleRollbackDocument}
        onRefresh={async () => {
          await loadDocuments();
          await loadAnalytics();
        }}
        onCheckCanRollback={async (processingId) => {
          const token = await fetchToken();
          if (!token) throw new Error('Authentication required');
          return canRollback(token, processingId);
        }}
      />
    </div>
  );
}

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useGrowthUploadStore } from '@/app/dashboard/student/growth/store/growthUploadStore';
import {
  deriveTimelineSteps,
  TERMINAL_STATUSES,
} from '@/app/dashboard/student/growth/types/growthUpload';
import type {
  GrowthUploadHistoryItem,
  GrowthUploadStatus,
  ProcessingTimelineStep,
} from '@/app/dashboard/student/growth/types/growthUpload';

// ── Accepted MIME types (mirrors UAIP UploadService validation) ──
const ACCEPTED_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
]);

const ACCEPT_STRING = [
  '.pdf',
  '.txt',
  '.csv',
  '.xls',
  '.xlsx',
  '.png',
  '.jpg',
  '.jpeg',
].join(',');

// ── Helpers ──

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getStatusColor(status: GrowthUploadStatus): string {
  switch (status) {
    case 'SUCCESS':
      return 'text-emerald-400';
    case 'PROCESSING':
    case 'PENDING':
      return 'text-amber-400';
    case 'FAILED':
    case 'VALIDATION_ERROR':
      return 'text-red-400';
    default:
      return 'text-slate-400';
  }
}

function getStatusBadgeClasses(status: GrowthUploadStatus): string {
  switch (status) {
    case 'SUCCESS':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    case 'PROCESSING':
    case 'PENDING':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
    case 'FAILED':
    case 'VALIDATION_ERROR':
      return 'border-red-500/30 bg-red-500/10 text-red-300';
    default:
      return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
  }
}

function getStatusLabel(status: GrowthUploadStatus): string {
  switch (status) {
    case 'PENDING':
      return 'Queued';
    case 'PROCESSING':
      return 'Processing';
    case 'SUCCESS':
      return 'Completed';
    case 'FAILED':
      return 'Failed';
    case 'VALIDATION_ERROR':
      return 'Invalid';
    default:
      return status;
  }
}

function getMimeLabel(mimeType: string): string {
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('png') || mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'Image';
  if (mimeType.includes('csv')) return 'CSV';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'Excel';
  if (mimeType.includes('text/plain')) return 'Text';
  return 'Document';
}

// ── Sub-components ──

function TimelineStepIcon({ state }: { state: ProcessingTimelineStep['state'] }) {
  switch (state) {
    case 'completed':
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 ring-2 ring-emerald-500/50">
          <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    case 'running':
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 ring-2 ring-amber-500/50">
          <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
        </div>
      );
    case 'failed':
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/20 ring-2 ring-red-500/50">
          <svg className="h-3.5 w-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
    case 'waiting':
    default:
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700/50 ring-2 ring-slate-600/50">
          <div className="h-2 w-2 rounded-full bg-slate-500" />
        </div>
      );
  }
}

function ProcessingTimeline({ steps }: { steps: ProcessingTimelineStep[] }) {
  return (
    <div className="mt-4 space-y-0">
      {steps.map((step, index) => (
        <div key={step.label} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <TimelineStepIcon state={step.state} />
            {index < steps.length - 1 && (
              <div className={`h-6 w-0.5 ${step.state === 'completed' ? 'bg-emerald-500/40' : 'bg-slate-700/50'}`} />
            )}
          </div>
          <div className="flex items-center gap-2 pb-3">
            <span className={`text-sm font-medium ${
              step.state === 'completed' ? 'text-emerald-300' :
              step.state === 'running' ? 'text-amber-300' :
              step.state === 'failed' ? 'text-red-300' :
              'text-slate-500'
            }`}>
              {step.label}
            </span>
            <span className={`text-xs ${
              step.state === 'running' ? 'text-amber-400/70' :
              step.state === 'failed' ? 'text-red-400/70' :
              step.state === 'waiting' ? 'text-slate-600' :
              'hidden'
            }`}>
              {step.state === 'running' && '— Running...'}
              {step.state === 'failed' && '— Failed'}
              {step.state === 'waiting' && '— Waiting...'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function UploadHistoryItem({
  item,
  backendToken,
}: {
  item: GrowthUploadHistoryItem;
  backendToken: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const { processingStatuses, startPolling } = useGrowthUploadStore();
  const status = processingStatuses[item.processingId];
  const isActive = !TERMINAL_STATUSES.has(item.status);

  useEffect(() => {
    if (isActive) {
      startPolling(backendToken, item.processingId);
    }
  }, [isActive, backendToken, item.processingId, startPolling]);

  const errorMessage = status?.errorMessage ?? null;
  const steps = deriveTimelineSteps(item.status, errorMessage);

  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-800/30 p-4 transition-colors hover:border-slate-600/60">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 text-left"
        onClick={() => setExpanded(!expanded)}
        id={`upload-item-${item.processingId}`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate" title={item.fileName}>
              {item.fileName}
            </span>
            <span className="shrink-0 rounded-md bg-slate-700/50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
              {getMimeLabel(item.mimeType)}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${getStatusBadgeClasses(item.status)}`}>
              {getStatusLabel(item.status)}
            </span>
            {item.reviewStatus === 'PENDING_REVIEW' && (
              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-violet-300">
                Pending Review
              </span>
            )}
            <span className="text-xs text-slate-500">
              {formatRelativeTime(item.createdAt)}
            </span>
          </div>
        </div>
        <div className="mt-1 shrink-0">
          <svg
            className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 border-t border-slate-700/40 pt-3">
          <ProcessingTimeline steps={steps} />
          {errorMessage && (
            <div className="mt-2 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">
              {errorMessage}
            </div>
          )}
          {status?.classification && (
            <div className="mt-2 rounded-md border border-slate-700/40 bg-slate-900/30 px-3 py-2">
              <p className="text-xs text-slate-400">
                Classified as{' '}
                <span className="font-medium text-slate-200">
                  {status.classification.documentCategory}
                  {status.classification.documentSubtype ? ` — ${status.classification.documentSubtype}` : ''}
                </span>
                {' '}with{' '}
                <span className="font-medium text-emerald-300">
                  {Math.round(status.classification.confidenceScore * 100)}%
                </span>
                {' '}confidence
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ──

interface GrowthUploadPanelProps {
  backendToken: string;
}

export function GrowthUploadPanel({ backendToken }: GrowthUploadPanelProps) {
  const {
    uploads,
    historyLoading,
    uploading,
    uploadError,
    loadHistory,
    uploadFile,
    stopAllPolling,
  } = useGrowthUploadStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  // Load history on mount
  useEffect(() => {
    loadHistory(backendToken);
    return () => {
      stopAllPolling();
    };
  }, [backendToken, loadHistory, stopAllPolling]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!ACCEPTED_MIME_TYPES.has(file.type)) {
        // The UAIP UploadService will also reject — but fail fast on the client for better UX
        useGrowthUploadStore.setState((state) => {
          state.uploadError = `Unsupported file type: ${file.type || file.name.split('.').pop()}. Accepted: PDF, TXT, CSV, XLS, XLSX, PNG, JPG.`;
        });
        return;
      }
      await uploadFile(backendToken, file);
    },
    [backendToken, uploadFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
      // Reset input so the same file can be re-uploaded
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleFileSelect],
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const hasUploads = uploads.length > 0;

  return (
    <div className="space-y-6">
      {/* ── Build Your Growth Profile / Upload CTA ── */}
      <div
        className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
          isDragging
            ? 'border-emerald-400/60 bg-emerald-500/5'
            : 'border-slate-700/80 bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-emerald-900/20'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Gradient accent */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent pointer-events-none" />

        <div className="relative p-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">
                {hasUploads ? 'Upload Academic Documents' : 'Build Your Growth Profile'}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {hasUploads
                  ? 'Drag & drop or click to upload additional documents.'
                  : 'Upload your academic documents to automatically build your verified profile.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {uploading && (
                <div className="flex items-center gap-2 text-sm text-amber-300">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                  Uploading...
                </div>
              )}
              <button
                type="button"
                id="growth-upload-button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl bg-emerald-500/20 px-5 py-2.5 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-500/40 transition-all hover:bg-emerald-500/30 hover:ring-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {hasUploads ? 'Upload More' : 'Upload Academic Documents'}
              </button>
            </div>
          </div>

          {/* Drag overlay */}
          {isDragging && (
            <div className="mt-4 flex items-center justify-center rounded-xl border-2 border-dashed border-emerald-400/40 bg-emerald-500/5 py-8">
              <div className="flex flex-col items-center gap-2">
                <svg className="h-8 w-8 text-emerald-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-sm font-medium text-emerald-300">Drop your file here</p>
              </div>
            </div>
          )}

          {/* Error display */}
          {uploadError && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-red-300">{uploadError}</p>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_STRING}
          onChange={handleInputChange}
          className="hidden"
          id="growth-file-input"
        />
      </div>

      {/* ── Recent Uploads ── */}
      {(hasUploads || historyLoading) && (
        <div className="rounded-2xl border border-slate-700/80 bg-slate-900/50 backdrop-blur-sm p-6">
          <h3 className="text-lg font-bold text-white mb-4">Recent Uploads</h3>

          {historyLoading && !hasUploads ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="animate-pulse rounded-lg border border-slate-700/40 bg-slate-800/30 p-4">
                  <div className="h-4 w-48 rounded bg-slate-700" />
                  <div className="mt-2 h-3 w-32 rounded bg-slate-700" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {uploads.map((item) => (
                <UploadHistoryItem
                  key={item.processingId}
                  item={item}
                  backendToken={backendToken}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

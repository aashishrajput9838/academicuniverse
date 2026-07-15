'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useGrowthUploadStore } from '@/app/dashboard/student/growth/store/growthUploadStore';
import {
  deriveTimelineSteps,
  formatDocumentCategory,
  formatFileSize,
  formatDuration,
  TERMINAL_STATUSES,
} from '@/app/dashboard/student/growth/types/growthUpload';
import type {
  GrowthUploadHistoryItem,
  GrowthUploadStatus,
  GrowthProcessingStatus,
  ProcessingTimelineStep,
} from '@/app/dashboard/student/growth/types/growthUpload';

// ── Constants ──────────────────────────────────────────────────────────────

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

const ACCEPT_STRING = ['.pdf', '.txt', '.csv', '.xls', '.xlsx', '.png', '.jpg', '.jpeg'].join(',');

// ── Helpers ────────────────────────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatTimestamp(isoString: string): string {
  return new Date(isoString).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getStatusBadge(status: GrowthUploadStatus) {
  switch (status) {
    case 'SUCCESS':    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
    case 'PROCESSING':
    case 'PENDING':    return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
    case 'FAILED':
    case 'VALIDATION_ERROR': return 'border-red-500/40 bg-red-500/10 text-red-300';
    default:           return 'border-slate-600/40 bg-slate-700/20 text-slate-400';
  }
}

function getStatusLabel(status: GrowthUploadStatus): string {
  switch (status) {
    case 'PENDING':          return 'Queued';
    case 'PROCESSING':       return 'Processing';
    case 'SUCCESS':          return 'Completed';
    case 'FAILED':           return 'Failed';
    case 'VALIDATION_ERROR': return 'Invalid';
    default:                 return status;
  }
}

function getMimeLabel(mimeType: string): string {
  if (mimeType.includes('pdf'))         return 'PDF';
  if (mimeType.includes('png') || mimeType.includes('jpeg')) return 'Image';
  if (mimeType.includes('csv'))         return 'CSV';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'Excel';
  if (mimeType.includes('text/plain'))  return 'Text';
  return 'Document';
}

function getCategoryColor(category: string | null): string {
  if (!category) return 'border-slate-600/30 bg-slate-700/20 text-slate-400';
  switch (category) {
    case 'ACADEMIC_TIMETABLE': return 'border-blue-500/30 bg-blue-500/10 text-blue-300';
    case 'MARKSHEET':
    case 'TRANSCRIPT':         return 'border-purple-500/30 bg-purple-500/10 text-purple-300';
    case 'CERTIFICATE':        return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300';
    case 'RESUME':             return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
    case 'RESEARCH_PAPER':     return 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300';
    case 'INTERNSHIP':
    case 'OFFER_LETTER':       return 'border-orange-500/30 bg-orange-500/10 text-orange-300';
    default:                   return 'border-slate-500/30 bg-slate-700/20 text-slate-300';
  }
}

function getCategoryIcon(category: string | null): React.ReactElement {
  const cls = 'h-4 w-4';
  if (category === 'ACADEMIC_TIMETABLE') return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
  if (category === 'MARKSHEET' || category === 'TRANSCRIPT') return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
  if (category === 'CERTIFICATE') return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
    </svg>
  );
  if (category === 'RESUME') return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
  return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

// ── AI Disclaimer Banner ───────────────────────────────────────────────────

function AiDisclaimerBanner() {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 mb-4">
      <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      <div>
        <p className="text-xs font-semibold text-amber-300">AI-Generated — Pending Human Review</p>
        <p className="text-xs text-amber-400/70 mt-0.5">
          The data below was extracted by Gemini AI and has not been verified. Do not treat this as official academic data until approved.
        </p>
      </div>
    </div>
  );
}

// ── Category-Aware Extracted Data Views ────────────────────────────────────

function TimetableView({ candidateFields }: { candidateFields: Record<string, unknown> }) {
  const schedule = (candidateFields.schedule as Array<{
    date: string;
    events: Array<{ timeSlot?: string; courseCode?: string; courseName?: string; room?: string; instructor?: string; type?: string }>;
  }>) ?? [];

  return (
    <div className="space-y-4">
      {schedule.map((day, i) => (
        <div key={i} className="rounded-lg border border-slate-700/40 overflow-hidden">
          <div className="bg-slate-800/60 px-4 py-2.5 flex items-center gap-2">
            <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25" />
            </svg>
            <span className="text-sm font-semibold text-white">{day.date}</span>
            {day.events.length === 0 && (
              <span className="ml-auto text-xs text-slate-500 italic">No classes</span>
            )}
          </div>
          {day.events.length > 0 && (
            <div className="divide-y divide-slate-700/30">
              {day.events.map((ev, j) => (
                <div key={j} className="grid grid-cols-[120px_1fr] gap-3 px-4 py-3 text-sm">
                  {ev.type === 'Holiday' ? (
                    <div className="col-span-2 text-center py-2 text-amber-300/70 italic text-xs">🏖️ Holiday</div>
                  ) : (
                    <>
                      <div>
                        <p className="text-xs font-medium text-slate-400">{ev.timeSlot}</p>
                        <p className="text-[11px] text-slate-600 mt-0.5">{ev.courseCode}</p>
                      </div>
                      <div>
                        <p className="font-medium text-white">{ev.courseName}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-400">📍 {ev.room}</span>
                          <span className="text-xs text-slate-400">👤 {ev.instructor}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MarksheetView({ extractedEntities, candidateFields }: { extractedEntities?: Record<string, unknown>; candidateFields: Record<string, unknown> }) {
  const subjects = (candidateFields.subjects as Array<{
    name?: string; code?: string; marks?: number | string; maxMarks?: number | string; grade?: string; credits?: number | string;
  }>) ?? [];
  const cgpa = extractedEntities?.cgpa as string | undefined;
  const semester = extractedEntities?.semester as string | undefined;

  return (
    <div className="space-y-4">
      {(cgpa || semester) && (
        <div className="flex items-center gap-4 rounded-lg bg-purple-500/5 border border-purple-500/20 px-4 py-3">
          {semester && <div><p className="text-xs text-slate-400">Semester</p><p className="text-sm font-bold text-white">{semester}</p></div>}
          {cgpa && <div className="ml-auto"><p className="text-xs text-slate-400">CGPA</p><p className="text-lg font-bold text-purple-300">{cgpa}</p></div>}
        </div>
      )}
      {subjects.length > 0 ? (
        <div className="rounded-lg border border-slate-700/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/60">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Subject</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Marks</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Grade</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Credits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {subjects.map((sub, i) => (
                <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{sub.name}</p>
                    {sub.code && <p className="text-xs text-slate-500">{sub.code}</p>}
                  </td>
                  <td className="text-center px-3 py-3 text-slate-300">
                    {sub.marks !== undefined ? `${sub.marks}${sub.maxMarks ? `/${sub.maxMarks}` : ''}` : '—'}
                  </td>
                  <td className="text-center px-3 py-3">
                    <span className="rounded-full bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-xs font-semibold text-purple-300">
                      {sub.grade ?? '—'}
                    </span>
                  </td>
                  <td className="text-center px-3 py-3 text-slate-400 text-xs">{sub.credits ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <GenericKeyValueView data={candidateFields} />
      )}
    </div>
  );
}

function CertificateView({ extractedEntities, candidateFields }: { extractedEntities?: Record<string, unknown>; candidateFields: Record<string, unknown> }) {
  const merged = { ...extractedEntities, ...candidateFields };
  const keys = Object.keys(merged).filter((k) => merged[k] !== undefined && merged[k] !== null);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {keys.map((key) => (
        <div key={key} className="rounded-lg border border-slate-700/40 bg-slate-800/20 px-4 py-3">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{key.replace(/_/g, ' ')}</p>
          <p className="text-sm font-medium text-white break-words">
            {typeof merged[key] === 'object' ? JSON.stringify(merged[key]) : String(merged[key])}
          </p>
        </div>
      ))}
    </div>
  );
}

function ResumeView({ candidateFields }: { candidateFields: Record<string, unknown> }) {
  const sections = ['education', 'experience', 'skills', 'projects', 'certifications', 'summary'];
  const available = sections.filter((s) => candidateFields[s]);

  if (available.length === 0) return <GenericKeyValueView data={candidateFields} />;

  return (
    <div className="space-y-5">
      {available.map((section) => {
        const content = candidateFields[section];
        return (
          <div key={section}>
            <h4 className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-2 flex items-center gap-2">
              <div className="h-px flex-1 bg-slate-700/50" />
              {section}
              <div className="h-px flex-1 bg-slate-700/50" />
            </h4>
            {Array.isArray(content) ? (
              <div className="space-y-2">
                {content.map((item: unknown, i: number) => (
                  <div key={i} className="rounded-lg border border-slate-700/40 bg-slate-800/20 px-4 py-3 text-sm text-slate-300">
                    {typeof item === 'object' && item !== null
                      ? Object.entries(item as Record<string, unknown>).map(([k, v]) => (
                        <p key={k}><span className="text-slate-500">{k}: </span>{String(v)}</p>
                      ))
                      : String(item)
                    }
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-300 rounded-lg border border-slate-700/40 bg-slate-800/20 px-4 py-3">
                {String(content)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function GenericKeyValueView({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined);
  return (
    <div className="space-y-2">
      {entries.map(([key, value]) => (
        <div key={key} className="flex gap-3 rounded-lg border border-slate-700/40 bg-slate-800/20 px-4 py-3">
          <span className="min-w-[140px] text-xs font-medium text-slate-400 uppercase tracking-wide pt-0.5">
            {key.replace(/_/g, ' ')}
          </span>
          <span className="text-sm text-white break-words">
            {typeof value === 'object' ? (
              <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap">
                {JSON.stringify(value, null, 2)}
              </pre>
            ) : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Extracted Data Modal ───────────────────────────────────────────────────

function ExtractedDataModal({
  item,
  status,
  onClose,
}: {
  item: GrowthUploadHistoryItem;
  status: GrowthProcessingStatus | undefined;
  onClose: () => void;
}) {
  const classification = status?.classification;
  const candidateFields = (classification?.candidateFields ?? {}) as Record<string, unknown>;
  const extractedEntities = (classification?.extractedEntities ?? {}) as Record<string, unknown>;
  const category = classification?.documentCategory ?? item.documentCategory ?? 'OTHER';

  // Trap focus / close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  function renderContent() {
    if (Object.keys(candidateFields).length === 0 && Object.keys(extractedEntities).length === 0) {
      return (
        <div className="py-12 text-center text-slate-400">
          <svg className="mx-auto h-10 w-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25" />
          </svg>
          <p className="text-sm">No extracted data available yet.</p>
          <p className="text-xs mt-1 text-slate-500">Check back after processing completes.</p>
        </div>
      );
    }

    switch (category) {
      case 'ACADEMIC_TIMETABLE':
        return <TimetableView candidateFields={candidateFields} />;
      case 'MARKSHEET':
      case 'TRANSCRIPT':
        return <MarksheetView extractedEntities={extractedEntities} candidateFields={candidateFields} />;
      case 'CERTIFICATE':
        return <CertificateView extractedEntities={extractedEntities} candidateFields={candidateFields} />;
      case 'RESUME':
        return <ResumeView candidateFields={candidateFields} />;
      default:
        return <GenericKeyValueView data={{ ...extractedEntities, ...candidateFields }} />;
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:pt-16 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700/60 bg-slate-800/60 shrink-0">
          <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 ${getCategoryColor(category)}`}>
            {getCategoryIcon(category)}
            <span className="text-xs font-semibold">{formatDocumentCategory(category)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{item.fileName}</p>
            {classification?.confidenceScore !== undefined && (
              <p className="text-xs text-slate-400">
                AI Confidence: <span className="text-emerald-400 font-medium">{Math.round(classification.confidenceScore * 100)}%</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            id="close-extracted-data-modal"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* AI Summary */}
        {classification?.summary && (
          <div className="px-6 pt-4 shrink-0">
            <div className="rounded-lg border border-slate-700/40 bg-slate-800/30 px-4 py-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">AI Summary</p>
              <p className="text-sm text-slate-200 leading-relaxed">{classification.summary}</p>
              {classification.suggestedModule && classification.suggestedModule !== 'None' && (
                <p className="mt-2 text-xs text-slate-500">
                  Suggested module: <span className="text-emerald-400">{classification.suggestedModule}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="px-6 pt-4 shrink-0">
          <AiDisclaimerBanner />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

// ── Timeline ───────────────────────────────────────────────────────────────

function TimelineStepIcon({ state }: { state: ProcessingTimelineStep['state'] }) {
  switch (state) {
    case 'completed':
      return (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 ring-2 ring-emerald-500/50">
          <svg className="h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    case 'running':
      return (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 ring-2 ring-amber-500/50">
          <div className="h-2 w-2 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
        </div>
      );
    case 'failed':
      return (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 ring-2 ring-red-500/50">
          <svg className="h-3 w-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
    default:
      return (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700/50 ring-1 ring-slate-600/50">
          <div className="h-1.5 w-1.5 rounded-full bg-slate-600" />
        </div>
      );
  }
}

function ProcessingTimeline({ steps }: { steps: ProcessingTimelineStep[] }) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <React.Fragment key={step.label}>
          <div className="flex flex-col items-center gap-1">
            <TimelineStepIcon state={step.state} />
            <span className={`text-[10px] font-medium whitespace-nowrap ${
              step.state === 'completed' ? 'text-emerald-400' :
              step.state === 'running'   ? 'text-amber-400' :
              step.state === 'failed'    ? 'text-red-400' :
              'text-slate-600'
            }`}>{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px w-6 sm:w-10 mb-4 mx-1 ${step.state === 'completed' ? 'bg-emerald-500/40' : 'bg-slate-700/50'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Upload History Item Card ───────────────────────────────────────────────

function UploadHistoryItemCard({
  item,
  backendToken,
  compact = false,
}: {
  item: GrowthUploadHistoryItem;
  backendToken: string;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { processingStatuses, startPolling, fetchStatusDetail } = useGrowthUploadStore();
  const status = processingStatuses[item.processingId];
  const isActive = !TERMINAL_STATUSES.has(item.status);

  useEffect(() => {
    if (isActive) startPolling(backendToken, item.processingId);
  }, [isActive, backendToken, item.processingId, startPolling]);

  // Lazy fetch details on expand or when modal is opened
  useEffect(() => {
    if (expanded || showModal) {
      fetchStatusDetail(backendToken, item.processingId);
    }
  }, [expanded, showModal, backendToken, item.processingId, fetchStatusDetail]);

  const errorMessage = status?.errorMessage ?? item.errorMessage ?? null;
  const steps = deriveTimelineSteps(item.status, errorMessage);
  const hasExtractedData = !!(
    status?.candidateSummary?.available ||
    (item.reviewStatus === 'PENDING_REVIEW' && item.documentCategory)
  );
  const category = status?.classification?.documentCategory ?? item.documentCategory;
  const confidence = status?.classification?.confidenceScore ?? item.confidenceScore;

  const handleViewExtractedData = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowModal(true);
  };

  return (
    <>
      <div
        className={`rounded-xl border transition-all duration-200 ${
          compact
            ? 'border-violet-500/30 bg-violet-500/5 hover:border-violet-400/40'
            : 'border-slate-700/50 bg-slate-800/20 hover:border-slate-600/50'
        }`}
      >
        {/* ── Main Row ── */}
        <button
          type="button"
          className="flex w-full items-start gap-3 p-4 text-left"
          onClick={() => setExpanded(!expanded)}
          id={`upload-card-${item.processingId}`}
        >
          {/* Category Icon */}
          <div className={`mt-0.5 shrink-0 rounded-lg border p-1.5 ${getCategoryColor(category)}`}>
            {getCategoryIcon(category)}
          </div>

          {/* Main Info */}
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-start gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-xs" title={item.fileName}>
                {item.fileName}
              </span>
              <span className="shrink-0 rounded bg-slate-700/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                {getMimeLabel(item.mimeType)}
              </span>
              {item.size !== null && (
                <span className="text-[10px] text-slate-600">{formatFileSize(item.size)}</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Processing status */}
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getStatusBadge(item.status)}`}>
                {getStatusLabel(item.status)}
              </span>
              {/* Review status */}
              {item.reviewStatus === 'PENDING_REVIEW' && (
                <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-300">
                  Pending Review
                </span>
              )}
              {/* Document category */}
              {category && (
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${getCategoryColor(category)}`}>
                  {formatDocumentCategory(category)}
                </span>
              )}
              {/* Confidence */}
              {confidence !== null && confidence !== undefined && (
                <span className="text-[10px] text-slate-500">
                  AI: <span className={`font-semibold ${confidence >= 0.9 ? 'text-emerald-400' : confidence >= 0.7 ? 'text-amber-400' : 'text-red-400'}`}>
                    {Math.round(confidence * 100)}%
                  </span>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
              <span title={formatTimestamp(item.createdAt)}>⏱ {formatRelativeTime(item.createdAt)}</span>
              {item.durationMs !== null && <span>⚡ {formatDuration(item.durationMs)}</span>}
              {item.parserStrategy && <span>📄 {item.parserStrategy.replace('_PARSER', '')}</span>}
            </div>
          </div>

          {/* Expand chevron */}
          <svg
            className={`mt-1 h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* ── Expanded Detail ── */}
        {expanded && (
          <div className="border-t border-slate-700/30 px-4 pb-4 pt-3 space-y-4">
            {/* Timeline */}
            <div className="overflow-x-auto pb-1">
              <ProcessingTimeline steps={steps} />
            </div>

            {/* Error */}
            {errorMessage && (
              <div className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">
                ⚠ {errorMessage}
              </div>
            )}

            {/* Classification detail */}
            {status?.classification && (
              <div className="rounded-lg border border-slate-700/40 bg-slate-900/30 px-4 py-3 text-sm space-y-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Classification Detail</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <span className="text-slate-500">Category</span>
                  <span className="text-white font-medium">{formatDocumentCategory(status.classification.documentCategory)}</span>
                  <span className="text-slate-500">Confidence</span>
                  <span className={`font-medium ${confidence && confidence >= 0.9 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {Math.round((status.classification.confidenceScore) * 100)}%
                  </span>
                  <span className="text-slate-500">Parser</span>
                  <span className="text-slate-300">{status.classification.parserStrategy}</span>
                  <span className="text-slate-500">Language</span>
                  <span className="text-slate-300">{status.classification.language?.toUpperCase()}</span>
                  {status.classification.suggestedModule && (
                    <>
                      <span className="text-slate-500">Module</span>
                      <span className="text-emerald-400">{status.classification.suggestedModule}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Upload timestamp */}
            <p className="text-[10px] text-slate-600">Uploaded: {formatTimestamp(item.createdAt)}</p>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-1">
              {hasExtractedData && (
                <button
                  type="button"
                  id={`view-extracted-${item.processingId}`}
                  onClick={handleViewExtractedData}
                  className="flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/20"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  View Extracted Data
                </button>
              )}
              <button
                type="button"
                id={`download-${item.processingId}`}
                disabled
                title="Download not yet implemented"
                className="flex items-center gap-1.5 rounded-lg border border-slate-600/40 bg-slate-700/20 px-3 py-1.5 text-xs font-semibold text-slate-500 cursor-not-allowed opacity-60"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download Original
              </button>
              <button
                type="button"
                id={`reprocess-${item.processingId}`}
                disabled
                title="Reprocess not yet implemented"
                className="flex items-center gap-1.5 rounded-lg border border-slate-600/40 bg-slate-700/20 px-3 py-1.5 text-xs font-semibold text-slate-500 cursor-not-allowed opacity-60"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Reprocess
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Extracted Data Modal */}
      {showModal && (
        <ExtractedDataModal
          item={item}
          status={status}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

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

  useEffect(() => {
    loadHistory(backendToken);
    return () => { stopAllPolling(); };
  }, [backendToken, loadHistory, stopAllPolling]);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!ACCEPTED_MIME_TYPES.has(file.type)) {
      useGrowthUploadStore.setState((s) => {
        s.uploadError = `Unsupported file type: ${file.type || file.name.split('.').pop()}. Accepted: PDF, TXT, CSV, XLS, XLSX, PNG, JPG.`;
      });
      return;
    }
    await uploadFile(backendToken, file);
  }, [backendToken, uploadFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [handleFileSelect]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current += 1; setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) { dragCounter.current = 0; setIsDragging(false); }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current = 0; setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  // Split into pending-review vs rest, sorted newest first
  const pendingReview = uploads.filter((u) => u.reviewStatus === 'PENDING_REVIEW')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const otherUploads = uploads.filter((u) => u.reviewStatus !== 'PENDING_REVIEW')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const hasUploads = uploads.length > 0;

  return (
    <div className="space-y-6">
      {/* ── Upload CTA ── */}
      <div
        className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
          isDragging
            ? 'border-emerald-400/60 bg-emerald-500/5'
            : 'border-slate-700/70 bg-gradient-to-br from-slate-900/80 via-slate-800/50 to-emerald-900/20'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">
                {hasUploads ? 'Upload Academic Documents' : 'Build Your Growth Profile'}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {hasUploads
                  ? 'Drag & drop or click to upload additional documents. Gemini AI will classify and extract data automatically.'
                  : 'Upload your marksheets, transcripts, certificates, or timetables. AI will classify and extract structured data.'}
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
                {hasUploads ? 'Upload More' : 'Upload Document'}
              </button>
            </div>
          </div>

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

          {uploadError && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-red-300">{uploadError}</p>
            </div>
          )}
        </div>

        <input ref={fileInputRef} type="file" accept={ACCEPT_STRING} onChange={handleInputChange} className="hidden" id="growth-file-input" />
      </div>

      {/* ── Review Required section ── */}
      {pendingReview.length > 0 && (
        <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 backdrop-blur-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20 border border-violet-500/30">
              <svg className="h-4 w-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Review Required</h3>
              <p className="text-xs text-violet-400/70">
                {pendingReview.length} document{pendingReview.length !== 1 ? 's' : ''} awaiting your review — AI has extracted candidate data
              </p>
            </div>
            <span className="ml-auto rounded-full bg-violet-500/20 border border-violet-500/30 px-2.5 py-0.5 text-sm font-bold text-violet-300">
              {pendingReview.length}
            </span>
          </div>
          <div className="space-y-3">
            {pendingReview.map((item) => (
              <UploadHistoryItemCard key={item.processingId} item={item} backendToken={backendToken} compact />
            ))}
          </div>
        </div>
      )}

      {/* ── Upload History ── */}
      {(hasUploads || historyLoading) && (
        <div className="rounded-2xl border border-slate-700/70 bg-slate-900/50 backdrop-blur-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white">Document History</h3>
            {uploads.length > 0 && (
              <span className="text-xs text-slate-500">{uploads.length} document{uploads.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {historyLoading && !hasUploads ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="animate-pulse rounded-xl border border-slate-700/40 bg-slate-800/20 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-slate-700" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-48 rounded bg-slate-700" />
                      <div className="h-3 w-32 rounded bg-slate-700" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : otherUploads.length > 0 ? (
            <div className="space-y-3">
              {otherUploads.map((item) => (
                <UploadHistoryItemCard key={item.processingId} item={item} backendToken={backendToken} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-6">
              {pendingReview.length > 0 ? 'All documents are pending review.' : 'No documents uploaded yet.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

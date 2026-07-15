'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGrowthUploadStore } from '@/app/dashboard/student/growth/store/growthUploadStore';
import {
  getCandidateState,
  saveDraft,
  rejectDocument,
  approveDocument,
  getReviewHistory,
  softDeleteDocument,
} from '@/app/dashboard/student/growth/reviewApi';
import type { CandidateState, ReviewHistoryEntry } from '@/app/dashboard/student/growth/reviewApi';
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

export function getNestedValue(obj: any, path: string): any {
  if (!obj) return undefined;
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current === null || current === undefined || !(key in current)) {
      return undefined;
    }
    current = current[key];
  }
  return current;
}

export function setNestedValue(obj: any, path: string, value: any) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) {
      const nextKey = keys[i + 1];
      current[key] = /^\d+$/.test(nextKey) ? [] : {};
    }
    current = current[key];
  }
  const lastKey = keys[keys.length - 1];
  const originalType = typeof current[lastKey];
  if (originalType === 'number') {
    const parsed = parseFloat(value);
    current[lastKey] = isNaN(parsed) ? value : parsed;
  } else if (originalType === 'boolean') {
    current[lastKey] = value === 'true' || value === true;
  } else {
    current[lastKey] = value;
  }
}


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

// ── Editable Spreadsheet Table ─────────────────────────────────────────────

interface EditableCell {
  path: string;
  header: string;
  aiValue: string;
  isReadOnly?: boolean;
}

function EditableSpreadsheetTable({
  headers,
  rows,
  candidateFields,
  onCellChange,
  onCellUndo,
  onCellReset,
  undoStacks,
}: {
  headers: string[];
  rows: EditableCell[][];
  candidateFields: Record<string, unknown>;
  onCellChange: (path: string, val: string) => void;
  onCellUndo: (path: string) => void;
  onCellReset: (path: string) => void;
  undoStacks: Record<string, string[]>;
}) {
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const getCellValue = (cell: EditableCell) => {
    if (cell.isReadOnly) return cell.aiValue;
    const current = getNestedValue(candidateFields, cell.path);
    return current !== undefined && current !== null ? String(current) : '';
  };

  const getColLetter = (index: number) => String.fromCharCode(65 + index);

  const filteredRows = rows.filter(row =>
    row.some(cell => {
      const val = getCellValue(cell);
      return val.toLowerCase().includes(search.toLowerCase());
    })
  );

  const sortedRows = [...filteredRows];
  if (sortCol !== null) {
    sortedRows.sort((a, b) => {
      const cellA = a[sortCol];
      const cellB = b[sortCol];
      const valA = getCellValue(cellA);
      const valB = getCellValue(cellB);
      const numA = parseFloat(valA);
      const numB = parseFloat(valB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortAsc ? numA - numB : numB - numA;
      }
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
  }

  return (
    <div className="space-y-2 border border-slate-700/50 rounded-xl bg-slate-900/60 p-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-800/40 p-2 rounded-lg border border-slate-700/40">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Search spreadsheet cells..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-700/85 rounded-md py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
          <svg className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="text-[11px] font-mono text-slate-500">
          Showing {sortedRows.length} of {rows.length} rows
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-700/80 rounded-lg max-h-[400px] overflow-y-auto">
        <table className="w-full border-collapse text-xs select-none">
          <thead className="sticky top-0 z-20 bg-slate-800 shadow-md">
            <tr className="divide-x divide-slate-700 border-b border-slate-700">
              <th className="w-10 bg-slate-950 text-slate-600 font-mono text-[10px] text-center select-none py-1 sticky left-0 z-30">
                #
              </th>
              {headers.map((_, i) => (
                <th key={i} className="bg-slate-950/80 text-slate-500 font-mono text-[10px] text-center py-1 select-none">
                  {getColLetter(i)}
                </th>
              ))}
            </tr>
            <tr className="divide-x divide-slate-700 border-b border-slate-700 bg-slate-900">
              <th className="w-10 bg-slate-950 text-slate-600 font-mono text-[10px] text-center select-none py-2 sticky left-0 z-30"></th>
              {headers.map((header, i) => (
                <th
                  key={i}
                  onClick={() => {
                    if (sortCol === i) {
                      setSortAsc(!sortAsc);
                    } else {
                      setSortCol(i);
                      setSortAsc(true);
                    }
                  }}
                  className="px-3 py-2 text-left font-bold text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{header}</span>
                    <span className="text-[9px] text-slate-500">
                      {sortCol === i ? (sortAsc ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800 bg-slate-950/40">
            {sortedRows.map((row, rIdx) => (
              <tr key={rIdx} className="divide-x divide-slate-800 hover:bg-slate-900/30 transition-colors">
                <td className="w-10 text-center font-mono text-[10px] text-slate-600 bg-slate-950 py-1.5 sticky left-0 z-10 border-r border-slate-800">
                  {rIdx + 1}
                </td>
                {row.map((cell, cIdx) => {
                  const currentValue = getCellValue(cell);
                  const isEdited = !cell.isReadOnly && currentValue !== cell.aiValue;
                  const hasUndo = (undoStacks[cell.path]?.length ?? 0) > 0;

                  return (
                    <td key={cIdx} className="p-1 min-w-[120px] align-middle">
                      {cell.isReadOnly ? (
                        <div className="px-2 py-1 text-slate-400 font-medium bg-slate-900/20 rounded">
                          {currentValue || '—'}
                        </div>
                      ) : (
                        <div className="relative group flex items-center w-full">
                          <input
                            type="text"
                            value={currentValue}
                            onChange={(e) => onCellChange(cell.path, e.target.value)}
                            title={isEdited ? `Original AI Value: ${cell.aiValue || '—'}` : undefined}
                            className={`w-full bg-slate-900/80 border text-xs px-2 py-1 rounded outline-none transition-all focus:ring-1 focus:ring-violet-500/25 ${
                              isEdited
                                ? 'border-amber-500/50 bg-amber-500/5 text-amber-200 focus:border-amber-400'
                                : 'border-slate-700/60 text-slate-200 focus:border-violet-500'
                            }`}
                            placeholder="—"
                          />
                          {isEdited && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-950 border border-slate-700 text-[10px] text-slate-300 rounded px-2 py-1 shadow-xl z-50 whitespace-nowrap">
                              Original AI: <span className="text-amber-400 font-semibold">{cell.aiValue || '—'}</span>
                            </div>
                          )}
                          {isEdited && (
                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity bg-slate-950 border border-slate-700 rounded px-1 py-0.5 z-10 shadow-lg">
                              {hasUndo && (
                                <button
                                  type="button"
                                  onClick={() => onCellUndo(cell.path)}
                                  title="Undo last change"
                                  className="text-[10px] text-slate-400 hover:text-amber-300 transition-colors"
                                >
                                  ↩
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onCellReset(cell.path)}
                                title="Reset to AI value"
                                className="text-[10px] text-slate-400 hover:text-violet-300 transition-colors"
                              >
                                ⟳
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Editable Grid Builder ──────────────────────────────────────────────────

function buildEditableGrid(
  category: string,
  candidateFields: Record<string, unknown>,
  originalFields: Record<string, unknown>
): { sheets: { name: string; headers: string[]; rows: EditableCell[][] }[] } {
  // 1. ACADEMIC_TIMETABLE
  if (category === 'ACADEMIC_TIMETABLE') {
    const schedule = (candidateFields.schedule as any[]) ?? [];
    const headers = ['Date', 'Time', 'Course', 'Code', 'Room', 'Instructor'];
    const rows: EditableCell[][] = [];

    schedule.forEach((day: any, dIdx: number) => {
      const dateStr = day.date || '';
      const events = day.events || [];
      events.forEach((ev: any, eIdx: number) => {
        rows.push([
          { path: `schedule.${dIdx}.date`, header: 'Date', aiValue: getNestedValue(originalFields, `schedule.${dIdx}.date`) || '' },
          { path: `schedule.${dIdx}.events.${eIdx}.timeSlot`, header: 'Time', aiValue: getNestedValue(originalFields, `schedule.${dIdx}.events.${eIdx}.timeSlot`) || '' },
          { path: `schedule.${dIdx}.events.${eIdx}.courseName`, header: 'Course', aiValue: getNestedValue(originalFields, `schedule.${dIdx}.events.${eIdx}.courseName`) || '' },
          { path: `schedule.${dIdx}.events.${eIdx}.courseCode`, header: 'Code', aiValue: getNestedValue(originalFields, `schedule.${dIdx}.events.${eIdx}.courseCode`) || '' },
          { path: `schedule.${dIdx}.events.${eIdx}.room`, header: 'Room', aiValue: getNestedValue(originalFields, `schedule.${dIdx}.events.${eIdx}.room`) || '' },
          { path: `schedule.${dIdx}.events.${eIdx}.instructor`, header: 'Instructor', aiValue: getNestedValue(originalFields, `schedule.${dIdx}.events.${eIdx}.instructor`) || '' },
        ]);
      });
    });

    return { sheets: [{ name: 'Timetable', headers, rows }] };
  }

  // 2. TRANSCRIPT or MARKSHEET
  if (category === 'TRANSCRIPT' || category === 'MARKSHEET') {
    const subjects = (candidateFields.subjects as any[]) ?? [];
    const headers = ['Subject', 'Credits', 'Marks', 'Grade'];
    const rows = subjects.map((sub: any, sIdx: number) => [
      { path: `subjects.${sIdx}.name`, header: 'Subject', aiValue: getNestedValue(originalFields, `subjects.${sIdx}.name`) || '' },
      { path: `subjects.${sIdx}.credits`, header: 'Credits', aiValue: String(getNestedValue(originalFields, `subjects.${sIdx}.credits`) ?? '') },
      { path: `subjects.${sIdx}.marks`, header: 'Marks', aiValue: String(getNestedValue(originalFields, `subjects.${sIdx}.marks`) ?? '') },
      { path: `subjects.${sIdx}.grade`, header: 'Grade', aiValue: getNestedValue(originalFields, `subjects.${sIdx}.grade`) || '' },
    ]);

    return { sheets: [{ name: 'Marks', headers, rows }] };
  }

  // 3. CERTIFICATE
  if (category === 'CERTIFICATE') {
    const headers = ['Field', 'Value'];
    const rows = Object.entries(candidateFields)
      .filter(([_, v]) => v !== null && v !== undefined && typeof v !== 'object')
      .map(([k, _]) => [
        { path: `field-name-${k}`, header: 'Field', aiValue: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), isReadOnly: true },
        { path: k, header: 'Value', aiValue: String(getNestedValue(originalFields, k) ?? '') }
      ]);

    return { sheets: [{ name: 'Certificate', headers, rows }] };
  }

  // 4. RESUME
  if (category === 'RESUME') {
    const sheets = [];

    if (candidateFields.education && Array.isArray(candidateFields.education)) {
      sheets.push({
        name: 'Education',
        headers: ['Institution', 'Degree', 'Major', 'Graduation', 'GPA'],
        rows: (candidateFields.education as any[]).map((edu: any, eIdx: number) => [
          { path: `education.${eIdx}.institution`, header: 'Institution', aiValue: getNestedValue(originalFields, `education.${eIdx}.institution`) || '' },
          { path: `education.${eIdx}.degree`, header: 'Degree', aiValue: getNestedValue(originalFields, `education.${eIdx}.degree`) || '' },
          { path: `education.${eIdx}.fieldOfStudy`, header: 'Major', aiValue: getNestedValue(originalFields, `education.${eIdx}.fieldOfStudy`) || '' },
          { path: `education.${eIdx}.graduationDate`, header: 'Graduation', aiValue: getNestedValue(originalFields, `education.${eIdx}.graduationDate`) || '' },
          { path: `education.${eIdx}.gpa`, header: 'GPA', aiValue: String(getNestedValue(originalFields, `education.${eIdx}.gpa`) ?? '') },
        ])
      });
    }

    if (candidateFields.experience && Array.isArray(candidateFields.experience)) {
      sheets.push({
        name: 'Experience',
        headers: ['Company', 'Role', 'Location', 'Start Date', 'End Date', 'Description'],
        rows: (candidateFields.experience as any[]).map((exp: any, eIdx: number) => [
          { path: `experience.${eIdx}.company`, header: 'Company', aiValue: getNestedValue(originalFields, `experience.${eIdx}.company`) || '' },
          { path: `experience.${eIdx}.role`, header: 'Role', aiValue: getNestedValue(originalFields, `experience.${eIdx}.role`) || '' },
          { path: `experience.${eIdx}.location`, header: 'Location', aiValue: getNestedValue(originalFields, `experience.${eIdx}.location`) || '' },
          { path: `experience.${eIdx}.startDate`, header: 'Start Date', aiValue: getNestedValue(originalFields, `experience.${eIdx}.startDate`) || '' },
          { path: `experience.${eIdx}.endDate`, header: 'End Date', aiValue: getNestedValue(originalFields, `experience.${eIdx}.endDate`) || '' },
          { path: `experience.${eIdx}.description`, header: 'Description', aiValue: Array.isArray(getNestedValue(originalFields, `experience.${eIdx}.description`)) ? (getNestedValue(originalFields, `experience.${eIdx}.description`) as string[]).join('; ') : String(getNestedValue(originalFields, `experience.${eIdx}.description`) ?? '') },
        ])
      });
    }

    if (candidateFields.projects && Array.isArray(candidateFields.projects)) {
      sheets.push({
        name: 'Projects',
        headers: ['Project Name', 'Technologies', 'Description', 'Link'],
        rows: (candidateFields.projects as any[]).map((p: any, pIdx: number) => [
          { path: `projects.${pIdx}.name`, header: 'Project Name', aiValue: getNestedValue(originalFields, `projects.${pIdx}.name`) || '' },
          { path: `projects.${pIdx}.technologies`, header: 'Technologies', aiValue: Array.isArray(getNestedValue(originalFields, `projects.${pIdx}.technologies`)) ? (getNestedValue(originalFields, `projects.${pIdx}.technologies`) as string[]).join(', ') : String(getNestedValue(originalFields, `projects.${pIdx}.technologies`) ?? '') },
          { path: `projects.${pIdx}.description`, header: 'Description', aiValue: getNestedValue(originalFields, `projects.${pIdx}.description`) || '' },
          { path: `projects.${pIdx}.link`, header: 'Link', aiValue: getNestedValue(originalFields, `projects.${pIdx}.link`) || '' },
        ])
      });
    }

    if (candidateFields.skills) {
      if (Array.isArray(candidateFields.skills)) {
        sheets.push({
          name: 'Skills',
          headers: ['Skill'],
          rows: (candidateFields.skills as any[]).map((s: any, sIdx: number) => [
            { path: `skills.${sIdx}`, header: 'Skill', aiValue: String(getNestedValue(originalFields, `skills.${sIdx}`) ?? '') }
          ])
        });
      } else if (typeof candidateFields.skills === 'object') {
        sheets.push({
          name: 'Skills',
          headers: ['Category', 'Skills'],
          rows: Object.entries(candidateFields.skills).map(([cat, val]) => [
            { path: `skills-cat-${cat}`, header: 'Category', aiValue: cat, isReadOnly: true },
            { path: `skills.${cat}`, header: 'Skills', aiValue: Array.isArray(getNestedValue(originalFields, `skills.${cat}`)) ? (getNestedValue(originalFields, `skills.${cat}`) as string[]).join(', ') : String(getNestedValue(originalFields, `skills.${cat}`) ?? '') }
          ])
        });
      }
    }

    return { sheets };
  }

  // 5. Fallback/Unknown
  const arrayEntry = Object.entries(candidateFields).find(([_, val]) => Array.isArray(val) && val.length > 0 && typeof val[0] === 'object');
  if (arrayEntry) {
    const [arrayKey, arrayData] = arrayEntry;
    const uniqueKeys = Array.from(new Set((arrayData as any[]).flatMap(obj => Object.keys(obj || {}))));
    const rows = (arrayData as any[]).map((obj: any, rIdx: number) =>
      uniqueKeys.map(k => ({
        path: `${arrayKey}.${rIdx}.${k}`,
        header: k,
        aiValue: String(getNestedValue(originalFields, `${arrayKey}.${rIdx}.${k}`) ?? '')
      }))
    );
    return { sheets: [{ name: arrayKey.replace(/_/g, ' '), headers: uniqueKeys, rows }] };
  }

  const flattenPaths = (obj: any, prefix = '', res: string[] = []) => {
    if (!obj) return res;
    Object.entries(obj).forEach(([key, val]) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        flattenPaths(val, fullKey, res);
      } else {
        res.push(fullKey);
      }
    });
    return res;
  };

  const paths = flattenPaths(candidateFields);
  const rows = paths.map(path => [
    { path: `field-name-${path}`, header: 'Field Path', aiValue: path.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), isReadOnly: true },
    { path, header: 'Value', aiValue: String(getNestedValue(originalFields, path) ?? '') }
  ]);

  return { sheets: [{ name: 'Candidate Data', headers: ['Field Path', 'Value'], rows }] };
}

// ── Spreadsheet Table ───────────────────────────────────────────────────────

function SpreadsheetTable({
  headers,
  rows,
  onCopyCell,
  onCopyRow,
  copiedCell,
  copiedRowIndex,
  tableId,
}: {
  headers: string[];
  rows: string[][];
  onCopyCell: (text: string, rowIdx: number, colIdx: number) => void;
  onCopyRow: (text: string, rowIdx: number) => void;
  copiedCell: { row: number; col: number } | null;
  copiedRowIndex: number | null;
  tableId: string;
}) {
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  // Filter rows based on search
  const filteredRows = rows.filter(row =>
    row.some(val => val.toLowerCase().includes(search.toLowerCase()))
  );

  // Sort rows based on column index
  const sortedRows = [...filteredRows];
  if (sortCol !== null) {
    sortedRows.sort((a, b) => {
      const valA = a[sortCol] || '';
      const valB = b[sortCol] || '';
      const numA = parseFloat(valA);
      const numB = parseFloat(valB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortAsc ? numA - numB : numB - numA;
      }
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
  }

  // Get Excel letter for column: A, B, C, D...
  const getColLetter = (index: number) => {
    return String.fromCharCode(65 + index); // 65 is 'A'
  };

  return (
    <div className="space-y-2 border border-slate-700/50 rounded-xl bg-slate-900/60 p-4">
      {/* Table Actions / Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-800/40 p-2 rounded-lg border border-slate-700/40">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Search spreadsheet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-700/85 rounded-md py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
          <svg className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="text-[11px] font-mono text-slate-500">
          Showing {sortedRows.length} of {rows.length} rows
        </div>
      </div>

      {/* Grid container with sticky header and horizontal scroll */}
      <div className="overflow-x-auto border border-slate-700/80 rounded-lg max-h-[300px] overflow-y-auto">
        <table className="w-full border-collapse text-xs select-none">
          {/* Excel Header Coordinate row: A, B, C, D... */}
          <thead className="sticky top-0 z-20 bg-slate-800 shadow-md">
            <tr className="divide-x divide-slate-700 border-b border-slate-700">
              <th className="w-10 bg-slate-950 text-slate-600 font-mono text-[10px] text-center select-none py-1 sticky left-0 z-30">
                #
              </th>
              {headers.map((_, i) => (
                <th key={i} className="bg-slate-950/80 text-slate-500 font-mono text-[10px] text-center py-1 select-none">
                  {getColLetter(i)}
                </th>
              ))}
            </tr>
            {/* Actual Field Names */}
            <tr className="divide-x divide-slate-700 border-b border-slate-700 bg-slate-900">
              <th className="w-10 bg-slate-950 text-slate-600 font-mono text-[10px] text-center select-none py-2 sticky left-0 z-30">
                
              </th>
              {headers.map((header, i) => (
                <th
                  key={i}
                  onClick={() => {
                    if (sortCol === i) {
                      setSortAsc(!sortAsc);
                    } else {
                      setSortCol(i);
                      setSortAsc(true);
                    }
                  }}
                  className="px-3 py-2 text-left font-bold text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{header}</span>
                    <span className="text-[9px] text-slate-500">
                      {sortCol === i ? (sortAsc ? '▲' : '▼') : '↕'}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {sortedRows.length > 0 ? (
              sortedRows.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="group hover:bg-slate-800/30 divide-x divide-slate-800/60 transition-colors"
                >
                  {/* Left row index column */}
                  <td className="sticky left-0 z-10 bg-slate-950 text-slate-500 font-mono text-[10px] text-center py-2 border-r border-slate-800 w-10 flex-shrink-0 flex items-center justify-center gap-1">
                    <span>{rowIdx + 1}</span>
                    {/* Copy Row Action on Hover */}
                    <button
                      type="button"
                      onClick={() => onCopyRow(row.join(', '), rowIdx)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white transition-opacity p-0.5"
                      title="Copy Row as CSV"
                    >
                      {copiedRowIndex === rowIdx ? (
                        <svg className="h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </td>
                  {/* Row Cells */}
                  {row.map((cellText, colIdx) => (
                    <td
                      key={colIdx}
                      className="px-3 py-2 text-slate-300 font-mono relative group/cell hover:bg-slate-800/60 break-words max-w-[200px]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate" title={cellText}>{cellText}</span>
                        {/* Copy Cell button on hover */}
                        <button
                          type="button"
                          onClick={() => onCopyCell(cellText, rowIdx, colIdx)}
                          className="opacity-0 group-hover/cell:opacity-100 text-slate-500 hover:text-white transition-opacity p-0.5 shrink-0"
                          title="Copy cell value"
                        >
                          {copiedCell?.row === rowIdx && copiedCell?.col === colIdx ? (
                            <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length + 1} className="py-8 text-center text-slate-500 font-mono">
                  No matching rows found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Excel View ─────────────────────────────────────────────────────────────

function ExcelView({
  candidateFields,
  category,
}: {
  candidateFields: Record<string, unknown>;
  category: string;
}) {
  const [copiedCell, setCopiedCell] = useState<{ row: number; col: number } | null>(null);
  const [copiedRowIndex, setCopiedRowIndex] = useState<number | null>(null);

  const handleCopyCell = async (text: string, rowIdx: number, colIdx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCell({ row: rowIdx, col: colIdx });
      setTimeout(() => setCopiedCell(null), 1500);
    } catch { /* ignore */ }
  };

  const handleCopyRow = async (text: string, rowIdx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedRowIndex(rowIdx);
      setTimeout(() => setCopiedRowIndex(null), 1500);
    } catch { /* ignore */ }
  };

  // 1. Timetable View
  if (category === 'ACADEMIC_TIMETABLE') {
    const schedule = (candidateFields.schedule as any[]) ?? [];
    const headers = ['Date', 'Time', 'Course', 'Code', 'Room', 'Instructor'];
    const rows: string[][] = [];

    schedule.forEach((day: any) => {
      const dateStr = day.date || '';
      if (day.events && Array.isArray(day.events)) {
        day.events.forEach((ev: any) => {
          rows.push([
            dateStr,
            ev.timeSlot || '—',
            ev.courseName || (ev.type === 'Holiday' ? '🏖️ Holiday' : '—'),
            ev.courseCode || '—',
            ev.room || '—',
            ev.instructor || '—',
          ]);
        });
      }
    });

    return (
      <div className="space-y-4">
        <SpreadsheetTable
          headers={headers}
          rows={rows}
          onCopyCell={handleCopyCell}
          onCopyRow={handleCopyRow}
          copiedCell={copiedCell}
          copiedRowIndex={copiedRowIndex}
          tableId="timetable"
        />
      </div>
    );
  }

  // 2. Transcript or Marksheet View
  if (category === 'TRANSCRIPT' || category === 'MARKSHEET') {
    const subjects = (candidateFields.subjects as any[]) ?? [];
    const headers = ['Subject', 'Credits', 'Marks', 'Grade'];
    const rows: string[][] = subjects.map((sub: any) => [
      sub.name || (sub.code ? `Subject ${sub.code}` : '—'),
      sub.credits !== undefined ? String(sub.credits) : '—',
      sub.marks !== undefined ? `${sub.marks}${sub.maxMarks ? `/${sub.maxMarks}` : ''}` : '—',
      sub.grade || '—',
    ]);

    return (
      <div className="space-y-4">
        <SpreadsheetTable
          headers={headers}
          rows={rows}
          onCopyCell={handleCopyCell}
          onCopyRow={handleCopyRow}
          copiedCell={copiedCell}
          copiedRowIndex={copiedRowIndex}
          tableId="transcript"
        />
      </div>
    );
  }

  // 3. Certificate View
  if (category === 'CERTIFICATE') {
    const headers = ['Field', 'Value'];
    const rows: string[][] = Object.entries(candidateFields)
      .filter(([_, v]) => v !== null && v !== undefined && typeof v !== 'object')
      .map(([k, v]) => [
        k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        String(v),
      ]);

    return (
      <div className="space-y-4">
        <SpreadsheetTable
          headers={headers}
          rows={rows}
          onCopyCell={handleCopyCell}
          onCopyRow={handleCopyRow}
          copiedCell={copiedCell}
          copiedRowIndex={copiedRowIndex}
          tableId="certificate"
        />
      </div>
    );
  }

  // 4. Resume View
  if (category === 'RESUME') {
    const sections = ['education', 'experience', 'projects', 'skills'];
    const hasAnySection = sections.some(s => candidateFields[s]);

    if (!hasAnySection) {
      return (
        <FallbackExcelView
          candidateFields={candidateFields}
          onCopyCell={handleCopyCell}
          onCopyRow={handleCopyRow}
          copiedCell={copiedCell}
          copiedRowIndex={copiedRowIndex}
        />
      );
    }

    return (
      <div className="space-y-6">
        {!!candidateFields.education && Array.isArray(candidateFields.education) && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-violet-400">Sheet: Education</h4>
            <SpreadsheetTable
              headers={['Institution', 'Degree', 'Major', 'Graduation', 'GPA']}
              rows={(candidateFields.education as any[]).map((edu: any) => [
                edu.institution || edu.school || edu.university || '—',
                edu.degree || '—',
                edu.fieldOfStudy || edu.major || '—',
                edu.graduationDate || edu.date || edu.endDate || '—',
                edu.gpa ? String(edu.gpa) : '—',
              ])}
              onCopyCell={handleCopyCell}
              onCopyRow={handleCopyRow}
              copiedCell={copiedCell}
              copiedRowIndex={copiedRowIndex}
              tableId="education"
            />
          </div>
        )}

        {!!candidateFields.experience && Array.isArray(candidateFields.experience) && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-violet-400">Sheet: Experience</h4>
            <SpreadsheetTable
              headers={['Company', 'Role', 'Location', 'Start Date', 'End Date', 'Description']}
              rows={(candidateFields.experience as any[]).map((exp: any) => [
                exp.company || exp.organization || '—',
                exp.role || exp.title || '—',
                exp.location || '—',
                exp.startDate || '—',
                exp.endDate || '—',
                Array.isArray(exp.description) ? exp.description.join('; ') : String(exp.description || '—'),
              ])}
              onCopyCell={handleCopyCell}
              onCopyRow={handleCopyRow}
              copiedCell={copiedCell}
              copiedRowIndex={copiedRowIndex}
              tableId="experience"
            />
          </div>
        )}

        {!!candidateFields.projects && Array.isArray(candidateFields.projects) && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-violet-400">Sheet: Projects</h4>
            <SpreadsheetTable
              headers={['Project Name', 'Technologies', 'Description', 'Link']}
              rows={(candidateFields.projects as any[]).map((p: any) => [
                p.name || p.title || '—',
                Array.isArray(p.technologies) ? p.technologies.join(', ') : String(p.technologies || '—'),
                p.description || '—',
                p.link || p.url || '—',
              ])}
              onCopyCell={handleCopyCell}
              onCopyRow={handleCopyRow}
              copiedCell={copiedCell}
              copiedRowIndex={copiedRowIndex}
              tableId="projects"
            />
          </div>
        )}

        {!!candidateFields.skills && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-violet-400">Sheet: Skills</h4>
            {Array.isArray(candidateFields.skills) ? (
              <SpreadsheetTable
                headers={['Skill']}
                rows={(candidateFields.skills as any[]).map((s: any) => [String(s)])}
                onCopyCell={handleCopyCell}
                onCopyRow={handleCopyRow}
                copiedCell={copiedCell}
                copiedRowIndex={copiedRowIndex}
                tableId="skills-list"
              />
            ) : typeof candidateFields.skills === 'object' ? (
              <SpreadsheetTable
                headers={['Category', 'Skills']}
                rows={Object.entries(candidateFields.skills as Record<string, unknown>).map(([cat, val]) => [
                  cat,
                  Array.isArray(val) ? val.join(', ') : String(val || '—'),
                ])}
                onCopyCell={handleCopyCell}
                onCopyRow={handleCopyRow}
                copiedCell={copiedCell}
                copiedRowIndex={copiedRowIndex}
                tableId="skills-obj"
              />
            ) : (
              <div className="p-4 border border-slate-700 bg-slate-900/40 rounded-lg text-slate-300 font-mono text-xs">
                {String(candidateFields.skills)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // 5. Fallback for Unknown structures
  return (
    <FallbackExcelView
      candidateFields={candidateFields}
      onCopyCell={handleCopyCell}
      onCopyRow={handleCopyRow}
      copiedCell={copiedCell}
      copiedRowIndex={copiedRowIndex}
    />
  );
}

// Fallback spreadsheet generator: flattens arbitrary JSON into table rows
function FallbackExcelView({
  candidateFields,
  onCopyCell,
  onCopyRow,
  copiedCell,
  copiedRowIndex,
}: {
  candidateFields: Record<string, unknown>;
  onCopyCell: (text: string, rowIdx: number, colIdx: number) => void;
  onCopyRow: (text: string, rowIdx: number) => void;
  copiedCell: { row: number; col: number } | null;
  copiedRowIndex: number | null;
}) {
  // Check if there is an array of objects we can render as a table
  const arrayEntry = Object.entries(candidateFields).find(([_, val]) => Array.isArray(val) && val.length > 0 && typeof val[0] === 'object');
  
  if (arrayEntry) {
    const [arrayKey, arrayData] = arrayEntry;
    const uniqueKeys = Array.from(new Set((arrayData as any[]).flatMap(obj => Object.keys(obj || {}))));
    
    const rows = (arrayData as any[]).map((obj: any) =>
      uniqueKeys.map(k => {
        const val = obj[k];
        return val !== null && val !== undefined ? (typeof val === 'object' ? JSON.stringify(val) : String(val)) : '—';
      })
    );

    return (
      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-violet-400">Sheet: {arrayKey.replace(/_/g, ' ')}</h4>
        <SpreadsheetTable
          headers={uniqueKeys.map(k => k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))}
          rows={rows}
          onCopyCell={onCopyCell}
          onCopyRow={onCopyRow}
          copiedCell={copiedCell}
          copiedRowIndex={copiedRowIndex}
          tableId={`dynamic-${arrayKey}`}
        />
      </div>
    );
  }

  // Fallback to simple flattened key-value table
  const headers = ['Field Path', 'Value'];
  const rows: string[][] = [];

  const flatten = (obj: any, prefix = '') => {
    if (obj === null || obj === undefined) return;
    Object.entries(obj).forEach(([key, val]) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        flatten(val, fullKey);
      } else {
        rows.push([
          fullKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          Array.isArray(val) ? val.join(', ') : String(val),
        ]);
      }
    });
  };

  flatten(candidateFields);

  return (
    <div className="space-y-4">
      <SpreadsheetTable
        headers={headers}
        rows={rows}
        onCopyCell={onCopyCell}
        onCopyRow={onCopyRow}
        copiedCell={copiedCell}
        copiedRowIndex={copiedRowIndex}
        tableId="fallback"
      />
    </div>
  );
}

// ── JSON Viewer ───────────────────────────────────────────────────────────



function JsonViewer({ data }: { data: Record<string, unknown> }) {
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div className="rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="flex items-center justify-between bg-slate-800/80 px-4 py-2.5 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
          </div>
          <span className="text-xs font-mono text-slate-500">candidateFields.json</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-1 rounded-md border border-slate-700/50 bg-slate-700/30 px-2 py-1 text-xs text-slate-400 hover:text-white hover:border-slate-600 transition-colors">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {collapsed
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />}
            </svg>
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
          <button type="button" onClick={handleCopy}
            className="flex items-center gap-1 rounded-md border border-slate-700/50 bg-slate-700/30 px-2 py-1 text-xs text-slate-400 hover:text-white hover:border-slate-600 transition-colors">
            {copied ? (
              <><svg className="h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg><span className="text-emerald-400">Copied!</span></>
            ) : (
              <><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy JSON</>
            )}
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="max-h-72 overflow-y-auto p-4 bg-slate-950/60">
          <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-all">
            {json.split('\n').map((line, i) => {
              const isKey = /^\s+"[^"]+":/.test(line);
              const isNumber = /:\s+[\d.]+/.test(line) && !/:\s+"/.test(line) && !/:\s+\{/.test(line) && !/:\s+\[/.test(line);
              const isBool = /:\s+(true|false|null)[,]?$/.test(line);
              const isString = /:\s+"/.test(line);
              return (
                <span key={i} className="block">
                  {isKey ? (
                    <>
                      <span className="text-slate-500">{line.match(/^\s+/)?.[0] ?? ''}</span>
                      <span className="text-blue-300">{line.match(/"[^"]+"/)?.[0] ?? ''}</span>
                      <span className="text-slate-400">: </span>
                      <span className={isNumber ? 'text-amber-300' : isBool ? 'text-purple-300' : 'text-emerald-300'}>
                        {line.replace(/^\s+"[^"]+"\s*:\s*/, '')}
                      </span>
                    </>
                  ) : (
                    <span className={isNumber ? 'text-amber-300' : isBool ? 'text-purple-300' : isString ? 'text-emerald-300' : 'text-slate-400'}>
                      {line}
                    </span>
                  )}
                </span>
              );
            })}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Entity Section (type-aware key-value grid) ─────────────────────────────

function EntitySection({ entities }: { entities: Record<string, unknown> }) {
  const fieldLabels: Record<string, string> = {
    startDate: 'Start Date', endDate: 'End Date', weekStartDate: 'Week Start',
    weekEndDate: 'Week End', courses: 'Courses', courseCodes: 'Course Codes',
    instructors: 'Instructors', roomNumbers: 'Rooms', timeSlots: 'Time Slots',
    documentType: 'Document Type', subjects: 'Subjects', gpa: 'GPA', cgpa: 'CGPA',
    semester: 'Semester', skills: 'Skills', education: 'Education',
    experience: 'Experience', projects: 'Projects', title: 'Title',
    issuer: 'Issuing Organization', date: 'Issue Date',
  };
  const entries = Object.entries(entities).filter(([, v]) => v !== null && v !== undefined);
  if (entries.length === 0) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-lg border border-slate-700/40 bg-slate-800/20 px-4 py-3 hover:border-slate-600/50 transition-colors">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
            {fieldLabels[key] ?? key.replace(/_/g, ' ')}
          </p>
          {Array.isArray(value) ? (
            <div className="flex flex-wrap gap-1.5">
              {(value as unknown[]).map((item, i) => (
                <span key={i} className="rounded-full border border-slate-700/50 bg-slate-700/30 px-2.5 py-0.5 text-xs text-slate-200">
                  {String(item)}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm font-medium text-white break-words leading-snug">
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; type: ToastType; message: string; }

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-300 ${
            t.type === 'success' ? 'border-emerald-500/40 bg-emerald-900/80 text-emerald-200' :
            t.type === 'error'   ? 'border-red-500/40 bg-red-900/80 text-red-200' :
                                   'border-violet-500/40 bg-violet-900/80 text-violet-200'
          }`}
        >
          {t.type === 'success' ? (
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          ) : t.type === 'error' ? (
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          )}
          {t.message}
          <button type="button" onClick={() => onDismiss(t.id)} className="ml-2 text-current opacity-60 hover:opacity-100">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Confirmation Dialog ──────────────────────────────────────────────────────

function ConfirmDialog({
  open, title, message, confirmLabel, confirmClass, onConfirm, onCancel, children,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  confirmClass?: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white">{title}</h3>
        {message && <p className="text-sm text-slate-400 leading-relaxed">{message}</p>}
        {children}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-700/50 bg-slate-800/50 py-2.5 text-sm font-semibold text-slate-300 hover:text-white transition-colors">
            Cancel
          </button>
          <button type="button" onClick={onConfirm}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition-colors ${
              confirmClass ?? 'bg-violet-600 hover:bg-violet-500'
            }`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Field-level Edit Row ─────────────────────────────────────────────────────

function EditField({
  label, fieldKey, aiValue, value, required, error, edited, onChange, onUndo, onReset,
}: {
  label: string;
  fieldKey: string;
  aiValue: string;
  value: string;
  required?: boolean;
  error?: string;
  edited: boolean;
  onChange: (key: string, val: string) => void;
  onUndo: (key: string) => void;
  onReset: (key: string) => void;
}) {
  return (
    <div className={`rounded-xl border p-3 transition-all duration-200 ${
      edited ? 'border-violet-500/50 bg-violet-500/5' : 'border-slate-700/40 bg-slate-800/20'
    }`}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          {label}
          {required && <span className="text-red-400 text-xs">*</span>}
          {edited && (
            <span className="rounded-full bg-violet-500/20 border border-violet-500/30 px-1.5 py-0.5 text-[9px] font-bold text-violet-300 uppercase">Edited</span>
          )}
        </label>
        {edited && (
          <div className="flex gap-1">
            <button type="button" onClick={() => onUndo(fieldKey)}
              title="Undo last change"
              className="rounded-md px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition-colors">
              ↩ Undo
            </button>
            <button type="button" onClick={() => onReset(fieldKey)}
              title="Reset to AI value"
              className="rounded-md px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-violet-300 hover:bg-violet-500/10 border border-transparent hover:border-violet-500/20 transition-colors">
              ⟳ AI Value
            </button>
          </div>
        )}
      </div>
      {edited && aiValue !== value && (
        <div className="mb-1.5 rounded-md bg-slate-900/60 border border-slate-700/40 px-2.5 py-1.5">
          <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">Original AI</p>
          <p className="text-xs text-slate-400 line-through opacity-70">{aiValue || '—'}</p>
        </div>
      )}
      <input
        type="text"
        id={`field-${fieldKey}`}
        value={value}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        className={`w-full rounded-lg border px-3 py-2 text-sm text-white bg-slate-900/60 outline-none transition-colors focus:ring-1 ${
          error
            ? 'border-red-500/60 focus:border-red-400 focus:ring-red-400/20'
            : edited
            ? 'border-violet-500/40 focus:border-violet-400 focus:ring-violet-400/20'
            : 'border-slate-700/40 focus:border-slate-500 focus:ring-slate-500/20'
        }`}
        placeholder={aiValue || `Enter ${label.toLowerCase()}…`}
      />
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
    </div>
  );
}

// ── Dynamic Review Form (category-aware) ─────────────────────────────────────

type FieldDef = { key: string; label: string; required?: boolean };

function getFieldSchema(category: string): FieldDef[] {
  switch (category) {
    case 'TRANSCRIPT':
    case 'MARKSHEET':
      // Flat fields (not per-subject arrays — those use the array editor below)
      return [
        { key: 'studentName', label: 'Student Name' },
        { key: 'rollNumber', label: 'Roll / Enrollment No.' },
        { key: 'semester', label: 'Semester' },
        { key: 'programme', label: 'Programme' },
        { key: 'cgpa', label: 'CGPA / GPA' },
      ];
    case 'CERTIFICATE':
      return [
        { key: 'title', label: 'Certificate Name', required: true },
        { key: 'issuer', label: 'Issuing Organization', required: true },
        { key: 'issueDate', label: 'Issue Date', required: true },
        { key: 'credentialId', label: 'Credential ID' },
        { key: 'description', label: 'Description' },
      ];
    case 'RESUME':
      return [
        { key: 'fullName', label: 'Full Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'location', label: 'Location' },
        { key: 'summary', label: 'Professional Summary' },
      ];
    case 'ACADEMIC_TIMETABLE':
      return [
        { key: 'academicYear', label: 'Academic Year' },
        { key: 'semester', label: 'Semester' },
        { key: 'branch', label: 'Branch / Department' },
        { key: 'section', label: 'Section' },
      ];
    default:
      return [];
  }
}

// ── Review History Panel ──────────────────────────────────────────────────────

function ReviewHistoryPanel({ entries }: { entries: ReviewHistoryEntry[] }) {
  const actionColors: Record<string, string> = {
    DRAFT_SAVED: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
    SUBMITTED:   'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
    APPROVED:    'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    REJECTED:    'border-red-500/40 bg-red-500/10 text-red-300',
    ROLLBACK:    'border-amber-500/40 bg-amber-500/10 text-amber-300',
  };

  if (entries.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-slate-500">No review history yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((e) => (
        <div key={e._id} className="rounded-xl border border-slate-700/40 bg-slate-800/20 p-3 space-y-1">
          <div className="flex items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              actionColors[e.action] ?? 'border-slate-700/40 bg-slate-700/20 text-slate-400'
            }`}>
              {e.action.replace('_', ' ')}
            </span>
            <span className="text-[11px] text-slate-500">v{e.version}</span>
            <span className="ml-auto text-[10px] text-slate-600">
              {new Date(e.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>By: <span className="text-slate-300 font-mono text-[10px]">{e.reviewerId.slice(0, 12)}…</span></span>
            <span>·</span>
            <span>{e.reviewerRole}</span>
          </div>
          {e.rejectionReason && (
            <p className="text-xs text-red-300 italic mt-1">Reason: {e.rejectionReason}</p>
          )}
          {e.canonicalCollection && e.canonicalCollection !== 'NONE' && (
            <p className="text-[11px] text-emerald-400">→ Written to <span className="font-mono">{e.canonicalCollection}</span> ({e.canonicalRecordIds?.length ?? 0} record{(e.canonicalRecordIds?.length ?? 0) !== 1 ? 's' : ''})</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Review Tab ─────────────────────────────────────────────────────────────────

function ReviewTab({
  processingId,
  backendToken,
  initialCandidateFields,
  category,
  onApproved,
  onRejected,
}: {
  processingId: string;
  backendToken: string;
  initialCandidateFields: Record<string, unknown>;
  category: string;
  onApproved: () => void;
  onRejected: () => void;
}) {
  // ── State ──
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [historyEntries, setHistoryEntries] = useState<ReviewHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<string>('');

  // Editable candidateFields and originalFields states
  const [candidateFields, setCandidateFields] = useState<Record<string, any>>(() => {
    return JSON.parse(JSON.stringify(initialCandidateFields));
  });
  const [originalFields, setOriginalFields] = useState<Record<string, any>>(() => {
    return JSON.parse(JSON.stringify(initialCandidateFields));
  });

  const [undoStacks, setUndoStacks] = useState<Record<string, string[]>>({});

  // Dialogs
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showApproveDialog, setShowApproveDialog] = useState(false);

  const toastIdRef = useRef(0);

  // ── Toast helpers ──
  const addToast = (type: ToastType, message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };
  const dismissToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // ── Load status + history ──
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const state = await getCandidateState(backendToken, processingId);
        if (!cancelled) {
          setReviewStatus(state.reviewStatus);
          if (state.candidateFields) {
            setCandidateFields(JSON.parse(JSON.stringify(state.candidateFields)));
            setOriginalFields(JSON.parse(JSON.stringify(state.candidateFields)));
          }
        }
      } catch { /* silent */ }
    }
    load();
    return () => { cancelled = true; };
  }, [processingId, backendToken]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const h = await getReviewHistory(backendToken, processingId);
      setHistoryEntries(h.entries);
    } catch {
      addToast('error', 'Failed to load review history');
    } finally {
      setHistoryLoading(false);
    }
  };

  // ── Cell edit handlers ──
  const handleCellChange = (path: string, val: string) => {
    const currentVal = getNestedValue(candidateFields, path);
    setUndoStacks((prev) => ({
      ...prev,
      [path]: [...(prev[path] ?? []), currentVal !== undefined && currentVal !== null ? String(currentVal) : ''],
    }));

    setCandidateFields((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      setNestedValue(next, path, val);
      return next;
    });
  };

  const handleCellUndo = (path: string) => {
    const stack = undoStacks[path] ?? [];
    if (stack.length === 0) return;
    const prevVal = stack[stack.length - 1];
    setUndoStacks((prev) => ({
      ...prev,
      [path]: stack.slice(0, -1),
    }));
    setCandidateFields((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      setNestedValue(next, path, prevVal);
      return next;
    });
  };

  const handleCellReset = (path: string) => {
    const aiVal = getNestedValue(originalFields, path);
    setUndoStacks((prev) => ({
      ...prev,
      [path]: [],
    }));
    setCandidateFields((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      setNestedValue(next, path, aiVal);
      return next;
    });
  };

  const hasEdits = JSON.stringify(candidateFields) !== JSON.stringify(originalFields);

  // ── Actions ──
  const handleSaveDraft = async () => {
    setLoading(true);
    try {
      const result = await saveDraft(backendToken, processingId, candidateFields);
      setOriginalFields(JSON.parse(JSON.stringify(candidateFields)));
      setUndoStacks({}); // clear undo history
      addToast('success', `Draft saved successfully (v${result.version})`);
    } catch (err: any) {
      addToast('error', err.message ?? 'Failed to save draft');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) return;
    setShowRejectDialog(false);
    setLoading(true);
    try {
      await rejectDocument(backendToken, processingId, rejectReason.trim());
      setReviewStatus('REJECTED');
      addToast('success', 'Document rejected');
      setTimeout(() => onRejected(), 1200);
    } catch (err: any) {
      addToast('error', err.message ?? 'Failed to reject document');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveConfirm = async () => {
    setShowApproveDialog(false);
    setLoading(true);
    try {
      const result = await approveDocument(backendToken, processingId, candidateFields);
      setReviewStatus('APPROVED');
      addToast('success', `✓ Approved! Written to ${result.canonicalCollection} (${result.canonicalRecordIds?.length ?? 0} records)`);
      setTimeout(() => onApproved(), 1500);
    } catch (err: any) {
      addToast('error', err.message ?? 'Approval failed');
    } finally {
      setLoading(false);
    }
  };

  const isApproved = reviewStatus === 'APPROVED';
  const isRejected = reviewStatus === 'REJECTED';
  const isTerminal = isApproved || isRejected;

  // Build grid data dynamically based on category
  const { sheets } = buildEditableGrid(category, candidateFields, originalFields);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const currentSheet = sheets?.[activeSheetIdx] || sheets?.[0];

  return (
    <div className="flex flex-col h-full">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Reject dialog */}
      <ConfirmDialog
        open={showRejectDialog}
        title="Reject Document"
        message="Please provide a reason for rejection. This will be recorded in the audit log."
        confirmLabel="Reject"
        confirmClass="bg-red-600 hover:bg-red-500"
        onConfirm={handleRejectConfirm}
        onCancel={() => setShowRejectDialog(false)}
      >
        <textarea
          autoFocus
          rows={3}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="e.g. Subject codes are incorrect, please re-upload the original document."
          className="w-full rounded-xl border border-slate-700/50 bg-slate-800/60 px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-red-400/60 focus:ring-1 focus:ring-red-400/20 resize-none"
        />
      </ConfirmDialog>

      {/* Approve dialog */}
      <ConfirmDialog
        open={showApproveDialog}
        title="Approve & Write to Canonical Collections"
        message="This will permanently commit the reviewed data to the canonical database and trigger a Growth Hub refresh. This action cannot be undone without admin rollback."
        confirmLabel="Approve"
        confirmClass="bg-emerald-600 hover:bg-emerald-500"
        onConfirm={handleApproveConfirm}
        onCancel={() => setShowApproveDialog(false)}
      />

      {/* Terminal state banners */}
      {isApproved && (
        <div className="mx-6 mt-4 flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
          <svg className="h-5 w-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div>
            <p className="text-sm font-bold text-emerald-300">Document Approved</p>
            <p className="text-xs text-emerald-400/70">Canonical records have been written. Growth Hub will refresh automatically.</p>
          </div>
        </div>
      )}
      {isRejected && (
        <div className="mx-6 mt-4 flex items-center gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3">
          <svg className="h-5 w-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div>
            <p className="text-sm font-bold text-red-300">Document Rejected</p>
            <p className="text-xs text-red-400/70">No data was written to canonical collections.</p>
          </div>
        </div>
      )}

      {/* Main editable spreadsheet area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {!isTerminal && (
          <div className="space-y-4">
            {/* Multi-sheet Tabs if applicable */}
            {sheets && sheets.length > 1 && (
              <div className="flex flex-wrap gap-1 bg-slate-800/40 p-1 rounded-lg border border-slate-700/40 w-fit">
                {sheets.map((sheet, idx) => (
                  <button
                    key={sheet.name}
                    type="button"
                    onClick={() => setActiveSheetIdx(idx)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      activeSheetIdx === idx
                        ? 'bg-violet-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {sheet.name}
                  </button>
                ))}
              </div>
            )}

            {/* Editable Spreadsheet Table */}
            {currentSheet ? (
              <EditableSpreadsheetTable
                headers={currentSheet.headers}
                rows={currentSheet.rows}
                candidateFields={candidateFields}
                onCellChange={handleCellChange}
                onCellUndo={handleCellUndo}
                onCellReset={handleCellReset}
                undoStacks={undoStacks}
              />
            ) : (
              <div className="rounded-xl border border-slate-700/45 bg-slate-800/20 p-8 text-center text-slate-500">
                <p className="text-sm font-mono">candidateFields: {'{}'}</p>
                <p className="text-xs mt-1 text-slate-650">No candidate fields available to edit in spreadsheet view.</p>
              </div>
            )}
          </div>
        )}

        {/* Review History */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => { setShowHistory((v) => !v); if (!showHistory) loadHistory(); }}
            className="w-full flex items-center justify-between rounded-xl border border-slate-700/40 bg-slate-800/20 px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
          >
            <span>Review History</span>
            <svg className={`h-4 w-4 transition-transform ${showHistory ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </button>
          {showHistory && (
            <div className="mt-2">
              {historyLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                </div>
              ) : (
                <ReviewHistoryPanel entries={historyEntries} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      {!isTerminal && (
        <div className="shrink-0 border-t border-slate-700/40 bg-slate-900/90 px-6 py-3">
          {hasEdits && (
            <p className="text-[11px] text-amber-400/70 mb-2 flex items-center gap-1">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
              You have unsaved changes
            </p>
          )}
          <div className="flex gap-2">
            {/* Save Draft */}
            <button
              type="button"
              id={`review-draft-${processingId}`}
              onClick={handleSaveDraft}
              disabled={loading || !hasEdits}
              className="flex items-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" /> : (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2m12 0V8m0 8l-5 5m0 0l-5-5" /></svg>
              )}
              Save Draft
            </button>

            {/* Reject */}
            <button
              type="button"
              id={`review-reject-${processingId}`}
              onClick={() => setShowRejectDialog(true)}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              Reject
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Approve */}
            <button
              type="button"
              id={`review-approve-${processingId}`}
              onClick={() => setShowApproveDialog(true)}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" /> : (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              )}
              Approve
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// ── Extracted Data Modal ───────────────────────────────────────────────────

function ExtractedDataModal({
  item,
  status,
  backendToken,
  onClose,
  onReviewComplete,
}: {
  item: GrowthUploadHistoryItem;
  status: GrowthProcessingStatus | undefined;
  backendToken: string;
  onClose: () => void;
  onReviewComplete?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'summary' | 'metadata' | 'entities' | 'excel' | 'raw' | 'review'>('summary');
  const classification = status?.classification;
  const candidateFields = (classification?.candidateFields ?? {}) as Record<string, unknown>;
  const extractedEntities = (classification?.extractedEntities ?? {}) as Record<string, unknown>;
  const category = classification?.documentCategory ?? item.documentCategory ?? 'OTHER';
  const primaryModule = classification?.primaryTargetModule;
  const secondaryModules = classification?.secondaryTargetModules ?? [];
  const hasData = Object.keys(candidateFields).length > 0 || Object.keys(extractedEntities).length > 0;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Lock body scroll while modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const tabs: { id: 'summary' | 'metadata' | 'entities' | 'excel' | 'raw' | 'review'; label: string }[] = [
    { id: 'summary',  label: '✦ AI Summary' },
    { id: 'metadata', label: '⊡ Metadata' },
    { id: 'entities', label: '≡ Entities' },
    { id: 'excel',    label: '田 Excel' },
    { id: 'raw',      label: '</> Raw Data' },
    { id: 'review',   label: '✎ Review' },
  ];

  const metadataRows: { label: string; value: React.ReactNode }[] = [
    { label: 'Category', value: (
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getCategoryColor(category)}`}>
        {getCategoryIcon(category)}{formatDocumentCategory(category)}
      </span>
    )},
    { label: 'AI Confidence', value: (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-slate-700/50 max-w-[120px]">
          <div className="h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
            style={{ width: `${Math.round((classification?.confidenceScore ?? 0) * 100)}%` }} />
        </div>
        <span className="text-sm font-bold text-emerald-400">{Math.round((classification?.confidenceScore ?? 0) * 100)}%</span>
      </div>
    )},
    { label: 'Parser Strategy', value: <span className="font-mono text-xs text-cyan-300">{classification?.parserStrategy ?? '—'}</span> },
    { label: 'Language',       value: <span className="uppercase text-xs font-semibold text-white">{classification?.language ?? '—'}</span> },
    { label: 'Review Status',  value: (
      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
        {item.reviewStatus ?? '—'}
      </span>
    )},
    { label: 'Upload Time',    value: <span className="text-sm text-slate-300">{formatTimestamp(item.createdAt)}</span> },
    ...(item.durationMs != null ? [{ label: 'Processing Time', value: <span className="text-sm text-slate-300">{formatDuration(item.durationMs)}</span> }] : []),
    { label: 'AI Target Module', value: primaryModule ? (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-300">
            {primaryModule.name ?? primaryModule.id}
          </span>
          <span className="text-xs text-emerald-400 font-semibold">{Math.round(primaryModule.confidence * 100)}%</span>
        </div>
        {primaryModule.reason && <p className="text-xs text-slate-500 italic">{primaryModule.reason}</p>}
        {secondaryModules.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {secondaryModules.map((m) => (
              <span key={m.id} className="rounded-full border border-slate-700/40 bg-slate-700/20 px-2 py-0.5 text-[11px] text-slate-400">
                {m.name ?? m.id} · {Math.round(m.confidence * 100)}%
              </span>
            ))}
          </div>
        )}
      </div>
    ) : <span className="text-slate-500 text-sm">Not determined</span> },
  ];

  return createPortal(
    <>
      {/* Backdrop — z-9000 */}
      <div
        className="fixed inset-0 z-[9000] bg-black/75 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Modal Container — z-9001, fixed + centered via translate */}
      <div className="fixed z-[9001] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-3xl max-h-[80vh] flex flex-col rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700/60 bg-gradient-to-r from-slate-800/80 to-slate-900/80 shrink-0">
          <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 shrink-0 ${getCategoryColor(category)}`}>
            {getCategoryIcon(category)}
            <span className="text-xs font-bold">{formatDocumentCategory(category)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{item.fileName}</p>
            <p className="text-xs text-slate-500">Document Intelligence Review</p>
          </div>
          <span className={`hidden sm:flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] shrink-0 ${
            activeTab === 'review'
              ? 'border-violet-500/40 bg-violet-500/10 text-violet-300'
              : 'border-slate-700/50 bg-slate-800/60 text-slate-500'
          }`}>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {activeTab === 'review'
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              }
            </svg>
            {activeTab === 'review' ? 'Edit Mode' : 'Read-only'}
          </span>
          <button type="button" onClick={onClose} id="close-extracted-data-modal"
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors shrink-0">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── AI Disclaimer ── */}
        <div className="px-6 pt-4 shrink-0">
          <AiDisclaimerBanner />
        </div>

        {/* ── Tab Bar ── */}
        <div className="px-6 shrink-0 border-b border-slate-700/40">
          <div className="flex gap-0.5 -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                id={`modal-tab-${tab.id}`}
                className={`whitespace-nowrap px-3 py-2.5 text-xs font-semibold border-b-2 transition-all duration-150 ${
                  activeTab === tab.id
                    ? tab.id === 'review'
                      ? 'border-emerald-500 text-emerald-300'
                      : 'border-violet-500 text-violet-300'
                    : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab Content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Tab 1: AI Summary */}
          {activeTab === 'summary' && (
            <div className="px-6 py-5 space-y-4">
              {classification?.summary ? (
                <>
                  <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/15 border border-violet-500/20">
                        <svg className="h-4 w-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347A3.75 3.75 0 0113.5 21h-3a3.75 3.75 0 01-2.652-1.098l-.347-.347z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-2">Gemini AI Summary</p>
                        <p className="text-sm text-slate-200 leading-relaxed">{classification.summary}</p>
                      </div>
                    </div>
                  </div>
                  {primaryModule && (
                    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-3">AI Suggested Destination</p>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/20 shrink-0">
                          <svg className="h-5 w-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-base font-bold text-white">{primaryModule.name ?? primaryModule.id}</p>
                          {primaryModule.reason && <p className="text-xs text-slate-400 mt-0.5">{primaryModule.reason}</p>}
                        </div>
                        <span className="text-xl font-black text-emerald-400">{Math.round(primaryModule.confidence * 100)}%</span>
                      </div>
                      {secondaryModules.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-violet-500/10">
                          <p className="text-[11px] text-slate-500 uppercase tracking-wide mb-2">Also relevant to</p>
                          <div className="flex flex-wrap gap-2">
                            {secondaryModules.map((m) => (
                              <span key={m.id} className="flex items-center gap-1.5 rounded-lg border border-slate-700/40 bg-slate-800/40 px-2.5 py-1 text-xs text-slate-300">
                                {m.name ?? m.id}
                                <span className="text-slate-500">·</span>
                                <span className="text-emerald-400/80">{Math.round(m.confidence * 100)}%</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="py-12 text-center text-slate-500">
                  <p className="text-sm">No AI summary available yet.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Document Metadata */}
          {activeTab === 'metadata' && (
            <div className="px-6 py-5">
              <div className="rounded-xl border border-slate-700/50 overflow-hidden divide-y divide-slate-700/40">
                {metadataRows.map(({ label, value }) => (
                  <div key={label} className="flex items-start gap-4 px-5 py-3.5 hover:bg-slate-800/20 transition-colors">
                    <span className="min-w-[148px] text-xs font-semibold text-slate-500 uppercase tracking-wide pt-0.5 shrink-0">
                      {label}
                    </span>
                    <div className="flex-1">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Extracted Entities */}
          {activeTab === 'entities' && (
            <div className="px-6 py-5 space-y-5">
              {hasData ? (
                <>
                  {Object.keys(candidateFields).length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                        <span className="h-px flex-1 bg-slate-700/50" />Structured Candidate Data<span className="h-px flex-1 bg-slate-700/50" />
                      </p>
                      {(() => {
                        switch (category) {
                          case 'ACADEMIC_TIMETABLE': return <TimetableView candidateFields={candidateFields} />;
                          case 'MARKSHEET':
                          case 'TRANSCRIPT': return <MarksheetView extractedEntities={extractedEntities} candidateFields={candidateFields} />;
                          case 'CERTIFICATE': return <CertificateView extractedEntities={extractedEntities} candidateFields={candidateFields} />;
                          case 'RESUME': return <ResumeView candidateFields={candidateFields} />;
                          default: return <GenericKeyValueView data={candidateFields} />;
                        }
                      })()}
                    </div>
                  )}
                  {Object.keys(extractedEntities).length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                        <span className="h-px flex-1 bg-slate-700/50" />AI-Extracted Entities<span className="h-px flex-1 bg-slate-700/50" />
                      </p>
                      <EntitySection entities={extractedEntities} />
                    </div>
                  )}
                </>
              ) : (
                <div className="py-12 text-center text-slate-500">
                  <svg className="mx-auto h-10 w-10 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25" />
                  </svg>
                  <p className="text-sm">No extracted data available yet.</p>
                  <p className="text-xs mt-1 text-slate-600">Check back after processing completes.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Excel Spreadsheet View */}
          {activeTab === 'excel' && (
            <div className="px-6 py-5 space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                Spreadsheet visualization of the extracted candidate fields for user-friendly review.
              </p>
              {Object.keys(candidateFields).length > 0 ? (
                <ExcelView candidateFields={candidateFields} category={category} />
              ) : (
                <div className="rounded-xl border border-slate-700/50 bg-slate-800/20 p-8 text-center text-slate-500">
                  <p className="text-sm font-mono">candidateFields: {'{}'}</p>
                  <p className="text-xs mt-1 text-slate-600">No candidate fields available to display in spreadsheet view.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 5: Raw Candidate Data */}
          {activeTab === 'raw' && (
            <div className="px-6 py-5 space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                Exact contents of <span className="font-mono text-violet-400">KnowledgeRecord.candidateFields</span> as stored in MongoDB — no filtering or transformation.
              </p>
              {Object.keys(candidateFields).length > 0 ? (
                <JsonViewer data={candidateFields} />
              ) : (
                <div className="rounded-xl border border-slate-700/50 bg-slate-800/20 p-8 text-center text-slate-500">
                  <p className="text-sm font-mono">candidateFields: {'{}'}</p>
                  <p className="text-xs mt-1 text-slate-600">The AI may not have structured this document type yet.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 6: Human-in-the-Loop Review */}
          {activeTab === 'review' && (
            <ReviewTab
              processingId={item.processingId}
              backendToken={backendToken}
              initialCandidateFields={candidateFields}
              category={category}
              onApproved={() => { onReviewComplete?.(); onClose(); }}
              onRejected={() => { onReviewComplete?.(); onClose(); }}
            />
          )}
        </div>

        {/* ── Footer (hidden on Review tab — it has its own action bar) ── */}
        {activeTab !== 'review' && (
          <div className="shrink-0 flex items-center justify-between border-t border-slate-700/40 bg-slate-900/80 px-6 py-3">
            <p className="text-[11px] text-slate-600 font-mono truncate">
              {item.processingId.slice(0, 20)}…
            </p>
            <button type="button" onClick={onClose}
              className="rounded-lg border border-slate-700/50 bg-slate-800/50 px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-600 transition-colors">
              Close
            </button>
          </div>
        )}
      </div>
    </>,
    document.body
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { processingStatuses, startPolling, fetchStatusDetail, refreshItem, removeUpload } = useGrowthUploadStore();
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
    (item.reviewStatus === 'PENDING_REVIEW' && item.documentCategory) ||
    item.reviewStatus === 'APPROVED' ||
    item.reviewStatus === 'REJECTED'
  );
  const category = status?.classification?.documentCategory ?? item.documentCategory;
  const confidence = status?.classification?.confidenceScore ?? item.confidenceScore;
  // A saved draft remains PENDING_REVIEW in the established workflow.
  const canDelete = item.reviewStatus === 'PENDING_REVIEW' || item.reviewStatus === 'REJECTED';

  const handleViewExtractedData = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (deleting) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      await softDeleteDocument(backendToken, item.processingId);
      removeUpload(item.processingId);
      setShowDeleteConfirm(false);
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete document');
    } finally {
      setDeleting(false);
    }
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
                  {status.classification.primaryTargetModule ? (
                    <>
                      <span className="text-slate-500">Target Module</span>
                      <span className="text-violet-400 font-semibold">
                        {status.classification.primaryTargetModule.name ?? status.classification.primaryTargetModule.id}
                      </span>
                    </>
                  ) : status.classification.suggestedModule && (
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
              {canDelete && (
                <button
                  type="button"
                  id={`delete-document-${item.processingId}`}
                  onClick={() => {
                    setDeleteError(null);
                    setShowDeleteConfirm(true);
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/20"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.165m-1.022-.165L18.16 19.673A2.25 2.25 0 0115.916 21H8.084a2.25 2.25 0 01-2.244-1.327L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.058.68-.113 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.032-2.172a48.666 48.666 0 00-3.736 0C8.91 2.043 8 2.997 8 4.177v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  Delete Document
                </button>
              )}
            </div>
            {item.reviewStatus === 'APPROVED' && (
              <p className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs leading-relaxed text-amber-200">
                This document has already produced canonical records. Perform a rollback before deletion.
              </p>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete this document?"
        message={`This will remove “${item.fileName}” from active document workflows. The original MongoDB documents are retained as soft-deleted records.`}
        confirmLabel={deleting ? 'Deleting…' : 'Delete document'}
        confirmClass="bg-red-600 hover:bg-red-500"
        onConfirm={handleDelete}
        onCancel={() => {
          if (!deleting) setShowDeleteConfirm(false);
        }}
      >
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs leading-relaxed text-slate-300">
          <p className="font-semibold text-red-200">This soft-deletes:</p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            <li>the uploaded document record (UaipUpload);</li>
            <li>its AI-extracted KnowledgeRecord; and</li>
            <li>any saved review drafts.</li>
          </ul>
          <p className="mt-2 text-emerald-200">Canonical collections and records will not be changed.</p>
        </div>
        {deleteError && <p className="text-xs text-red-300">{deleteError}</p>}
      </ConfirmDialog>

      {/* Extracted Data Modal */}
      {showModal && (
        <ExtractedDataModal
          item={item}
          status={status}
          backendToken={backendToken}
          onClose={() => setShowModal(false)}
          onReviewComplete={async () => {
            // Force-refresh this item from KnowledgeRecord (bypasses cache guard)
            // so reviewStatus transitions from PENDING_REVIEW → APPROVED/REJECTED immediately
            await refreshItem(backendToken, item.processingId);
          }}
        />
      )}
    </>
  );
}

// ── Grouped History Item ───────────────────────────────────────────────────

function GroupedHistoryItem({
  latestItem,
  versions,
  backendToken,
}: {
  latestItem: GrowthUploadHistoryItem;
  versions: GrowthUploadHistoryItem[];
  backendToken: string;
}) {
  const [showVersions, setShowVersions] = useState(false);

  return (
    <div className="space-y-2 border border-slate-800 bg-slate-900/10 p-3 rounded-xl">
      <UploadHistoryItemCard item={latestItem} backendToken={backendToken} />
      {versions.length > 0 && (
        <div className="pl-4 mt-2">
          <button
            type="button"
            onClick={() => setShowVersions(!showVersions)}
            className="flex items-center gap-1.5 text-[11px] text-violet-400 hover:text-violet-300 font-bold transition-colors outline-none focus:ring-1 focus:ring-violet-500/30 rounded px-1"
          >
            <svg
              className={`h-3 w-3 transform transition-transform ${showVersions ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            {showVersions ? 'Hide' : 'Show'} older version{versions.length > 1 ? 's' : ''} ({versions.length})
          </button>

          {showVersions && (
            <div className="space-y-2 border-l border-slate-800 pl-3 mt-2">
              {versions.map((v) => (
                <div key={v.processingId} className="relative">
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-3 border-t border-slate-800" />
                  <UploadHistoryItemCard item={v} backendToken={backendToken} compact />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
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
  const [showAllVersions, setShowAllVersions] = useState(false);
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
            <div className="flex items-center gap-3">
              {uploads.length > 0 && (
                <span className="text-xs text-slate-500">
                  {uploads.length} document{uploads.length !== 1 ? 's' : ''}
                </span>
              )}
              {otherUploads.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllVersions(!showAllVersions)}
                  className="rounded-lg border border-slate-700/50 bg-slate-850 px-2.5 py-1.5 text-[11px] font-semibold text-slate-350 hover:text-white transition-colors"
                >
                  {showAllVersions ? 'Show Latest Only' : 'Show All Versions'}
                </button>
              )}
            </div>
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
              {showAllVersions ? (
                otherUploads.map((item) => (
                  <UploadHistoryItemCard key={item.processingId} item={item} backendToken={backendToken} />
                ))
              ) : (
                (() => {
                  const groupedList: { latestItem: GrowthUploadHistoryItem; versions: GrowthUploadHistoryItem[] }[] = [];
                  const groupsSeen = new Set<string>();

                  otherUploads.forEach((u) => {
                    const key = u.fileHash || u.fileName;
                    if (!groupsSeen.has(key)) {
                      groupsSeen.add(key);
                      const matches = otherUploads.filter((m) => (m.fileHash || m.fileName) === key);
                      const [latestItem, ...versions] = matches;
                      groupedList.push({ latestItem, versions });
                    }
                  });

                  return groupedList.map(({ latestItem, versions }) => (
                    <GroupedHistoryItem
                      key={latestItem.processingId}
                      latestItem={latestItem}
                      versions={versions}
                      backendToken={backendToken}
                    />
                  ));
                })()
              )}
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

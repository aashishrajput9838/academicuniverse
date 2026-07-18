'use client';

import { useMemo, useState } from 'react';

export interface SubjectDTO {
  code: string;
  name: string;
  credits: number;
  grade: string;
  gradePoints: number;
  gradingStatus: string;
}

export interface SemesterDTO {
  semester: string;
  year: number;
  term: string;
  academicYear: number;
  semesterNumber?: number;
  gpa: number;
  subjects: SubjectDTO[];
  sourceDocumentId?: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Graded: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  Audit: { bg: 'bg-slate-500/10', text: 'text-slate-300', border: 'border-slate-500/30' },
  Qualified: { bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/30' },
  Pass: { bg: 'bg-green-500/10', text: 'text-green-300', border: 'border-green-500/30' },
  Fail: { bg: 'bg-red-500/10', text: 'text-red-300', border: 'border-red-500/30' },
  'In Progress': { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/30' },
};

function getStatusStyle(status: string) {
  return STATUS_STYLES[status] || { bg: 'bg-slate-500/10', text: 'text-slate-300', border: 'border-slate-500/30' };
}

interface SemesterTranscriptSectionProps {
  semester: SemesterDTO;
  backendToken: string | null | undefined;
  apiBaseUrl: string;
  defaultExpanded?: boolean;
}

export function SemesterTranscriptSection({
  semester,
  backendToken,
  apiBaseUrl,
  defaultExpanded = true,
}: SemesterTranscriptSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const totalCredits = useMemo(
    () => semester.subjects.reduce((sum, s) => sum + s.credits, 0),
    [semester.subjects]
  );

  const handleView = async () => {
    const sourceDocumentId = semester.sourceDocumentId;
    if (!sourceDocumentId || !backendToken) return;
    const url = `${apiBaseUrl}/api/academic-records/documents/${sourceDocumentId}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${backendToken}` },
    });
    if (!res.ok) throw new Error('Failed to load document');
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
  };

  const handleDownload = async () => {
    const sourceDocumentId = semester.sourceDocumentId;
    if (!sourceDocumentId || !backendToken) return;
    const url = `${apiBaseUrl}/api/academic-records/documents/${sourceDocumentId}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${backendToken}` },
    });
    if (!res.ok) throw new Error('Failed to fetch document');
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `semester-${semester.semester}-${semester.year}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
      {/* Semester Header */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors cursor-pointer"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">
              {semester.semesterNumber ? `Semester ${semester.semesterNumber}` : `${semester.academicYear} • ${semester.term}`}
            </h3>
            {!semester.semesterNumber && (
              <p className="text-xs text-amber-400 mt-0.5">Complete your profile to determine the overall semester.</p>
            )}
          </div>
          <span className="text-xs font-medium text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded">
            {semester.subjects.length} subject{semester.subjects.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs text-slate-500">Semester GPA</p>
            <p className="text-lg font-bold text-emerald-400">{semester.gpa.toFixed(3)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Credits</p>
            <p className="text-sm font-medium text-slate-300">{totalCredits}</p>
          </div>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Transcript Table */}
      {isExpanded && (
        <div className="px-6 pb-6">
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-800/60">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Course</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Code</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Credits</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Grade</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Grade Points</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {semester.subjects.map((sub) => {
                  const statusStyle = getStatusStyle(sub.gradingStatus);
                  return (
                    <tr key={sub.code} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-white max-w-xs truncate" title={sub.name}>
                        {sub.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400 font-mono">{sub.code}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-slate-300">{sub.credits}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-emerald-400 font-semibold">{sub.grade}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-slate-400">{sub.gradePoints}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                          {sub.gradingStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Document Actions */}
          {semester.sourceDocumentId && backendToken && (
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={handleView}
                className="flex-1 rounded-md border border-slate-600 bg-slate-700/30 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700/50"
              >
                View Original PDF
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="flex-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20"
              >
                Download PDF
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

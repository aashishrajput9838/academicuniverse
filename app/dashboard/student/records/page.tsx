'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { apiRequest, API_BASE_URL } from '@/utils/api';
import { useModuleRefresh } from '@/hooks/useModuleRefresh';

interface SubjectDTO {
  code: string;
  name: string;
  credits: number;
  grade: string;
  gradePoints: number;
  gradingStatus: string;
}

interface SemesterDTO {
  semester: string;
  year: number;
  gpa: number;
  subjects: SubjectDTO[];
}

interface OverallDTO {
  cgpa: number;
  totalCredits: number;
  completedCredits: number;
  remainingCredits: number | null;
  semestersCompleted: number;
}

interface AcademicRecordsResponse {
  overall: OverallDTO;
  semesters: SemesterDTO[];
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

function getStanding(cgpa: number): string {
  if (cgpa >= 9.5) return 'Outstanding Standing';
  if (cgpa >= 8.5) return 'Excellent Standing';
  if (cgpa >= 7.5) return 'Good Standing';
  if (cgpa >= 6.5) return 'Satisfactory Standing';
  if (cgpa >= 5.5) return 'Adequate Standing';
  return 'Needs Improvement';
}

export default function StudentAcademicRecords() {
  const { user, backendUser, backendToken, loading } = useAuth();
  const router = useRouter();
  const [records, setRecords] = useState<AcademicRecordsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useModuleRefresh(['academic_records'], () => {
    if (backendToken) fetchRecords(backendToken);
  });

  const fetchRecords = async (token: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiRequest('/api/academic-records/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setRecords(response.data as AcademicRecordsResponse);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch academic records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && (!user || !backendUser)) {
      router.push('/login');
    } else if (!loading && backendUser && backendUser.role !== 'STUDENT' && backendUser.role !== 'FACULTY') {
      router.push('/');
    }
  }, [user, backendUser, loading, router]);

  useEffect(() => {
    if (loading || !user || !backendUser || backendUser.role !== 'STUDENT') {
      return;
    }
    if (!backendToken) {
      setError('Your session is no longer authenticated. Please sign in again to view your academic records.');
      setIsLoading(false);
      return;
    }
    fetchRecords(backendToken);
  }, [backendToken, backendUser, loading, user]);

  const totalSubjects = useMemo(() => {
    if (!records) return 0;
    return records.semesters.reduce((sum, sem) => sum + sem.subjects.length, 0);
  }, [records]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400 border-opacity-50" />
      </div>
    );
  }

  if (!user || !backendUser || backendUser.role !== 'STUDENT') {
    return null;
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Academic Records</h1>
        <p className="text-slate-400">View and manage your academic transcripts and records</p>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-5 border border-slate-700 animate-pulse">
                <div className="h-3 w-20 bg-slate-700 rounded mb-3" />
                <div className="h-9 w-24 bg-slate-700 rounded mb-2" />
                <div className="h-3 w-32 bg-slate-700 rounded" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[0, 1].map((i) => (
              <div key={i} className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 animate-pulse">
                <div className="h-4 w-28 bg-slate-700 rounded mb-4" />
                <div className="space-y-3">
                  <div className="h-16 bg-slate-700 rounded" />
                  <div className="h-16 bg-slate-700 rounded" />
                </div>
              </div>
            ))}
          </div>
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 animate-pulse">
            <div className="h-4 w-28 bg-slate-700 rounded mb-4" />
            <div className="space-y-3">
              <div className="h-10 bg-slate-700 rounded" />
              <div className="h-10 bg-slate-700 rounded" />
              <div className="h-10 bg-slate-700 rounded" />
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">Academic records unavailable</h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={() => {
              if (backendToken) fetchRecords(backendToken);
            }}
            disabled={!backendToken}
            className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-5 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
          >
            Try again
          </button>
        </div>
      ) : !records || records.semesters.length === 0 ? (
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-xl font-bold text-white mb-2">No academic records yet</h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Upload and approve a marksheet or transcript to see your academic records here.
          </p>
          <button
            type="button"
            onClick={() => router.push('/dashboard/student/growth')}
            className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-5 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
          >
            Upload Document
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Academic Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-5 border border-slate-700 flex flex-col">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">CGPA</h3>
              <div className="flex items-baseline gap-2 mt-auto">
                <span className="text-4xl font-bold text-emerald-400">{records.overall.cgpa.toFixed(3)}</span>
                <span className="text-sm text-slate-400">/ 10.0</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">{getStanding(records.overall.cgpa)}</p>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-5 border border-slate-700 flex flex-col">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Credits Completed</h3>
              <div className="flex items-baseline gap-2 mt-auto">
                <span className="text-4xl font-bold text-emerald-400">{records.overall.completedCredits}</span>
                <span className="text-sm text-slate-400">/ {records.overall.totalCredits}</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {records.overall.remainingCredits !== null
                  ? `${records.overall.remainingCredits} credits remaining`
                  : 'Program requirement not configured'}
              </p>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-5 border border-slate-700 flex flex-col">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Semesters</h3>
              <div className="flex items-baseline gap-2 mt-auto">
                <span className="text-4xl font-bold text-emerald-400">{records.overall.semestersCompleted}</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {records.overall.semestersCompleted === 1 ? 'First semester completed' : `${records.overall.semestersCompleted} semesters completed`}
              </p>
            </div>
          </div>

          {/* Semester List */}
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-emerald-400 mb-4">Semesters</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {records.semesters.map((sem) => (
                <div key={`${sem.semester}-${sem.year}`} className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-white">Semester {sem.semester}</h3>
                    <span className="text-xs font-medium text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded">{sem.year}</span>
                  </div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-400 text-sm">GPA</span>
                    <span className="text-emerald-400 font-semibold">{sem.gpa.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Subjects</span>
                    <span className="text-slate-300 text-sm font-medium">{sem.subjects.length}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transcript */}
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-emerald-400 mb-4">Transcript</h2>
            <p className="text-xs text-slate-500 mb-4">
              Showing {totalSubjects} subject{totalSubjects !== 1 ? 's' : ''} across {records.semesters.length} semester{records.semesters.length !== 1 ? 's' : ''}.
              CGPA is computed from GPA-eligible subjects only.
            </p>
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
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
                  {records.semesters.flatMap((sem) =>
                    sem.subjects.map((sub) => {
                      const statusStyle = getStatusStyle(sub.gradingStatus);
                      return (
                        <tr key={`${sem.semester}-${sem.year}-${sub.code}`} className="hover:bg-slate-800/30 transition-colors group">
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
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Documents Section */}
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-emerald-400 mb-4">Documents</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {records.semesters.map((sem) => (
                <div key={`doc-${sem.semester}-${sem.year}`} className="bg-slate-800/50 rounded-lg border border-slate-600 p-4 flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-sm font-medium text-white">Semester {sem.semester} Marksheet</div>
                      <div className="text-xs text-slate-400 mt-0.5">Academic Year {sem.year}</div>
                    </div>
                    <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded">{sem.subjects.length} subjects</span>
                  </div>
                  <div className="mt-auto pt-3 flex gap-2">
                    <button
                      type="button"
                      className="flex-1 rounded-md border border-slate-600 bg-slate-700/30 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700/50"
                      onClick={() => {
                        const sourceDocumentId = (sem as any).sourceDocumentId as string | undefined;
                        if (!sourceDocumentId) {
                          return;
                        }
                        const url = `${API_BASE_URL}/api/academic-records/documents/${sourceDocumentId}`;
                        fetch(url, {
                          headers: {
                            Authorization: `Bearer ${backendToken}`,
                          },
                        })
                          .then((res) => {
                            if (!res.ok) throw new Error('Failed to load document');
                            return res.blob();
                          })
                          .then((blob) => {
                            const blobUrl = window.URL.createObjectURL(blob);
                            window.open(blobUrl, '_blank');
                            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
                          })
                          .catch((err) => {
                            console.error('View failed', err);
                          });
                      }}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="flex-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20"
                      onClick={() => {
                        const sourceDocumentId = (sem as any).sourceDocumentId as string | undefined;
                        if (!sourceDocumentId) {
                          return;
                        }
                        const url = `${API_BASE_URL}/api/academic-records/documents/${sourceDocumentId}`;
                        fetch(url, {
                          headers: {
                            Authorization: `Bearer ${backendToken}`,
                          },
                        })
                          .then((res) => {
                            if (!res.ok) throw new Error('Failed to fetch document');
                            return res.blob();
                          })
                          .then((blob) => {
                            const blobUrl = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = blobUrl;
                            a.download = `semester-${sem.semester}-${sem.year}`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            window.URL.revokeObjectURL(blobUrl);
                          })
                          .catch((err) => {
                            console.error('Download failed', err);
                          });
                      }}
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

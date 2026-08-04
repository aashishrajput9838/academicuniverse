'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { overlapAPI } from '@/utils/api/overlapAPI';
import { useDebounce } from '@/hooks/useDebounce';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import {
  Users,
  Search,
  Sparkles,
  Clock,
  Calendar,
  Check,
  Copy,
  X,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  UserCheck,
  ShieldCheck,
  Loader2,
  Info
} from 'lucide-react';
import type { StudentSearchResult, StudentOverlapData, RecommendationSlot } from '@shared-types/overlap';

export default function OverlapEnginePage() {
  const { user, backendUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedQuery = useDebounce(searchQuery, 300);

  const [searchResults, setSearchResults] = useState<StudentSearchResult[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [selectedStudents, setSelectedStudents] = useState<StudentSearchResult[]>([]);

  const [overlapData, setOverlapData] = useState<StudentOverlapData | null>(null);
  const [calculating, setCalculating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { copied, copyToClipboard } = useCopyToClipboard(2500);

  // Search students when debounced query changes
  useEffect(() => {
    async function performSearch() {
      if (!user) return;
      try {
        setSearching(true);
        const res = await overlapAPI.searchStudents(debouncedQuery);
        if (res.success && Array.isArray(res.data)) {
          setSearchResults(res.data);
        }
      } catch (err: any) {
        console.error('Error searching students:', err);
      } finally {
        setSearching(false);
      }
    }

    performSearch();
  }, [debouncedQuery, user]);

  const handleSelectStudent = (student: StudentSearchResult) => {
    if (!student.isSelectable) return;
    if (selectedStudents.some(s => s.id === student.id || s.userId === student.userId)) return;
    if (selectedStudents.length >= 5) return;

    setSelectedStudents(prev => [...prev, student]);
  };

  const handleRemoveStudent = (studentId: string) => {
    setSelectedStudents(prev => prev.filter(s => s.id !== studentId && s.userId !== studentId));
  };

  const handleFindCommonFreeTime = async () => {
    if (selectedStudents.length === 0) return;

    try {
      setCalculating(true);
      setError(null);

      const studentIds = selectedStudents.map(s => s.userId || s.id);
      const response = await overlapAPI.findStudentOverlap(studentIds);

      if (response.success && response.data) {
        setOverlapData(response.data);
      } else {
        throw new Error(response.message || 'Failed to calculate common free time');
      }
    } catch (err: any) {
      console.error('Overlap calculation error:', err);
      setError(err.message || 'An error occurred while finding common free time.');
      setOverlapData(null);
    } finally {
      setCalculating(false);
    }
  };

  const isSelected = (studentId: string) => {
    return selectedStudents.some(s => s.id === studentId || s.userId === studentId);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 shadow-xl backdrop-blur-md">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                OVERLAP ENGINE
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                STUDENT SMART MEET PLANNER
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              Find Common Free Time
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
              Discover AI-ranked common free time slots for study groups, project meetings, hackathons, and club activities using synchronized E-Zone academic schedules.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT PANEL: Find Student & Selection */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border bg-slate-900/80 border-slate-800 text-slate-100 shadow-xl backdrop-blur-md overflow-hidden">
              <div className="flex flex-col space-y-1.5 p-6 border-b border-slate-800/80 pb-4">
                <div className="tracking-tight text-lg font-bold text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-400" />
                  Find Student
                </div>
                <p className="text-slate-400 text-xs">
                  Search another student from your organization and discover common free time.
                </p>
              </div>

              <div className="p-6 space-y-6">
                
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Student Name or System ID..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                  />
                  {searching && (
                    <Loader2 className="absolute right-3.5 top-3 h-4 w-4 text-emerald-400 animate-spin" />
                  )}
                </div>

                {/* Selected Students Panel */}
                {selectedStudents.length > 0 && (
                  <div className="space-y-3 p-4 bg-slate-950/60 rounded-xl border border-emerald-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5" />
                        Selected Participants ({selectedStudents.length}/5)
                      </span>
                      {selectedStudents.length >= 5 && (
                        <span className="text-[10px] text-amber-400 font-medium">Max 5 reached</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedStudents.map(student => (
                        <span
                          key={student.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-medium"
                        >
                          <span>{student.studentName} ({student.systemId})</span>
                          <button
                            onClick={() => handleRemoveStudent(student.id)}
                            className="hover:text-emerald-100 text-emerald-400 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search Results List */}
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {searchResults.length === 0 && !searching && (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      No active students found matching &quot;{searchQuery}&quot;
                    </div>
                  )}

                  {searchResults.map(student => {
                    const selected = isSelected(student.id);
                    return (
                      <div
                        key={student.id}
                        className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          selected
                            ? 'bg-emerald-950/30 border-emerald-500/40'
                            : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-emerald-400 shrink-0">
                            {student.studentName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                              {student.studentName}
                              {student.syncStatus === 'SYNCED' && (
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                              )}
                            </h4>
                            <p className="text-[11px] text-slate-400 truncate">
                              ID: {student.systemId} • {student.department || 'CS/IT'}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              {student.syncStatus === 'SYNCED' ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  ✅ Synced Schedule
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20" title={student.unselectableReason}>
                                  ⚠ {student.syncStatus === 'NEVER_SYNCED' ? 'Never Synced' : 'Sync Pending'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          {selected ? (
                            <button
                              onClick={() => handleRemoveStudent(student.id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold hover:bg-emerald-500/30 transition"
                            >
                              Selected
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSelectStudent(student)}
                              disabled={!student.isSelectable || selectedStudents.length >= 5}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                student.isSelectable && selectedStudents.length < 5
                                  ? 'bg-slate-800 text-white hover:bg-emerald-600 hover:text-white border border-slate-700'
                                  : 'bg-slate-900 text-slate-600 border border-slate-800/80 cursor-not-allowed'
                              }`}
                            >
                              + Select
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Find Free Time Button */}
                <button
                  onClick={handleFindCommonFreeTime}
                  disabled={selectedStudents.length === 0 || calculating}
                  className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 font-bold shadow-lg shadow-emerald-950/40 rounded-xl py-3.5 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {calculating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                      Computing Shared Free Time...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 fill-slate-950" />
                      Find Common Free Time
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Meeting Recommendations */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border bg-slate-900/80 border-slate-800 text-slate-100 shadow-xl backdrop-blur-md h-full flex flex-col">
              
              <div className="p-6 border-b border-slate-800/80 pb-4 flex items-center justify-between">
                <div>
                  <div className="tracking-tight text-lg font-bold text-white flex items-center gap-2">
                    <Clock className="h-5 w-5 text-emerald-400" />
                    Meeting Recommendations
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5">
                    AI-ranked common free slots across synchronized student schedules
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-6 flex-1">
                {error && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Case 1: Initial Empty State */}
                {!overlapData && !calculating && !error && (
                  <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-200">Find Free Time in 2 Quick Steps</h3>
                    <p className="text-slate-400 text-sm max-w-md leading-relaxed">
                      Search and select 1 to 5 students from your organization, then click <strong>&quot;Find Common Free Time&quot;</strong>.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg text-left mt-4 pt-4 border-t border-slate-800/80">
                      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                        <span className="text-xs font-bold text-emerald-400">01</span>
                        <p className="text-xs font-medium text-slate-300 mt-1">Search Student</p>
                        <p className="text-[11px] text-slate-500">ByName or System ID</p>
                      </div>
                      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                        <span className="text-xs font-bold text-cyan-400">02</span>
                        <p className="text-xs font-medium text-slate-300 mt-1">Calculate</p>
                        <p className="text-[11px] text-slate-500">Run Overlap Engine</p>
                      </div>
                      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                        <span className="text-xs font-bold text-purple-400">03</span>
                        <p className="text-xs font-medium text-slate-300 mt-1">Plan Meet</p>
                        <p className="text-[11px] text-slate-500">Copy &amp; share slots</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Case 2: Calculation Results Available */}
                {overlapData && (
                  <div className="space-y-6">

                    {/* Participant Summary */}
                    <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                        <Users className="h-4 w-4 text-emerald-400" />
                        Participants ({overlapData.totalParticipants}):
                      </span>
                      <span className="font-semibold text-emerald-400 truncate max-w-sm">
                        {overlapData.participantNames?.join(', ')}
                      </span>
                    </div>

                    {/* Best Recommendation Hero Card */}
                    {overlapData.bestRecommendation ? (
                      <div className="p-6 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 rounded-2xl border border-emerald-500/40 shadow-xl space-y-4 relative overflow-hidden">
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500 text-slate-950 flex items-center gap-1">
                            ★ BEST RECOMMENDATION
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold">
                            Meeting Score: {overlapData.bestRecommendation.score}/100
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2">
                          <div>
                            <span className="text-[11px] text-slate-400 block font-medium">DAY</span>
                            <span className="text-base font-bold text-white">{overlapData.bestRecommendation.day}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400 block font-medium">TIME SLOT</span>
                            <span className="text-base font-bold text-emerald-300">
                              {overlapData.bestRecommendation.start} - {overlapData.bestRecommendation.end}
                            </span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400 block font-medium">DURATION</span>
                            <span className="text-base font-bold text-white">{overlapData.bestRecommendation.durationMinutes} Mins</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400 block font-medium">COLLABORATION</span>
                            <span className="text-xs font-semibold text-cyan-400 truncate block">
                              {overlapData.bestRecommendation.collaborationTag || 'Group Meeting'}
                            </span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-4">
                          <p className="text-xs text-slate-300 flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            <span><strong>AI Reason:</strong> {overlapData.bestRecommendation.reason}</span>
                          </p>
                          <button
                            onClick={() => copyToClipboard(
                              `[Academic Universe Meet Slot] Day: ${overlapData.bestRecommendation?.day}, Time: ${overlapData.bestRecommendation?.start} - ${overlapData.bestRecommendation?.end} (${overlapData.bestRecommendation?.durationMinutes} mins)`
                            )}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                          >
                            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            {copied ? 'Copied!' : 'Copy Slot'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* No Common Free Slot Case */
                      <div className="p-8 bg-slate-950/60 rounded-2xl border border-slate-800 text-center space-y-3">
                        <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto" />
                        <h4 className="text-base font-bold text-white">No Common Free Slot Exists</h4>
                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                          {overlapData.message || 'No common free slot exists between selected students for the standard schedule periods.'}
                        </p>
                        <div className="pt-2">
                          <button
                            onClick={() => setSelectedStudents([])}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
                          >
                            Suggest Alternative Day / Reset Selection
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Other Available Slots */}
                    {overlapData.otherRecommendations && overlapData.otherRecommendations.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                          Other Available Free Slots ({overlapData.otherRecommendations.length})
                        </h4>
                        <div className="space-y-2.5">
                          {overlapData.otherRecommendations.map((slot, idx) => (
                            <div
                              key={idx}
                              className="p-3.5 bg-slate-950/50 rounded-xl border border-slate-800 hover:border-slate-700 transition flex items-center justify-between gap-4"
                            >
                              <div className="flex items-center gap-4 min-w-0">
                                <div className="text-center px-2.5 py-1 bg-slate-900 rounded-lg border border-slate-800 shrink-0">
                                  <span className="text-xs font-bold text-white block">{slot.day}</span>
                                  <span className="text-[10px] text-slate-500 block">{slot.durationMinutes}m</span>
                                </div>
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-emerald-400 block">
                                    {slot.start} - {slot.end}
                                  </span>
                                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                    {slot.reason}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                  Score: {slot.score}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(`[Meet Slot] ${slot.day} ${slot.start} - ${slot.end}`)}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                                  title="Copy slot"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
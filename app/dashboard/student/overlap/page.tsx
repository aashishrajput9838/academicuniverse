'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { overlapAPI } from '@/utils/api/overlapAPI';
import UploadTimetableModal from '@/components/UploadTimetableModal';
import FilePreviewModal from '@/components/FilePreviewModal';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar,
  Clock,
  Users,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Copy,
  Check,
  Upload,
  Eye,
  Info,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { useDebounce } from '@/hooks/useDebounce';
import { SearchBar } from '@/components/common/SearchBar';
import type { Section, TimeRange, OverlapResult } from '@/types/overlap';

// Section, TimeRange, OverlapResult types imported from @/types/overlap

// Helper to assign a student-friendly collaboration tag based on slot index & day
const getCollaborationTag = (slotIndex: number, day: string): { label: string; bg: string; text: string } => {
  const tags = [
    { label: 'Ideal for Project Sync', bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400' },
    { label: 'Hackathon Practice', bg: 'bg-cyan-500/10 border-cyan-500/30', text: 'text-cyan-400' },
    { label: 'Group Study Session', bg: 'bg-purple-500/10 border-purple-500/30', text: 'text-purple-400' },
    { label: 'Club Activity Window', bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-400' },
    { label: 'Assignment Discussion', bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-400' }
  ];
  return tags[(slotIndex + day.length) % tags.length];
};

const OverlapEnginePage = () => {
  const { user, backendUser } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [overlapResult, setOverlapResult] = useState<OverlapResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string>('');
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);
  const [previewSection, setPreviewSection] = useState<{ isOpen: boolean; url: string | null; name: string }>({
    isOpen: false,
    url: null,
    name: ''
  });
  const { copied, copyToClipboard } = useCopyToClipboard(2500);

  // Check if user is global admin - support multiple role formats
  const isGlobalAdmin = Boolean(
    backendUser && (
      backendUser.role === 'ADMIN' ||
      backendUser.role === 'SUPER_ADMIN' ||
      (backendUser as any).permissions?.includes('MANAGE_USERS')
    )
  );

  // Fetch available sections on component mount
  useEffect(() => {
    if (user) {
      fetchAvailableSections();
    }
  }, [user]);

  const fetchAvailableSections = async () => {
    try {
      setLoading(true);
      setError(null);

      const orgId = backendUser?.organizationId || backendUser?.organization || '';
      if (!orgId) {
        throw new Error('User organization not found');
      }
      setOrganizationId(orgId);

      // Test backend connection first
      const isBackendAvailable = await overlapAPI.testConnection();
      if (!isBackendAvailable) {
        throw new Error('Backend service is not available. Please try again later.');
      }

      // Fetch available sections
      const response = await overlapAPI.getAvailableSections(orgId);
      setSections(response.data.sections || []);

    } catch (err: any) {
      console.error('Error fetching sections:', err);
      setError(err.message || 'Failed to load available sections');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = (sectionId: string) => {
    setCurrentSectionId(sectionId);
    setShowUploadModal(true);
  };

  const handleUploadSuccess = () => {
    // Refresh sections to show updated timetable status
    fetchAvailableSections();
  };

  const handleSectionToggle = (sectionId: string) => {
    setSelectedSections(prev => {
      if (prev.includes(sectionId)) {
        return prev.filter(id => id !== sectionId);
      } else {
        if (prev.length >= 5) {
          return prev; // Don't allow more than 5 selections
        }
        return [...prev, sectionId];
      }
    });
  };

  const calculateOverlap = async () => {
    try {
      setProcessing(true);
      setError(null);
      setOverlapResult(null);

      if (selectedSections.length === 0) {
        throw new Error('Please select at least one section');
      }

      // Calculate overlap using the API service
      const response = await overlapAPI.calculateOverlapSlots(selectedSections, organizationId);
      setOverlapResult(response.data.overlapSlots);

    } catch (err: any) {
      console.error('Error calculating overlap:', err);
      setError(err.message || 'Failed to calculate overlap slots');
    } finally {
      setProcessing(false);
    }
  };

  // Filter sections using debounced search query
  const filteredSections = useMemo(() => {
    if (!debouncedSearch.trim()) return sections;
    return sections.filter(sec =>
      sec.sectionName.toLowerCase().includes(debouncedSearch.toLowerCase().trim()) ||
      sec._id.toLowerCase().includes(debouncedSearch.toLowerCase().trim())
    );
  }, [sections, debouncedSearch]);

  // Selected Section Object details for display
  const selectedSectionObjects = useMemo(() => {
    return sections.filter(s => selectedSections.includes(s._id));
  }, [sections, selectedSections]);

  // Calculate total free slots count
  const totalSlotsCount = useMemo(() => {
    if (!overlapResult) return 0;
    return Object.values(overlapResult).reduce((acc, slots) => acc + slots.length, 0);
  }, [overlapResult]);

  // Copy schedule summary to clipboard via shared hook
  const copyScheduleSummary = () => {
    if (!overlapResult) return;
    const selectedNames = selectedSectionObjects.map(s => s.sectionName).join(', ');
    let text = `📅 Common Free Time Summary (${selectedNames})\n`;
    text += `Generated via Academic Universe Overlap Engine\n\n`;

    Object.entries(overlapResult).forEach(([day, slots]) => {
      if (slots.length > 0) {
        text += `• ${day}:\n`;
        slots.forEach(slot => {
          text += `   - ${slot.start} to ${slot.end}\n`;
        });
      }
    });

    copyToClipboard(text);
  };

  const renderSectionSelector = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-16 w-full bg-slate-800/60 rounded-xl" />
          ))}
        </div>
      );
    }

    if (sections.length === 0) {
      return (
        <div className="text-center py-12 bg-slate-900/50 rounded-xl border border-slate-800">
          <Users className="mx-auto h-12 w-12 text-slate-500 mb-3" />
          <h4 className="text-slate-300 font-medium">No Sections Available</h4>
          <p className="text-slate-500 text-sm mt-1">No sections were found for your organization</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {/* Search Bar - using shared SearchBar component */}
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search sections by name..."
          className="mb-3"
        />

        {filteredSections.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm bg-slate-900/40 rounded-xl">
            No section matches &quot;{debouncedSearch}&quot;
          </div>
        ) : (
          <div className="max-h-[380px] overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
            {filteredSections.map((section) => {
              const isSelected = selectedSections.includes(section._id);
              const isRepOrAdmin = isGlobalAdmin || (backendUser && (
                section.representativeUid === backendUser.id ||
                (section as any).representativeId === backendUser.id ||
                (section as any).representativeId?._id === backendUser.id
              ));

              return (
                <div
                  key={section._id}
                  onClick={() => handleSectionToggle(section._id)}
                  className={`group p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-emerald-950/40 to-slate-900 border-emerald-500/50 shadow-lg shadow-emerald-950/30'
                      : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                          : 'border-slate-600 bg-slate-800/50 group-hover:border-slate-500'
                      }`}>
                        {isSelected && <CheckCircle2 className="w-4 h-4 fill-slate-950 stroke-emerald-500" />}
                      </div>

                      <div>
                        <h4 className="font-semibold text-slate-200 text-sm group-hover:text-white transition-colors">
                          {section.sectionName}
                        </h4>
                        <p className="text-xs text-slate-400">
                          ID: <span className="font-mono text-slate-400">{section._id.substring(0, 8)}...</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Timetable Status Badge */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                        section.hasTimetable
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}>
                        {section.hasTimetable ? 'Timetable Uploaded' : 'No Timetable'}
                      </span>

                      {/* Preview Button */}
                      {section.hasTimetable && section.timetableUrl && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewSection({
                              isOpen: true,
                              url: section.timetableUrl || null,
                              name: `Timetable: ${section.sectionName}`
                            });
                          }}
                          className="p-1.5 text-xs text-slate-300 hover:text-emerald-400 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors"
                          title="Preview Timetable"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Upload Button */}
                      {isRepOrAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUploadClick(section._id);
                          }}
                          className="p-1.5 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors flex items-center gap-1"
                          title="Upload Timetable"
                        >
                          <Upload className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Selected Sections Tracker */}
        <div className="mt-4 p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-300">
              Selected: <strong className="text-white">{selectedSections.length}</strong> / 5 sections max
            </span>
          </div>
          {selectedSections.length > 0 && (
            <button
              onClick={() => setSelectedSections([])}
              className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors"
            >
              Clear Selection
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderOverlapResult = () => {
    if (processing) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-400 mb-4" />
          <h4 className="text-slate-200 font-semibold text-lg">Analyzing Schedules...</h4>
          <p className="text-slate-400 text-sm mt-1 max-w-sm">
            Evaluating weekly timetables to discover overlapping free time slots for selected sections.
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="h-12 w-12 text-rose-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-100 mb-2">
            Calculation Error
          </h3>
          <p className="text-slate-400 text-sm max-w-md mb-6">
            {error}
          </p>
          <Button
            onClick={calculateOverlap}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            Try Again
          </Button>
        </div>
      );
    }

    if (!overlapResult) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-200">
            Find Free Time in 2 Quick Steps
          </h3>
          <p className="text-slate-400 text-sm max-w-md leading-relaxed">
            Select 2 or more sections from the left panel, then click <strong>"Find Free Time Slots"</strong> to see shared available hours.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg text-left mt-4 pt-4 border-t border-slate-800/80">
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <span className="text-xs font-bold text-emerald-400">01</span>
              <p className="text-xs font-medium text-slate-300 mt-1">Pick Sections</p>
              <p className="text-[11px] text-slate-500">Choose up to 5 sections</p>
            </div>
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <span className="text-xs font-bold text-cyan-400">02</span>
              <p className="text-xs font-medium text-slate-300 mt-1">Calculate</p>
              <p className="text-[11px] text-slate-500">Run Overlap Engine</p>
            </div>
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <span className="text-xs font-bold text-purple-400">03</span>
              <p className="text-xs font-medium text-slate-300 mt-1">Plan Meet</p>
              <p className="text-[11px] text-slate-500">Copy & share slots</p>
            </div>
          </div>
        </div>
      );
    }

    const days = Object.keys(overlapResult);

    if (days.length === 0 || totalSlotsCount === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-semibold text-slate-200 mb-1">
            No Common Free Slots Found
          </h3>
          <p className="text-slate-400 text-sm max-w-md leading-relaxed mb-4">
            No common free time slots exist across all selected sections. Try selecting fewer or different sections.
          </p>
          <span className="text-xs text-slate-500 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
            Tip: Check if section timetables are uploaded and up to date.
          </span>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Results Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400">Free Days</span>
            <p className="text-2xl font-bold text-emerald-400">{days.length}</p>
          </div>
          <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400">Total Available Slots</span>
            <p className="text-2xl font-bold text-cyan-400">{totalSlotsCount}</p>
          </div>
          <div className="col-span-2 sm:col-span-1 p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col justify-center">
            <button
              onClick={copyScheduleSummary}
              className="w-full py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copied to Clipboard!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Schedule
                </>
              )}
            </button>
          </div>
        </div>

        {/* Day-by-Day Slot List */}
        <div className="space-y-4">
          {days.map((day) => {
            const slots = overlapResult[day];
            if (slots.length === 0) return null;

            return (
              <div
                key={day}
                className="bg-slate-900/70 rounded-xl border border-slate-800 p-4 transition-all hover:border-slate-700"
              >
                <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
                  <h4 className="font-semibold text-slate-200 text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    {day}
                  </h4>
                  <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-medium">
                    {slots.length} free slot{slots.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {slots.map((slot, index) => {
                    const tag = getCollaborationTag(index, day);
                    return (
                      <div
                        key={index}
                        className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm font-bold text-white tracking-wide">
                              {slot.start} – {slot.end}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            50 min
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-1">
                          <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium border ${tag.bg} ${tag.text}`}>
                            {tag.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Page Header */}
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
              Use Overlap Engine to discover common free time slots for study groups, project meetings, hackathons, and club activities.
            </p>
          </div>

          {/* Admin Mode Badge */}
          {isGlobalAdmin && (
            <div className="self-start md:self-center bg-rose-500/10 text-rose-400 border border-rose-500/30 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-rose-400" />
              <span>Admin Privileges Active</span>
            </div>
          )}
        </div>

        {/* Main Grid Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Section Selector Panel (5 Columns) */}
          <div className="lg:col-span-5">
            <Card className="bg-slate-900/80 border-slate-800 text-slate-100 shadow-xl backdrop-blur-md">
              <CardHeader className="border-b border-slate-800/80 pb-4">
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-400" />
                  Select Sections
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Choose up to 5 sections to compute shared free hours
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-5 space-y-5">
                {renderSectionSelector()}

                <Button
                  onClick={calculateOverlap}
                  disabled={selectedSections.length === 0 || processing}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 font-bold shadow-lg shadow-emerald-950/40 rounded-xl py-5 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-950" />
                      Calculating Free Time...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 fill-slate-950" />
                      Find Free Time Slots
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Overlap Results Panel (7 Columns) */}
          <div className="lg:col-span-7">
            <Card className="bg-slate-900/80 border-slate-800 text-slate-100 shadow-xl backdrop-blur-md h-full">
              <CardHeader className="border-b border-slate-800/80 pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <Clock className="h-5 w-5 text-emerald-400" />
                    Common Free Time Results
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs">
                    Matching free slots across selected section timetables
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="pt-5">
                {renderOverlapResult()}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Administrative Tools (Admin Only) */}
        {isGlobalAdmin && (
          <Card className="bg-slate-900/40 border-slate-800 text-slate-100 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-300 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Administrator Controls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400">
                As a system administrator, you have permission to upload timetables for any section and manage section representatives across all campus branches.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modals */}
      <UploadTimetableModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        sectionId={currentSectionId || undefined}
        onSuccess={handleUploadSuccess}
      />

      <FilePreviewModal
        isOpen={previewSection.isOpen}
        onClose={() => setPreviewSection(prev => ({ ...prev, isOpen: false }))}
        fileUrl={previewSection.url}
        title={previewSection.name}
      />
    </div>
  );
};

export default OverlapEnginePage;
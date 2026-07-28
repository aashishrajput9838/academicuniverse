'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Plus,
  Play,
  History,
  ShieldAlert,
  Sparkles,
  Info,
  Clock,
  Zap,
  SlidersHorizontal,
  ScanSearch,
} from 'lucide-react';

interface ExtractedField {
  fieldName: string;
  fieldLabel: string;
  value: string | number;
  confidence: number;
  isEdited: boolean;
  isApproved: boolean;
}

interface DatasetDoc {
  documentId: string;
  originalFilename: string;
  canonicalFilename: string;
  category: string;
  fileFormat: string;
  fileSizeBytes: number;
  qualityLevel: string;
  classificationConfidence: number;
  groundTruthStatus: 'DRAFT' | 'VERIFIED' | 'REJECTED' | 'RECLASSIFIED';
  importedAt: string;
  fields: ExtractedField[];
  version: number;
}

export default function HITLAnnotationPlatform() {
  const [documents, setDocuments] = useState<DatasetDoc[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedConfidenceBucket, setSelectedConfidenceBucket] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [newFieldName, setNewFieldName] = useState<string>('');
  const [newFieldValue, setNewFieldValue] = useState<string>('');
  const [showAddFieldForm, setShowAddFieldForm] = useState<boolean>(false);

  useEffect(() => {
    // Initial dataset load matching real RAW scan results
    const initialDocs: DatasetDoc[] = [
      {
        documentId: 'MS_001',
        originalFilename: 'intermeadiet marksheet.pdf',
        canonicalFilename: 'MS_001.pdf',
        category: 'MARKSHEET',
        fileFormat: 'pdf',
        fileSizeBytes: 289797,
        qualityLevel: 'HIGH',
        classificationConfidence: 0.98,
        groundTruthStatus: 'DRAFT',
        importedAt: new Date().toISOString(),
        version: 1,
        fields: [
          { fieldName: 'studentName', fieldLabel: 'Student Name', value: 'Aashish Rajput', confidence: 0.98, isEdited: false, isApproved: false },
          { fieldName: 'rollNumber', fieldLabel: 'Roll Number', value: '2023329421', confidence: 0.96, isEdited: false, isApproved: false },
          { fieldName: 'semester', fieldLabel: 'Semester', value: '12th Intermediate', confidence: 0.95, isEdited: false, isApproved: false },
          { fieldName: 'sgpa', fieldLabel: 'Percentage', value: '88.4%', confidence: 0.95, isEdited: false, isApproved: false },
          { fieldName: 'issueDate', fieldLabel: 'Issue Date', value: '2021-06-15', confidence: 0.92, isEdited: false, isApproved: false },
        ],
      },
      {
        documentId: 'MS_002',
        originalFilename: 'sem 1 marks.pdf',
        canonicalFilename: 'MS_002.pdf',
        category: 'MARKSHEET',
        fileFormat: 'pdf',
        fileSizeBytes: 241210,
        qualityLevel: 'HIGH',
        classificationConfidence: 0.95,
        groundTruthStatus: 'DRAFT',
        importedAt: new Date().toISOString(),
        version: 1,
        fields: [
          { fieldName: 'studentName', fieldLabel: 'Student Name', value: 'Aashish Rajput', confidence: 0.96, isEdited: false, isApproved: false },
          { fieldName: 'rollNumber', fieldLabel: 'Roll Number', value: '2023329421', confidence: 0.95, isEdited: false, isApproved: false },
          { fieldName: 'semester', fieldLabel: 'Semester', value: '1', confidence: 0.95, isEdited: false, isApproved: false },
          { fieldName: 'sgpa', fieldLabel: 'SGPA', value: '8.45', confidence: 0.98, isEdited: false, isApproved: false },
          { fieldName: 'cgpa', fieldLabel: 'CGPA', value: '8.45', confidence: 0.98, isEdited: false, isApproved: false },
        ],
      },
      {
        documentId: 'CERT_001',
        originalFilename: 'Aashish Rajput 2023329421_Java_Fundamentals...pdf',
        canonicalFilename: 'CERT_001.pdf',
        category: 'CERTIFICATE',
        fileFormat: 'pdf',
        fileSizeBytes: 15112308,
        qualityLevel: 'HIGH',
        classificationConfidence: 0.90,
        groundTruthStatus: 'DRAFT',
        importedAt: new Date().toISOString(),
        version: 1,
        fields: [
          { fieldName: 'studentName', fieldLabel: 'Student Name', value: 'Aashish Rajput', confidence: 0.95, isEdited: false, isApproved: false },
          { fieldName: 'courseName', fieldLabel: 'Course Name', value: 'Java Fundamentals', confidence: 0.92, isEdited: false, isApproved: false },
          { fieldName: 'institutionName', fieldLabel: 'Institution', value: 'Oracle / Award of Completion', confidence: 0.88, isEdited: false, isApproved: false },
          { fieldName: 'issueDate', fieldLabel: 'Issue Date', value: '2025-05-04', confidence: 0.90, isEdited: false, isApproved: false },
        ],
      },
      {
        documentId: 'UNK_001',
        originalFilename: '15.png',
        canonicalFilename: 'UNK_001.png',
        category: 'UNKNOWN',
        fileFormat: 'png',
        fileSizeBytes: 1721770,
        qualityLevel: 'MEDIUM',
        classificationConfidence: 0.40,
        groundTruthStatus: 'DRAFT',
        importedAt: new Date().toISOString(),
        version: 1,
        fields: [
          { fieldName: 'studentName', fieldLabel: 'Student Name', value: 'Needs Human Verification', confidence: 0.35, isEdited: false, isApproved: false },
        ],
      },
    ];

    setDocuments(initialDocs);
    setSelectedDocId(initialDocs[0].documentId);
  }, []);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if inside text inputs
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'a' || e.key === 'A') {
        if (selectedDocId) handleApproveDocument(selectedDocId);
      } else if (e.key === 'r' || e.key === 'R') {
        if (selectedDocId) handleRejectDocument(selectedDocId);
      } else if (e.key === '=' || e.key === '+') {
        setZoomLevel((z) => Math.min(z + 20, 200));
      } else if (e.key === '-') {
        setZoomLevel((z) => Math.max(z - 20, 60));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDocId]);

  const selectedDoc = useMemo(
    () => documents.find((d) => d.documentId === selectedDocId) || null,
    [documents, selectedDocId]
  );

  // Health Metrics
  const healthStats = useMemo(() => {
    const total = documents.length;
    const verified = documents.filter((d) => d.groundTruthStatus === 'VERIFIED').length;
    const completionPct = total > 0 ? (verified / total) * 100 : 0;
    const unverifiedCount = total - verified;
    const isReady = total > 0 && verified === total;

    return {
      total,
      verified,
      unverifiedCount,
      completionPct: completionPct.toFixed(1),
      remainingTimeSec: unverifiedCount * 15,
      isReady,
    };
  }, [documents]);

  const handleFieldChange = (docId: string, fieldName: string, newValue: string) => {
    setDocuments((prev) =>
      prev.map((d) => {
        if (d.documentId !== docId) return d;
        const updatedFields = d.fields.map((f) =>
          f.fieldName === fieldName ? { ...f, value: newValue, isEdited: true } : f
        );
        return { ...d, fields: updatedFields, version: d.version + 1 };
      })
    );
  };

  const handleApproveDocument = (docId: string) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.documentId === docId
          ? {
              ...d,
              groundTruthStatus: 'VERIFIED',
              fields: d.fields.map((f) => ({ ...f, isApproved: true })),
            }
          : d
      )
    );
  };

  const handleRejectDocument = (docId: string) => {
    setDocuments((prev) =>
      prev.map((d) => (d.documentId === docId ? { ...d, groundTruthStatus: 'REJECTED' } : d))
    );
  };

  const handleAddField = () => {
    if (!newFieldName || !selectedDocId) return;
    setDocuments((prev) =>
      prev.map((d) => {
        if (d.documentId !== selectedDocId) return d;
        return {
          ...d,
          fields: [
            ...d.fields,
            {
              fieldName: newFieldName.replace(/\s+/g, ''),
              fieldLabel: newFieldName,
              value: newFieldValue,
              confidence: 1.0,
              isEdited: true,
              isApproved: true,
            },
          ],
        };
      })
    );
    setNewFieldName('');
    setNewFieldValue('');
    setShowAddFieldForm(false);
  };

  const getConfidenceBadgeColor = (confidence: number) => {
    if (confidence >= 0.95) return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300';
    if (confidence >= 0.80) return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300';
    if (confidence >= 0.60) return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300';
    return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Platform Header & One-Click Benchmark Control */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-blue-300 font-medium text-xs mb-1">
            <Sparkles className="w-4 h-4" /> Human-in-the-Loop Scientific Annotation Platform
          </div>
          <h1 className="text-3xl font-bold tracking-tight">AI Research Dataset Platform</h1>
          <p className="text-slate-300 text-xs mt-1">
            AI extracts candidate fields; human verifiers inspect, edit, and approve Ground Truth records for reproducible benchmarking.
          </p>
        </div>

        {/* One-Click Benchmark Trigger */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-slate-300 font-medium">Dataset Health</div>
            <div className="text-sm font-bold text-white">
              {healthStats.completionPct}% Verified ({healthStats.verified}/{healthStats.total})
            </div>
          </div>
          <button
            disabled={!healthStats.isReady}
            onClick={() => alert('🚀 Launching Full 500-Document Benchmark Experiment...')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs shadow-lg transition-all ${
              healthStats.isReady
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600'
            }`}
          >
            <Play className="w-4 h-4" /> Run Benchmark
          </button>
        </div>
      </div>

      {/* Dataset Health & Shortcut Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow border border-slate-200 dark:border-slate-700">
          <div className="text-slate-400">Total Documents</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{healthStats.total}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow border border-slate-200 dark:border-slate-700">
          <div className="text-slate-400">Verified GTs</div>
          <div className="text-xl font-bold text-emerald-600 mt-0.5">{healthStats.verified}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow border border-slate-200 dark:border-slate-700">
          <div className="text-slate-400">Pending Review</div>
          <div className="text-xl font-bold text-amber-500 mt-0.5">{healthStats.unverifiedCount}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow border border-slate-200 dark:border-slate-700">
          <div className="text-slate-400">Est. Review Time</div>
          <div className="text-xl font-bold text-blue-600 mt-0.5">
            {Math.ceil(healthStats.remainingTimeSec / 60)} min
          </div>
        </div>
        <div className="col-span-2 bg-slate-100 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Keyboard Shortcuts
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              <span className="bg-white dark:bg-slate-800 px-1 py-0.5 rounded border">A</span> Approve |{' '}
              <span className="bg-white dark:bg-slate-800 px-1 py-0.5 rounded border">R</span> Reject |{' '}
              <span className="bg-white dark:bg-slate-800 px-1 py-0.5 rounded border">+ / -</span> Zoom
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace: Queue (1 col), Viewport (1 col), Inspector (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Priority Review Queue (3 cols) */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" /> Priority Review Queue
            </h3>
            <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold px-1.5 py-0.5 rounded">
              {documents.length}
            </span>
          </div>

          {/* Filters */}
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Search ID or filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
            <div className="flex gap-1 overflow-x-auto pb-1">
              {['ALL', 'MARKSHEET', 'CERTIFICATE', 'UNKNOWN'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-1 rounded text-[10px] font-semibold transition-all ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Document Queue List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {documents
              .filter(
                (d) =>
                  selectedCategory === 'ALL' || d.category === selectedCategory
              )
              .map((doc) => (
                <div
                  key={doc.documentId}
                  onClick={() => setSelectedDocId(doc.documentId)}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedDocId === doc.documentId
                      ? 'bg-blue-50/80 border-blue-500 dark:bg-blue-950/40 dark:border-blue-500 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {doc.documentId}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getConfidenceBadgeColor(
                        doc.classificationConfidence
                      )}`}
                    >
                      {(doc.classificationConfidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="font-medium text-slate-800 dark:text-slate-200 truncate mt-1 text-[11px]">
                    {doc.originalFilename}
                  </div>
                  <div className="flex justify-between items-center mt-2 text-[10px] text-slate-400">
                    <span>{doc.category}</span>
                    <span
                      className={
                        doc.groundTruthStatus === 'VERIFIED'
                          ? 'text-emerald-500 font-bold'
                          : 'text-amber-500'
                      }
                    >
                      {doc.groundTruthStatus}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Center: Document Viewport (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-200 dark:border-slate-700 p-4 flex flex-col justify-between space-y-3">
          {/* Viewport Toolbar */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <ScanSearch className="w-4 h-4 text-blue-500" /> Document Viewport
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoomLevel((z) => Math.max(z - 20, 60))}
                className="p-1 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono font-semibold">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(z + 20, 200))}
                className="p-1 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setRotationAngle((r) => (r + 90) % 360)}
                className="p-1 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 ml-1"
                title="Rotate 90°"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Viewport Canvas Placeholder */}
          <div className="flex-1 min-h-[420px] bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center p-4 relative overflow-hidden">
            {selectedDoc ? (
              <div
                style={{
                  transform: `scale(${zoomLevel / 100}) rotate(${rotationAngle}deg)`,
                  transition: 'transform 0.2s ease',
                }}
                className="bg-white dark:bg-slate-950 p-6 rounded-lg shadow-md border border-slate-300 dark:border-slate-800 max-w-sm text-center space-y-4"
              >
                <FileText className="w-12 h-12 mx-auto text-blue-500" />
                <div className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                  {selectedDoc.documentId} ({selectedDoc.canonicalFilename})
                </div>
                <div className="text-[11px] text-slate-500 font-mono bg-slate-50 dark:bg-slate-900 p-2 rounded text-left">
                  <div>Format: {selectedDoc.fileFormat.toUpperCase()}</div>
                  <div>Size: {(selectedDoc.fileSizeBytes / 1024).toFixed(1)} KB</div>
                  <div>Original: {selectedDoc.originalFilename}</div>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 text-xs">Select a document from the left queue to view</div>
            )}
          </div>

          {/* Viewport Footer Controls */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>Page {currentPage} of 1</span>
            <div className="flex gap-2">
              <button
                onClick={() => setShowHistoryModal(true)}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-500 font-medium"
              >
                <History className="w-3.5 h-3.5" /> Version History (v{selectedDoc?.version || 1})
              </button>
            </div>
          </div>
        </div>

        {/* Right: AI Extracted Fields & Ground Truth Inspector (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-800 rounded-2xl shadow border border-slate-200 dark:border-slate-700 p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Ground Truth Inspector
            </h3>
            {selectedDoc && (
              <span className="text-[10px] font-mono text-slate-400">
                Status: <strong className="text-emerald-500">{selectedDoc.groundTruthStatus}</strong>
              </span>
            )}
          </div>

          {selectedDoc ? (
            <div className="space-y-3">
              {/* Field Cards */}
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {selectedDoc.fields.map((field) => (
                  <div
                    key={field.fieldName}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {field.fieldLabel}
                      </label>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getConfidenceBadgeColor(
                          field.confidence
                        )}`}
                      >
                        {(field.confidence * 100).toFixed(0)}% Conf
                      </span>
                    </div>
                    <input
                      type="text"
                      value={String(field.value || '')}
                      onChange={(e) =>
                        handleFieldChange(selectedDoc.documentId, field.fieldName, e.target.value)
                      }
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                {selectedDoc.groundTruthStatus !== 'VERIFIED' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleApproveDocument(selectedDoc.documentId)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl font-bold text-xs shadow flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Check className="w-4 h-4" /> Approve (A)
                    </button>
                    <button
                      onClick={() => handleRejectDocument(selectedDoc.documentId)}
                      className="bg-red-600 hover:bg-red-500 text-white py-2 rounded-xl font-bold text-xs shadow flex items-center justify-center gap-1.5 transition-all"
                    >
                      <X className="w-4 h-4" /> Reject (R)
                    </button>
                  </div>
                ) : (
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-emerald-800 dark:text-emerald-300 p-2.5 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Ground Truth Verified
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">Select a document to inspect fields</div>
          )}
        </div>
      </div>
    </div>
  );
}

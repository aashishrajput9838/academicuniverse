'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Play,
  CheckCircle,
  FileText,
  Sliders,
  Settings,
  FolderPlus,
  ShieldCheck,
  Zap,
  ArrowRight,
  Database,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'MARKSHEET', label: 'Semester Marksheets' },
  { id: 'TRANSCRIPT', label: 'Consolidated Transcripts' },
  { id: 'CERTIFICATE', label: 'Degree & Skill Certificates' },
  { id: 'WORKSHOP_CERTIFICATE', label: 'Workshop Certificates' },
  { id: 'INTERNSHIP_CERTIFICATE', label: 'Internship Certificates' },
  { id: 'HACKATHON_CERTIFICATE', label: 'Hackathon Awards' },
  { id: 'TIMETABLE', label: 'Class Timetables' },
  { id: 'EXAM_TIMETABLE', label: 'Exam Date Sheets' },
  { id: 'ADMIT_CARD', label: 'Exam Admit Cards' },
  { id: 'FEE_RECEIPT', label: 'Fee Payment Receipts' },
  { id: 'STUDENT_ID', label: 'Student ID Cards' },
];

const TEMPLATES = [
  { id: 'TEMPLATE_A', name: 'Vivekananda Technical Univ (VTU)', color: 'bg-blue-900' },
  { id: 'TEMPLATE_B', name: 'Sri Ramanujan Inst of Tech (SRIT)', color: 'bg-emerald-800' },
  { id: 'TEMPLATE_C', name: 'National Inst of Eng & Sci (NIES)', color: 'bg-red-900' },
  { id: 'TEMPLATE_D', name: 'Indira Gandhi College of Eng (IGCE)', color: 'bg-purple-900' },
];

export default function SyntheticGeneratorPage() {
  const [count, setCount] = useState<number>(25);
  const [seed, setSeed] = useState<number>(42);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    CATEGORIES.map((c) => c.id)
  );
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>(
    TEMPLATES.map((t) => t.id)
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [generationResult, setGenerationResult] = useState<any>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const toggleCategory = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
    );
  };

  const toggleTemplate = (tempId: string) => {
    setSelectedTemplates((prev) =>
      prev.includes(tempId) ? prev.filter((t) => t !== tempId) : [...prev, tempId]
    );
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationResult(null);
    setImportMessage(null);

    try {
      const res = await fetch('/api/synthetic/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count,
          seed,
          categories: selectedCategories,
          templateIds: selectedTemplates,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGenerationResult(data);
      } else {
        alert(`Generation Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImport = async () => {
    if (!generationResult) return;
    setIsImporting(true);
    try {
      const res = await fetch('/api/synthetic/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outputDir: generationResult.outputDir }),
      });
      const data = await res.json();
      if (data.success) {
        setImportMessage(data.message);
      } else {
        alert(`Import Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-indigo-300 font-medium text-xs mb-1">
            <Sparkles className="w-4 h-4" /> Synthetic Document Generator & Ground Truth Pipeline
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Synthetic Dataset Generator</h1>
          <p className="text-slate-300 text-xs mt-1">
            Generate 100% reproducible, multi-category academic PDFs with perfect Ground Truth JSON for research benchmarking.
          </p>
        </div>

        <Link
          href="/dashboard/student/research-dataset"
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all self-start md:self-auto"
        >
          <Database className="w-4 h-4" /> Open Dataset Dashboard <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Main Grid: Controls vs Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Generation Controls (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow border border-slate-200 dark:border-slate-700 space-y-6">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm border-b border-slate-200 dark:border-slate-700 pb-3">
            <Sliders className="w-4 h-4 text-indigo-500" /> Dataset Configuration & Parameters
          </div>

          {/* Seed & Document Count Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Target Document Count
              </label>
              <div className="flex gap-2">
                {[25, 50, 100, 250, 500].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCount(n)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      count === n
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Random Seed (Reproducibility)
              </label>
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(parseInt(e.target.value, 10) || 42)}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Categories Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Include Document Categories ({selectedCategories.length}/{CATEGORIES.length})
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`p-2 rounded-lg text-[11px] font-medium text-left border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-500 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 opacity-60'
                    }`}
                  >
                    <span className="truncate">{cat.label}</span>
                    {isSelected && <CheckCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fictional Templates Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              University Templates ({selectedTemplates.length}/{TEMPLATES.length})
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEMPLATES.map((temp) => {
                const isSelected = selectedTemplates.includes(temp.id);
                return (
                  <button
                    key={temp.id}
                    type="button"
                    onClick={() => toggleTemplate(temp.id)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-white dark:bg-slate-900 border-indigo-500 text-slate-900 dark:text-white shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${temp.color}`} />
                      <span className="truncate text-[11px]">{temp.name}</span>
                    </div>
                    {isSelected && <CheckCircle className="w-4 h-4 text-indigo-500" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Output Directory Notice */}
          <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 space-y-1 font-mono">
            <div>Output Path: <strong className="text-slate-800 dark:text-slate-200">benchmarks/synthetic-dataset/</strong></div>
            <div className="text-[10px] text-slate-400">
              * Documents are saved independently in synthetic-dataset/ and NOT mixed into RAW until explicitly imported.
            </div>
          </div>

          {/* Generate Button */}
          <button
            disabled={isGenerating || selectedCategories.length === 0}
            onClick={handleGenerate}
            className={`w-full py-3.5 rounded-xl font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-all ${
              isGenerating
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/30'
            }`}
          >
            {isGenerating ? (
              <>
                <Zap className="w-4 h-4 animate-spin text-indigo-300" /> Generating {count} Synthetic PDFs & Ground Truth...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" /> Generate Dataset ({count} Documents, Seed {seed})
              </>
            )}
          </button>
        </div>

        {/* Right Column: Generation Results & Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Summary Card */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Generation Status & Manifest
              </h3>
              {generationResult && (
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                  PASSED
                </span>
              )}
            </div>

            {generationResult ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-slate-400 text-[10px]">Total Generated</div>
                    <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                      {generationResult.totalDocuments}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-slate-400 text-[10px]">Generation Time</div>
                    <div className="text-xl font-bold text-indigo-600 mt-0.5">
                      {(generationResult.report.generationDurationMs / 1000).toFixed(2)}s
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 font-mono text-[11px] bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>Seed: <strong className="text-indigo-600">{generationResult.report.experimentSeed}</strong></div>
                  <div>Manifest Hash: <span className="text-slate-600 dark:text-slate-400 truncate block">{generationResult.report.manifestHash}</span></div>
                  <div>Validation: <strong className="text-emerald-500">{generationResult.report.validationStatus}</strong></div>
                </div>

                {/* Import into Dataset Manager Action */}
                <div className="pt-2 space-y-2 border-t border-slate-200 dark:border-slate-700">
                  <button
                    disabled={isImporting}
                    onClick={handleImport}
                    className="w-full py-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md flex items-center justify-center gap-2 transition-all"
                  >
                    <FolderPlus className="w-4 h-4" /> Import into Dataset Manager
                  </button>

                  {importMessage && (
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-emerald-800 dark:text-emerald-300 rounded-xl text-center text-xs font-semibold">
                      {importMessage}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 space-y-3 text-slate-400">
                <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-xs">
                  Configure options on the left and click <strong>Generate Dataset</strong> to create synthetic documents.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

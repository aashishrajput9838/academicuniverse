'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileType, Check, Loader2, X, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { uploadTemplate, validateTemplate } from '@/components/Resume/api/templateApi';
import type { ValidationReport } from '@/components/Resume/types/api';
import { ValidationResultsPanel } from './ValidationResultsPanel';

interface TemplateUploadFormProps {
  onUploadSuccess?: () => void;
}

export function TemplateUploadForm({ onUploadSuccess }: TemplateUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [type, setType] = useState('global');
  const [target, setTarget] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  const validateAndSetFile = useCallback((selectedFile: File) => {
    if (
      !selectedFile.name.endsWith('.docx') &&
      selectedFile.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      toast({ title: 'Invalid File', description: 'Please upload a DOCX file.', variant: 'destructive' });
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast({ title: 'File Too Large', description: 'Max file size is 5MB.', variant: 'destructive' });
      return;
    }
    setFile(selectedFile);
    setValidationReport(null);
    setUploadSuccess(false);
  }, [toast]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  }, [validateAndSetFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  }, [validateAndSetFile]);

  const handleValidate = useCallback(async () => {
    if (!file || !templateName) {
      toast({ title: 'Missing Info', description: 'Please provide a template name and select a file.', variant: 'destructive' });
      return;
    }

    setIsValidating(true);
    setValidationReport(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const formData = new FormData();
      formData.append('templateFile', file);
      formData.append('templateName', templateName);
      formData.append('type', type);
      if (type !== 'global' && target) {
        formData.append('target', target);
      }

      const report = await validateTemplate(token, formData);
      setValidationReport(report);

      if (report.valid) {
        toast({ title: 'Validation Passed', description: 'Template is ready to upload.' });
      } else {
        toast({ title: 'Validation Failed', description: `${report.issues.filter((i) => i.severity === 'error').length} error(s) found. Please fix before uploading.`, variant: 'destructive' });
      }
    } catch (error: any) {
      toast({
        title: 'Validation Error',
        description: error.message || 'Could not validate template. Try again.',
        variant: 'destructive',
      });
    } finally {
      setIsValidating(false);
    }
  }, [file, templateName, type, target, toast]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !templateName) return;

    if (validationReport && !validationReport.valid) {
      toast({ title: 'Cannot Upload', description: 'Please fix validation errors before uploading.', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const formData = new FormData();
      formData.append('templateFile', file);
      formData.append('templateName', templateName);
      formData.append('type', type);
      if (type !== 'global' && target) {
        formData.append('target', target);
      }

      await uploadTemplate(token, formData);

      setUploadSuccess(true);
      toast({ title: 'Upload Success', description: 'Template uploaded successfully.' });

      setFile(null);
      setTemplateName('');
      setTarget('');
      setType('global');
      setValidationReport(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onUploadSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Upload Failed',
        description: error.message || 'Could not upload template. Try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [file, templateName, type, target, validationReport, toast, onUploadSuccess]);

  const hasErrors = validationReport ? validationReport.issues.some((i) => i.severity === 'error') : false;
  const canUpload = file && templateName && (!validationReport || validationReport.valid) && !isUploading;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">
            Template Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            required
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="e.g. 2024 CSE Standard Form"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Type</label>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              if (e.target.value === 'global') setTarget('');
            }}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="global">Global (All Students)</option>
            <option value="department">Specific Department</option>
            <option value="section">Specific Section</option>
          </select>
        </div>

        {type !== 'global' && (
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-300">
              Target <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder={type === 'department' ? 'e.g. CSE' : 'e.g. CSE-A'}
            />
          </div>
        )}
      </div>

      <div
        className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all ${
          dragActive ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-600 bg-slate-800/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-emerald-400' : 'text-slate-500'}`} />
        <h3 className="text-lg font-medium text-white mb-2">Drag and drop your template here</h3>
        <p className="text-slate-400 mb-6 text-sm">Supports DOCX (Microsoft Word), Max 5MB</p>

        {file && (
          <div className="bg-slate-900 p-4 rounded-xl flex items-center justify-between max-w-md mx-auto mb-6 border border-slate-700">
            <div className="flex items-center gap-3 overflow-hidden">
              <FileType className="w-6 h-6 text-blue-400 flex-shrink-0" />
              <span className="text-slate-200 truncate pr-4 text-sm">{file.name}</span>
            </div>
            <button
              type="button"
              onClick={() => { setFile(null); setValidationReport(null); setUploadSuccess(false); }}
              className="text-slate-400 hover:text-red-400 p-1 bg-slate-800 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex justify-center">
          <label className="cursor-pointer bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg border border-slate-500 transition font-medium text-sm">
            Browse Files
            <input
              type="file"
              className="hidden"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
            />
          </label>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleValidate}
          disabled={!file || !templateName || isValidating}
          className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition ${
            !file || !templateName
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
          }`}
        >
          {isValidating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Validating...
            </>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5" /> Validate Template
            </>
          )}
        </button>

        <button
          type="submit"
          disabled={!canUpload}
          className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition ${
            !canUpload
              ? 'bg-emerald-900/50 text-emerald-500/50 cursor-not-allowed'
              : hasErrors
                ? 'bg-red-900/50 text-red-400 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-900 shadow-lg shadow-emerald-500/20'
          }`}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Uploading...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" /> Upload Template
            </>
          )}
        </button>
      </div>

      {uploadSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-emerald-400 font-medium">
            <ShieldCheck className="w-5 h-5" />
            Template uploaded successfully
          </div>
          <p className="text-sm text-slate-400 mt-1">Processing Mode: Placeholder-First</p>
        </div>
      )}

      {validationReport && (
        <div className="border border-slate-700 rounded-xl p-4 bg-slate-900/50">
          <h3 className="text-sm font-medium text-slate-300 mb-3">Validation Results</h3>
          <ValidationResultsPanel report={validationReport} />
        </div>
      )}
    </form>
  );
}
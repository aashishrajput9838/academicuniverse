'use client';

import React, { useState } from 'react';
import { Upload, FileType, Check, Loader2, X, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import TemplateEditor, { TagMapping } from './TemplateEditor';

export default function TemplateUploadForm({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [type, setType] = useState('global');
  const [target, setTarget] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [editorMode, setEditorMode] = useState(true);

  const { toast } = useToast();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.docx') && selectedFile.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      toast({ title: 'Invalid File', description: 'Please upload a DOCX file.', variant: 'destructive' });
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast({ title: 'File Too Large', description: 'Max file size is 5MB.', variant: 'destructive' });
      return;
    }
    setFile(selectedFile);
  };

  const uploadTemplate = async (e?: React.FormEvent, customFile?: File, mappings?: TagMapping[]) => {
    if (e) e.preventDefault();
    const activeFile = customFile || file;
    if (!activeFile || !templateName) return;

    try {
      setIsUploading(true);
      const token = localStorage.getItem('authToken');
      
      const formData = new FormData();
      formData.append('templateFile', activeFile);
      formData.append('templateName', templateName);
      formData.append('type', type);
      formData.append('target', target);
      if (mappings && mappings.length > 0) {
        formData.append('mappings', JSON.stringify(mappings));
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
      const res = await fetch(`${baseUrl}/api/resume/templates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      toast({ title: 'Upload Success', description: 'Template has been successfully published.' });
      
      if (onUploadSuccess) onUploadSuccess();

      // Reset form
      setFile(null);
      setTemplateName('');
      setTarget('');
      setType('global');

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed', 
        description: error.message || 'Could not upload template. Try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-bold text-white">Upload New Template</h2>
          <p className="text-slate-400 text-sm">Create dynamic templates for your students to use.</p>
        </div>
        <button 
          onClick={() => setEditorMode(!editorMode)} 
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium border border-slate-700 transition flex items-center gap-2"
        >
          {editorMode ? "Use Quick Upload (Raw File)" : <><Sparkles className="w-4 h-4 text-emerald-400"/> Interactive Tag Editor</>}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-800/50 rounded-2xl border border-slate-700">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Template Name <span className="text-red-400">*</span></label>
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
          <label className="text-sm font-medium text-slate-300">Visibility Type</label>
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
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-300">Target Label <span className="text-red-400">*</span></label>
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

      {editorMode ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4">
          <div className="bg-indigo-900/30 border border-indigo-500/30 rounded-xl p-4 mb-6">
            <h4 className="text-indigo-400 font-semibold mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Interactive Mapping Engine
            </h4>
            <p className="text-sm text-slate-300">
              Upload an untagged DOCX file below. Highlight text such as "John Doe" or "University Name" to safely assign variables dynamically without modifying your original template manually.
            </p>
          </div>
          <TemplateEditor 
            onSave={(selectedFile, mappings) => uploadTemplate(undefined, selectedFile, mappings)} 
          />
        </div>
      ) : (
        <form onSubmit={uploadTemplate} className="animate-in fade-in pt-4">
          <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-xl p-6 mb-6">
            <h4 className="text-emerald-400 font-semibold mb-2 flex items-center gap-2">
              <FileType className="w-4 h-4" /> Quick Upload (Pre-Tagged)
            </h4>
            <p className="text-sm text-slate-300 mb-3">
              If your Word document already contains tags like <code className="bg-slate-900 text-emerald-300 px-2 py-0.5 rounded">{{name}}</code>, use this quick uploader.
            </p>
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
                <button type="button" onClick={() => setFile(null)} className="text-slate-400 hover:text-red-400 p-1 bg-slate-800 rounded-full">
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

          <div className="flex justify-end pt-6">
            <button 
              type="submit"
              disabled={!file || !templateName || isUploading}
              className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition ${
                !file || !templateName
                ? 'bg-emerald-900/50 text-emerald-500/50 cursor-not-allowed' 
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-900 shadow-lg shadow-emerald-500/20'
              }`}
            >
              {isUploading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Uploading...</>
              ) : (
                <><Check className="w-5 h-5" /> Publish Template</>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

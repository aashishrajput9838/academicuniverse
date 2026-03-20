'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, FileText, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Template {
  _id: string;
  templateName: string;
  type: string;
  target: string;
  fileUrl: string; // Ensure this is available
  uploadedBy: { name: string; email: string };
  createdAt: string;
}

export default function ResumeBuilder() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  
  const { toast } = useToast();
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${baseUrl}/api/resume/templates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch templates');
      const data = await res.json();
      setTemplates(data.data || []);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Could not load templates', variant: 'destructive' });
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleDownload = (fileUrl: string, templateName: string) => {
    if (!fileUrl) {
      toast({ title: 'Error', description: 'Download link not found', variant: 'destructive' });
      return;
    }
    // We can just open the Firebase URL in a new tab to trigger download
    window.open(fileUrl, '_blank');
  };

  return (
    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700 shadow-xl min-h-[500px]">
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">Available Resume Templates</h2>
          <p className="text-slate-400 text-sm">Download a template below and edit it locally using Microsoft Word or Google Docs.</p>
        </div>

        {loadingTemplates ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/50 rounded-xl">
            <p className="text-slate-400">No templates have been assigned to your department or section yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map(template => (
              <div
                key={template._id}
                className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-left flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center mb-4 text-emerald-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{template.templateName}</h3>
                  <p className="text-xs text-slate-400 mb-4 flex items-center gap-2">
                    <span className="bg-slate-900 px-2 py-1 rounded text-emerald-400">{template.type}</span>
                    {template.target && <span className="bg-slate-900 px-2 py-1 rounded text-blue-400">{template.target}</span>}
                  </p>
                  <p className="text-xs text-slate-500 mb-6">Uploaded By {template.uploadedBy?.name || 'Faculty'}</p>
                </div>
                
                <button 
                  onClick={() => handleDownload(template.fileUrl, template.templateName)}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-lg transition flex justify-center items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <Download className="w-4 h-4" /> Download DOCX
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

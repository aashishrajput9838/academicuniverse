'use client';

import React, { useEffect, useState } from 'react';
import { FileText, Loader2, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Template {
  _id: string;
  templateName: string;
  type: string;
  target: string;
  fileUrl: string;
  uploadedBy: { name: string; email: string };
  createdAt: string;
}

export default function TemplateList() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
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
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-800/30 rounded-2xl border border-slate-700/50">
        <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No templates found</h3>
        <p className="text-slate-400">You haven't uploaded any resume templates yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white mb-4">Your Uploaded Templates</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(template => (
          <a
            key={template._id}
            href={template.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-slate-800/80 border border-slate-700 rounded-xl p-5 hover:border-emerald-500/50 hover:bg-slate-800 transition relative group cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-900 transition-colors">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium px-2 py-1 bg-slate-900 rounded-md text-slate-300 capitalize group-hover:bg-slate-700 transition-colors">
                {template.type}
              </span>
            </div>
            
            <h3 className="text-lg font-bold text-white mb-1 truncate" title={template.templateName}>
              {template.templateName}
            </h3>
            
            <p className="text-sm text-slate-400 mb-4 flex items-center gap-2">
              {template.target && <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-xs">{template.target}</span>}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-slate-700/50 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(template.createdAt).toLocaleDateString()}
              </div>
              <span className="text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">Download / View</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

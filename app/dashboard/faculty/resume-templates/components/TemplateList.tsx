'use client';

import { useState, useEffect } from 'react';
import { fetchAllTemplates } from '@/components/Resume/api/templateApi';
import type { ResumeTemplateDTO } from '@/components/Resume/types/api';

interface TemplateListProps {
  refreshKey: number;
}

export function TemplateList({ refreshKey }: TemplateListProps) {
  const [templates, setTemplates] = useState<ResumeTemplateDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const data = await fetchAllTemplates(token);
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [refreshKey]);

  if (isLoading) {
    return (
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700">
        <p className="text-slate-400 text-center py-8">Loading templates...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700">
        <p className="text-red-400 text-center py-8">{error}</p>
        <button
          onClick={loadTemplates}
          className="mx-auto block bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700">
        <p className="text-slate-400 text-center py-8">No templates uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 rounded-2xl border border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-700">
          <thead>
            <tr className="bg-slate-800/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Template Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Target
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Upload Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {templates.map((template) => (
              <tr key={template._id} className="hover:bg-slate-800/30 transition">
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">
                  {template.templateName}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400 capitalize">
                  {template.type}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">
                  {template.target || '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">
                  {new Date(template.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

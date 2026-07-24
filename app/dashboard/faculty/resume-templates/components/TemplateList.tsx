'use client';

import { useState, useEffect } from 'react';
import { fetchAllTemplates, processTemplate } from '@/components/Resume/api/templateApi';
import type { ResumeTemplateDTO } from '@/components/Resume/types/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface TemplateListProps {
  refreshKey: number;
}

function getValidationStatusBadge(validationStatus?: string) {
  switch (validationStatus) {
    case 'valid':
      return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">Valid</span>;
    case 'invalid':
      return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Invalid</span>;
    case 'pending':
      return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">Pending</span>;
    default:
      return null;
  }
}

export function TemplateList({ refreshKey }: TemplateListProps) {
  const [templates, setTemplates] = useState<ResumeTemplateDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [processedMeta, setProcessedMeta] = useState<Record<string, { sections?: number; fields?: number }>>({});
  const { toast } = useToast();

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

  const handleProcess = async (templateId: string) => {
    setProcessingIds((prev) => new Set(prev).add(templateId));

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const result = await processTemplate(token, templateId);

      const sectionCount = result.sections?.length || 0;
      const fieldCount = result.sections?.reduce((sum, section) => sum + (section?.fields?.length || 0), 0) || 0;

      setProcessedMeta((prev) => ({
        ...prev,
        [templateId]: { sections: sectionCount, fields: fieldCount },
      }));

      toast({
        title: 'Processing Complete',
        description: `Extracted ${sectionCount} section${sectionCount !== 1 ? 's' : ''} and ${fieldCount} field${fieldCount !== 1 ? 's' : ''}.`,
      });

      await loadTemplates();
    } catch (err) {
      toast({
        title: 'Processing Failed',
        description: err instanceof Error ? err.message : 'Could not process template. Try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(templateId);
        return next;
      });
    }
  };

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
                Mode
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Validation
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Upload Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {templates.map((template) => {
              const isProcessing = processingIds.has(template._id);
              const meta = processedMeta[template._id];
              const isPlaceholderFirst = template.processingMode === 'placeholder-first';
              const validationStatus = template.validationStatus;

              return (
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
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                      isPlaceholderFirst
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-700 text-slate-400'
                    }`}>
                      {isPlaceholderFirst ? 'Placeholder-First' : 'Legacy'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    {getValidationStatusBadge(validationStatus)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">
                    {new Date(template.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    {meta ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        {meta.sections} section{meta.sections !== 1 ? 's' : ''}, {meta.fields} field{meta.fields !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-slate-500">Not processed</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => handleProcess(template._id)}
                      disabled={isProcessing}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        isProcessing
                          ? 'bg-slate-700 text-slate-400 cursor-wait'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-900'
                      }`}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>Process</>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
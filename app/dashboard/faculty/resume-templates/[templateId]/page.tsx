'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { fetchAllTemplates, processTemplate } from '@/components/Resume/api/templateApi';
import type { ResumeTemplateDTO } from '@/components/Resume/types/api';
import { useToast } from '@/hooks/use-toast';
import { ValidationResultsPanel } from '../components/ValidationResultsPanel';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, AlertTriangle, ShieldCheck, Clock, Tag, FolderOpen } from 'lucide-react';

export default function TemplateDetailsPage() {
  const params = useParams();
  const templateId = params.templateId as string;
  const [template, setTemplate] = useState<ResumeTemplateDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [processedMeta, setProcessedMeta] = useState<Record<string, { sections?: number; fields?: number }>>({});
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('Authentication required');
        const data = await fetchAllTemplates(token);
        const found = data.find((t) => t._id === templateId);
        if (!found) {
          setError('Template not found.');
        } else {
          setTemplate(found);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load template');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [templateId]);

  const handleProcess = async () => {
    if (!template) return;
    setProcessingIds((prev) => new Set(prev).add(template._id));

    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Authentication required');

      const result = await processTemplate(token, template._id);

      const sectionCount = result.sections?.length || 0;
      const fieldCount = result.sections?.reduce((sum, section) => sum + (section?.fields?.length || 0), 0) || 0;

      setProcessedMeta((prev) => ({
        ...prev,
        [template._id]: { sections: sectionCount, fields: fieldCount },
      }));

      toast({
        title: 'Processing Complete',
        description: `Extracted ${sectionCount} section${sectionCount !== 1 ? 's' : ''} and ${fieldCount} field${fieldCount !== 1 ? 's' : ''}.`,
      });

      const updated = await fetchAllTemplates(token!);
      const found = updated.find((t) => t._id === templateId);
      if (found) setTemplate(found);
    } catch (err) {
      toast({
        title: 'Processing Failed',
        description: err instanceof Error ? err.message : 'Could not process template. Try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(template._id);
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700">
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading template details...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => window.location.href = '/dashboard/faculty/resume-templates'}
          className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition"
        >
          Back to Templates
        </button>
      </div>
    );
  }

  if (!template) return null;

  const isPlaceholderFirst = template.processingMode === 'placeholder-first';
  const meta = processedMeta[template._id];
  const validationStatus = template.validationStatus;

  const statusConfig = {
    valid: { color: 'emerald', label: 'Valid', icon: CheckCircle },
    invalid: { color: 'red', label: 'Invalid', icon: XCircle },
    pending: { color: 'amber', label: 'Pending', icon: Clock },
    deprecated: { color: 'slate', label: 'Deprecated', icon: XCircle },
  };
  const status = statusConfig[validationStatus as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{template.templateName}</h1>
        <button
          onClick={() => window.location.href = '/dashboard/faculty/resume-templates'}
          className="text-sm text-slate-400 hover:text-white transition"
        >
          &larr; Back to Templates
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Template Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Tag className="w-4 h-4 text-slate-500" />
              <span className="text-slate-300 capitalize">{template.type}</span>
              {template.target && <span className="text-slate-500">/ {template.target}</span>}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FolderOpen className="w-4 h-4 text-slate-500" />
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                isPlaceholderFirst
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-slate-700 text-slate-400'
              }`}>
                {isPlaceholderFirst ? 'Placeholder-First' : 'Legacy'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <StatusIcon className={`w-4 h-4 text-${status.color}-400`} />
              <span className={`text-${status.color}-400`}>{status.label}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Clock className="w-4 h-4" />
              {new Date(template.createdAt).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Validation Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {template.validationReport ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-slate-400">Total Placeholders</div>
                  <div className="text-white font-medium">{template.validationReport.summary.total}</div>
                  <div className="text-slate-400">Unique</div>
                  <div className="text-white font-medium">{template.validationReport.summary.unique}</div>
                  <div className="text-slate-400">Duplicates</div>
                  <div className="text-amber-400 font-medium">{template.validationReport.summary.duplicates}</div>
                  <div className="text-slate-400">Missing Required</div>
                  <div className="text-red-400 font-medium">{template.validationReport.summary.missingRequired.length}</div>
                  <div className="text-slate-400">Unknown</div>
                  <div className="text-amber-400 font-medium">{template.validationReport.summary.unknown.length}</div>
                  <div className="text-slate-400">Misspelled</div>
                  <div className="text-amber-400 font-medium">{template.validationReport.summary.misspelled.length}</div>
                  <div className="text-slate-400">Reserved Conflicts</div>
                  <div className="text-red-400 font-medium">{template.validationReport.summary.reservedConflicts.length}</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No validation report available.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Processing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {meta ? (
              <div className="text-sm">
                <p className="text-emerald-400 font-medium">{meta.sections} section{meta.sections !== 1 ? 's' : ''}</p>
                <p className="text-slate-400">{meta.fields} field{meta.fields !== 1 ? 's' : ''} extracted</p>
              </div>
            ) : (
              <button
                onClick={handleProcess}
                disabled={processingIds.has(template._id)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg font-medium transition disabled:opacity-50"
              >
                {processingIds.has(template._id) ? 'Processing...' : 'Process Template'}
              </button>
            )}
          </CardContent>
        </Card>
      </div>

      {template.validationReport && (
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Validation Report</CardTitle>
          </CardHeader>
          <CardContent>
            <ValidationResultsPanel report={template.validationReport} />
          </CardContent>
        </Card>
      )}

      {template.questions && template.questions.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Template Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {template.questions.map((q, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className="text-slate-400 font-mono">{'{{' + q.tag + '}}'}</span>
                  <span className="text-slate-200">{q.question}</span>
                  <span className="text-xs text-slate-500 capitalize">{q.type}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
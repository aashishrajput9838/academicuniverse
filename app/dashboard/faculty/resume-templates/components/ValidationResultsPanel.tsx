'use client';

import { ValidationReport } from '@/components/Resume/types/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lightbulb,
  Info,
  Hash,
  AlertCircle,
  SpellCheck,
  ShieldAlert,
} from 'lucide-react';
import type { ValidationIssue } from '@/components/Resume/types/api';

interface ValidationResultsPanelProps {
  report: ValidationReport;
}

function getStatusConfig(report: ValidationReport) {
  const hasErrors = report.issues.some((i) => i.severity === 'error');
  const hasWarnings = report.issues.some((i) => i.severity === 'warning');

  if (hasErrors) {
    return {
      label: 'Validation Failed',
      color: 'destructive',
      icon: XCircle,
      uploadDisabled: true,
      bannerVariant: 'destructive' as const,
    };
  }
  if (hasWarnings) {
    return {
      label: 'Warnings Found',
      color: 'secondary',
      icon: AlertTriangle,
      uploadDisabled: false,
      bannerVariant: 'default' as const,
    };
  }
  return {
    label: 'Ready to Upload',
    color: 'default',
    icon: CheckCircle2,
    uploadDisabled: false,
    bannerVariant: 'default' as const,
  };
}

function SeverityIcon({ severity }: { severity: string }) {
  switch (severity) {
    case 'error':
      return <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />;
    case 'info':
      return <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />;
    default:
      return <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />;
  }
}

function IssueCard({ issue }: { issue: ValidationIssue }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
      <SeverityIcon severity={issue.severity} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200 font-medium">{issue.message}</p>
        {issue.placeholder && (
          <p className="text-xs text-slate-400 font-mono mt-0.5">{issue.placeholder}</p>
        )}
        {issue.suggestion && (
          <p className="text-xs text-emerald-400 mt-1">{issue.suggestion}</p>
        )}
      </div>
      <Badge
        variant={
          issue.severity === 'error'
            ? ('destructive' as const)
            : issue.severity === 'warning'
              ? ('secondary' as const)
              : ('outline' as const)
        }
        className="text-[10px] uppercase"
      >
        {issue.code}
      </Badge>
    </div>
  );
}

export function ValidationResultsPanel({ report }: ValidationResultsPanelProps) {
  const status = getStatusConfig(report);
  const StatusIcon = status.icon;

  const severityCounts = {
    error: report.issues.filter((i) => i.severity === 'error').length,
    warning: report.issues.filter((i) => i.severity === 'warning').length,
    info: report.issues.filter((i) => i.severity === 'info').length,
  };

  return (
    <div className="space-y-4">
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <StatusIcon className="w-5 h-5" />
              Validation Status
            </CardTitle>
<Badge variant={status.color as 'default' | 'destructive' | 'secondary' | 'outline' | null} className="text-sm">
               {status.label}
             </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">{report.summary.total}</p>
              <p className="text-xs text-slate-400">Total Placeholders</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">{report.summary.unique}</p>
              <p className="text-xs text-slate-400">Unique</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-amber-400">{report.summary.duplicates}</p>
              <p className="text-xs text-slate-400">Duplicates</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-400">{report.summary.missingRequired.length}</p>
              <p className="text-xs text-slate-400">Missing Required</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-amber-400">{report.summary.unknown.length}</p>
              <p className="text-xs text-slate-400">Unknown</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {status.bannerVariant === 'destructive' && (
        <Alert variant="destructive">
          <AlertTitle className="flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Validation Failed
          </AlertTitle>
          <AlertDescription>
            {severityCounts.error} error{severityCounts.error !== 1 ? 's' : ''} and {severityCounts.warning} warning{severityCounts.warning !== 1 ? 's' : ''} found. Please fix the issues below before uploading.
          </AlertDescription>
        </Alert>
      )}

      {status.bannerVariant !== 'destructive' && severityCounts.warning > 0 && (
        <Alert>
          <AlertTitle className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Warnings Found
          </AlertTitle>
          <AlertDescription>
            {severityCounts.warning} warning{severityCounts.warning !== 1 ? 's' : ''} detected. You can still upload, but consider addressing these issues.
          </AlertDescription>
        </Alert>
      )}

      {status.bannerVariant !== 'destructive' && severityCounts.warning === 0 && (
        <Alert>
          <AlertTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            All Clear
          </AlertTitle>
          <AlertDescription>
            No issues found. Your template is ready to upload.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Detected Placeholders ({report.placeholders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {report.placeholders.length === 0 ? (
              <p className="text-sm text-slate-400">No placeholders detected.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {report.placeholders.map((ph, i) => (
                  <Badge key={i} variant="secondary" className="text-xs font-mono">
                    {ph.raw}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Issues ({report.issues.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {report.issues.length === 0 ? (
              <p className="text-sm text-slate-400">No issues found.</p>
            ) : (
              <div className="space-y-2">
                {report.issues.map((issue, i) => (
                  <IssueCard key={i} issue={issue} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(report.summary.missingRequired.length > 0 || report.summary.misspelled.length > 0 || report.summary.reservedConflicts.length > 0) && (
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {report.summary.missingRequired.map((key) => (
                <li key={`missing-${key}`} className="flex items-center gap-2 text-slate-300">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  Add <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono text-emerald-400">{'{{' + key + '}}'}</code> to the appropriate section.
                </li>
              ))}
              {report.summary.misspelled.map((key) => (
                <li key={`misspelled-${key}`} className="flex items-center gap-2 text-slate-300">
                  <SpellCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  Placeholder <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">{key}</code> may be misspelled. Check canonical field names.
                </li>
              ))}
              {report.summary.reservedConflicts.map((key) => (
                <li key={`reserved-${key}`} className="flex items-center gap-2 text-slate-300">
                  <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">{key}</code> conflicts with a reserved docxtemplater word. Rename it.
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
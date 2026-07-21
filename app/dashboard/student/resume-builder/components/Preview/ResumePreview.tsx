'use client';

import { ExportActions } from './ExportActions';

interface ResumePreviewProps {
  htmlPreview: string;
  onDownloadDocx: () => void;
  onDownloadPdf: () => void;
  isDownloadingDocx?: boolean;
  isDownloadingPdf?: boolean;
  downloadError?: string | null;
  pdfDownloadError?: string | null;
  onRetryDocx?: () => void;
  onRetryPdf?: () => void;
  title?: string;
}

export function ResumePreview({
  htmlPreview,
  onDownloadDocx,
  onDownloadPdf,
  isDownloadingDocx = false,
  isDownloadingPdf = false,
  downloadError,
  pdfDownloadError,
  onRetryDocx,
  onRetryPdf,
  title = 'Resume Preview',
}: ResumePreviewProps) {
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-2xl">
      <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center gap-2">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-400" />
          <span className="w-3 h-3 rounded-full bg-yellow-400" />
          <span className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <span className="text-xs text-slate-500 ml-2">{title}</span>
      </div>
      <iframe
        srcDoc={htmlPreview}
        sandbox="allow-same-origin allow-scripts"
        title={title}
        className="w-full h-[600px] border-0"
      />
      <ExportActions
        onDownloadDocx={onDownloadDocx}
        onDownloadPdf={onDownloadPdf}
        isDownloadingDocx={isDownloadingDocx}
        isDownloadingPdf={isDownloadingPdf}
        downloadError={downloadError}
        pdfDownloadError={pdfDownloadError}
        onRetryDocx={onRetryDocx}
        onRetryPdf={onRetryPdf}
      />
    </div>
  );
}

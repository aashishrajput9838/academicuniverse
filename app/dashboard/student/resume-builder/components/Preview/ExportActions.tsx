'use client';

interface ExportActionsProps {
  onDownloadDocx: () => void;
  onDownloadPdf: () => void;
  isDownloadingDocx?: boolean;
  isDownloadingPdf?: boolean;
  downloadError?: string | null;
  pdfDownloadError?: string | null;
  onRetryDocx?: () => void;
  onRetryPdf?: () => void;
}

export function ExportActions({
  onDownloadDocx,
  onDownloadPdf,
  isDownloadingDocx = false,
  isDownloadingPdf = false,
  downloadError,
  pdfDownloadError,
  onRetryDocx,
  onRetryPdf,
}: ExportActionsProps) {
  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onDownloadDocx}
          disabled={isDownloadingDocx}
          className="px-4 py-3 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isDownloadingDocx ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Downloading...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download DOCX
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onDownloadPdf}
          disabled={isDownloadingPdf}
          className="px-4 py-3 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isDownloadingPdf ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Download PDF
            </>
          )}
        </button>
      </div>
      {(downloadError || pdfDownloadError) && (
        <div className="space-y-2">
          {downloadError && (
            <div className="flex items-center justify-between bg-red-500/10 border border-red-500/50 rounded-lg px-4 py-2">
              <span className="text-xs text-red-400">{downloadError}</span>
              {onRetryDocx && (
                <button
                  type="button"
                  onClick={onRetryDocx}
                  className="text-xs text-emerald-400 hover:text-emerald-300 underline"
                >
                  Retry
                </button>
              )}
            </div>
          )}
          {pdfDownloadError && (
            <div className="flex items-center justify-between bg-red-500/10 border border-red-500/50 rounded-lg px-4 py-2">
              <span className="text-xs text-red-400">{pdfDownloadError}</span>
              {onRetryPdf && (
                <button
                  type="button"
                  onClick={onRetryPdf}
                  className="text-xs text-emerald-400 hover:text-emerald-300 underline"
                >
                  Retry
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

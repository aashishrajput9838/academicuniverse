'use client';

interface ExportActionsProps {
  onDownload: () => void;
  isDownloading?: boolean;
  downloadError?: string | null;
  onRetryDownload?: () => void;
}

export function ExportActions({
  onDownload,
  isDownloading = false,
  downloadError,
  onRetryDownload,
}: ExportActionsProps) {
  return (
    <div className="mt-4 space-y-2">
      <button
        type="button"
        onClick={onDownload}
        disabled={isDownloading}
        className="w-full px-4 py-3 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isDownloading ? (
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
      {downloadError && (
        <div className="flex items-center justify-between bg-red-500/10 border border-red-500/50 rounded-lg px-4 py-2">
          <span className="text-xs text-red-400">{downloadError}</span>
          {onRetryDownload && (
            <button
              type="button"
              onClick={onRetryDownload}
              className="text-xs text-emerald-400 hover:text-emerald-300 underline"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}

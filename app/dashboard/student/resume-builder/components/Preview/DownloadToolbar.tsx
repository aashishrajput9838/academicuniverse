'use client';

interface DownloadToolbarProps {
  onBackToForm: () => void;
  isGenerating?: boolean;
  isDownloading?: boolean;
  downloadError?: string | null;
  onRetryDownload?: () => void;
}

export function DownloadToolbar({
  onBackToForm,
  isGenerating = false,
  isDownloading = false,
  downloadError,
  onRetryDownload,
}: DownloadToolbarProps) {
  return (
    <div className="flex items-center justify-between bg-slate-800/50 p-4 rounded-xl border border-slate-700">
      <div>
        <h2 className="text-lg font-semibold text-white">Preview</h2>
        <p className="text-sm text-slate-400">Review your generated resume below</p>
      </div>
      <div className="flex items-center gap-3">
        {downloadError && (
          <span className="text-xs text-red-400">{downloadError}</span>
        )}
        <button
          type="button"
          onClick={onBackToForm}
          disabled={isGenerating || isDownloading}
          className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600"
        >
          Back to Form
        </button>
      </div>
    </div>
  );
}

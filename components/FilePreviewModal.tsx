import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, AlertCircle } from 'lucide-react';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string | null;
  title?: string;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ isOpen, onClose, fileUrl, title }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Determine the best way to open the file based on its extension or just fallback to Google Docs Viewer.
  // Google Docs viewer is excellent for PDFs and Excel formats.
  const getViewerUrl = (url: string) => {
    // If the URL is already a google doc or handled, we can just return it.
    // For Firebase Storage links, using the Google Docs gview proxy is the most reliable way 
    // to preview .xls and .xlsx without forcing a download.
    return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
  };

  if (!fileUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-w-[95vw] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl">
        <DialogHeader className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between">
            <span>{title || 'File Preview'}</span>
            {fileUrl && (
              <a 
                href={fileUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="text-sm font-normal text-indigo-600 dark:text-indigo-400 hover:underline px-3 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/30 transition-colors"
                title="Open in new tab if preview fails"
              >
                Open Original
              </a>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 w-full bg-slate-100 dark:bg-slate-950 relative">
          {loading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 z-10">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-4" />
              <p className="text-slate-600 dark:text-slate-400 font-medium animate-pulse">
                Loading document preview...
              </p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 z-20">
              <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border border-red-200 dark:border-red-800 text-center max-w-md">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Preview Unavailable
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                  The document viewer couldn't load this file format natively, or the link has expired.
                </p>
                <a 
                  href={fileUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Download / Open Directly
                </a>
              </div>
            </div>
          )}

          <iframe
            src={getViewerUrl(fileUrl)}
            className="w-full h-full border-0"
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
            title="Document Viewer"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilePreviewModal;

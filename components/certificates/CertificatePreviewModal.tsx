'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ExternalLink,
  ShieldCheck,
  Award,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { getIssuerBrand } from '@/utils/issuerLogos';

export interface CertificatePreviewData {
  title: string;
  issuer: string;
  issuedDate?: string;
  credentialId?: string;
  rawConfidence?: number;
  fileUrl?: string;
  thumbnailUrl?: string;
  processingId?: string;
  status?: string;
}

interface CertificatePreviewModalProps {
  certificate: CertificatePreviewData | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CertificatePreviewModal: React.FC<CertificatePreviewModalProps> = ({
  certificate,
  isOpen,
  onClose,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !certificate) return null;

  const brand = getIssuerBrand(certificate.issuer);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const fullFileUrl = certificate.fileUrl
    ? certificate.fileUrl.startsWith('http')
      ? certificate.fileUrl
      : `${apiBase}${certificate.fileUrl}`
    : null;

  const fullThumbUrl = certificate.thumbnailUrl
    ? certificate.thumbnailUrl.startsWith('http')
      ? certificate.thumbnailUrl
      : `${apiBase}${certificate.thumbnailUrl}`
    : null;

  const mediaSource = fullFileUrl || fullThumbUrl;

  const handleDownload = () => {
    if (!mediaSource) return;
    const link = document.createElement('a');
    link.href = mediaSource;
    link.download = `${certificate.title.replace(/[^a-zA-Z0-9]/g, '_')}_Certificate`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md transition-all duration-300 animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cert-modal-title"
    >
      <div
        className="relative w-full max-w-5xl h-[88vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:px-6 bg-slate-900/90 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${brand.iconBg} flex items-center justify-center text-white shadow-md font-bold text-sm shrink-0`}>
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 id="cert-modal-title" className="font-bold text-base sm:text-lg text-white leading-tight">
                  {certificate.title}
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Issued by <span className="text-slate-200 font-medium">{certificate.issuer}</span>
                {certificate.issuedDate && certificate.issuedDate !== '1970-01-01T00:00:00.000Z' && (
                  <span className="ml-2 text-slate-500">
                    • {new Date(certificate.issuedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Rotate"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition flex items-center gap-1 text-xs px-3"
              title="Download File"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition ml-1"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Preview Area */}
        <div className="flex-1 bg-slate-950 p-4 sm:p-8 overflow-auto flex items-center justify-center relative select-none">
          {mediaSource && !imageError ? (
            <div
              className="transition-transform duration-200 flex items-center justify-center max-w-full max-h-full"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
              }}
            >
              {/* If PDF, use iframe / embed, otherwise img */}
              {certificate.mimeType === 'application/pdf' ? (
                <iframe
                  src={`${mediaSource}#toolbar=0`}
                  className="w-[800px] h-[550px] rounded-xl border border-slate-800 shadow-2xl bg-white"
                  title={certificate.title}
                />
              ) : (
                <img
                  src={mediaSource}
                  alt={certificate.title}
                  onError={() => setImageError(true)}
                  className="max-h-[70vh] max-w-[85vw] object-contain rounded-xl shadow-2xl border border-slate-800/80"
                />
              )}
            </div>
          ) : (
            <div className="text-center p-8 max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4 text-emerald-400 border border-slate-700">
                <Award className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">{certificate.title}</h4>
              <p className="text-sm text-slate-400 mb-4">
                Verified certificate record issued by {certificate.issuer}.
              </p>
              <button
                onClick={handleDownload}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Original Asset
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="p-3 px-6 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            {certificate.credentialId && (
              <span className="font-mono text-slate-300 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                ID: {certificate.credentialId}
              </span>
            )}
            {certificate.rawConfidence && (
              <span className="text-emerald-400 font-semibold">
                AI Confidence: {Math.round(certificate.rawConfidence * 100)}%
              </span>
            )}
          </div>
          <span className="text-slate-500">Press ESC or click outside to close</span>
        </div>
      </div>
    </div>
  );
};

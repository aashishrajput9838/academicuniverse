'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ShieldCheck,
  Award,
  Sparkles,
  Calendar,
  Copy,
  Check,
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
  mimeType?: string;
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
  const [imageError, setImageError] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Reset state when certificate changes
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setImageError(false);
      setCopiedId(false);
      // Trigger entrance animation
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [isOpen, certificate]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(z + 0.25, 3));
      if (e.key === '-') setZoom((z) => Math.max(z - 0.25, 0.5));
      if (e.key === 'r') setRotation((r) => (r + 90) % 360);
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !certificate) return null;

  const brand = getIssuerBrand(certificate.issuer);
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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

  // Prefer full file for modal preview, fall back to thumbnail
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

  const handleCopyId = () => {
    if (certificate.credentialId) {
      navigator.clipboard.writeText(certificate.credentialId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 transition-all duration-300 ${
        isVisible ? 'bg-slate-950/90 backdrop-blur-lg' : 'bg-slate-950/0 backdrop-blur-none'
      }`}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cert-modal-title"
    >
      <div
        className={`relative w-full max-w-5xl h-[90vh] bg-slate-900/95 border border-slate-700/60 rounded-2xl shadow-2xl shadow-slate-950/80 flex flex-col overflow-hidden text-white transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Modal Header ─── */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900/95 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Issuer Brand Icon */}
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${brand.iconBg} flex items-center justify-center text-white shadow-lg shrink-0`}
            >
              <Award className="w-5 h-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  id="cert-modal-title"
                  className="font-bold text-base sm:text-lg text-white leading-tight truncate"
                >
                  {certificate.title}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 backdrop-blur-md shrink-0">
                  <ShieldCheck className="w-3 h-3" />
                  Verified
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                <span>
                  Issued by{' '}
                  <span className={`font-semibold ${brand.badgeText}`}>{certificate.issuer}</span>
                </span>
                {certificate.issuedDate &&
                  certificate.issuedDate !== '1970-01-01T00:00:00.000Z' && (
                    <span className="flex items-center gap-1 text-slate-500">
                      <Calendar className="w-3 h-3" />
                      {new Date(certificate.issuedDate).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  )}
                {typeof certificate.rawConfidence === 'number' &&
                  certificate.rawConfidence > 0 && (
                    <span className="flex items-center gap-1 text-amber-400">
                      <Sparkles className="w-3 h-3" />
                      {Math.round(certificate.rawConfidence * 100)}% Match
                    </span>
                  )}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 shrink-0 ml-3">
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Zoom In (+)"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Zoom Out (-)"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Rotate (R)"
              aria-label="Rotate"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-slate-700/60 mx-1" />

            <button
              onClick={handleDownload}
              className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors flex items-center gap-1.5 text-xs shadow-lg shadow-emerald-950/40"
              title="Download Certificate"
              aria-label="Download"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-red-600/80 text-slate-400 hover:text-white transition-colors ml-1"
              title="Close (Esc)"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ─── Main Certificate Preview Area ─── */}
        <div className="flex-1 bg-slate-950 overflow-auto flex items-center justify-center relative select-none p-4 sm:p-8">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {mediaSource && !imageError ? (
            <div
              className="transition-transform duration-300 ease-out flex items-center justify-center"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
              }}
            >
              <img
                src={mediaSource}
                alt={`${certificate.title} — Certificate issued by ${certificate.issuer}`}
                onError={() => setImageError(true)}
                className="max-h-[72vh] max-w-[85vw] object-contain rounded-xl shadow-2xl shadow-slate-950/60 border border-slate-800/60 bg-white"
                style={{ imageRendering: 'auto' }}
              />
            </div>
          ) : (
            /* Fallback when no media available */
            <div className="text-center p-8 max-w-md relative z-10">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-emerald-950/20">
                <Award className="w-10 h-10 text-emerald-400" />
              </div>
              <h4 className="text-xl font-bold text-white mb-2">{certificate.title}</h4>
              <p className="text-sm text-slate-400 mb-1">
                Verified credential issued by{' '}
                <span className="text-slate-200 font-medium">{certificate.issuer}</span>
              </p>
              <p className="text-xs text-slate-500 mb-6">
                The certificate document preview is currently unavailable. Download the original
                asset below.
              </p>
              <button
                onClick={handleDownload}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition inline-flex items-center gap-2 shadow-lg shadow-emerald-950/40"
              >
                <Download className="w-4 h-4" />
                Download Original Certificate
              </button>
            </div>
          )}
        </div>

        {/* ─── Modal Footer ─── */}
        <div className="px-5 py-3 bg-slate-900/95 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-3">
            {certificate.credentialId && (
              <button
                onClick={handleCopyId}
                className="flex items-center gap-1.5 font-mono text-slate-300 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700 hover:border-emerald-500/50 transition-colors cursor-pointer"
                title="Click to copy Credential ID"
              >
                {copiedId ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-slate-500" />
                )}
                <span>ID: {certificate.credentialId}</span>
              </button>
            )}
            {typeof certificate.rawConfidence === 'number' && certificate.rawConfidence > 0 && (
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI Confidence: {Math.round(certificate.rawConfidence * 100)}%
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <span className="hidden sm:inline">Zoom: {Math.round(zoom * 100)}%</span>
            <span>Press ESC or click outside to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};

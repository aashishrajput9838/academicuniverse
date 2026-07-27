'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Award,
  ShieldCheck,
  Eye,
  Download,
  ExternalLink,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
  FileCheck2,
} from 'lucide-react';
import { getIssuerBrand } from '@/utils/issuerLogos';
import { CertificatePreviewModal, CertificatePreviewData } from './CertificatePreviewModal';

export interface CertificateItem {
  id?: string;
  title: string;
  issuer: string;
  issuedDate?: string;
  status?: string;
  rawConfidence?: number;
  credentialId?: string;
  sourceDocumentId?: string;
  processingId?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  mimeType?: string;
  fileName?: string;
}

interface CertificateThumbnailGalleryProps {
  certificates: CertificateItem[];
  isLoading?: boolean;
}

export const CertificateThumbnailGallery: React.FC<CertificateThumbnailGalleryProps> = ({
  certificates,
  isLoading = false,
}) => {
  const [selectedCert, setSelectedCert] = useState<CertificatePreviewData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const handleOpenPreview = (cert: CertificateItem) => {
    setSelectedCert({
      title: cert.title,
      issuer: cert.issuer,
      issuedDate: cert.issuedDate,
      credentialId: cert.credentialId,
      rawConfidence: cert.rawConfidence,
      fileUrl: cert.fileUrl,
      thumbnailUrl: cert.thumbnailUrl,
      processingId: cert.processingId,
      status: cert.status,
    });
    setIsModalOpen(true);
  };

  const handleCopyCredential = (idStr: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(idStr);
    setCopiedId(idStr);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleImageError = (certId: string) => {
    setFailedImages((prev) => ({ ...prev, [certId]: true }));
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 space-y-3">
            <div className="w-full h-36 bg-slate-800/80 rounded-xl" />
            <div className="h-4 bg-slate-800 rounded w-3/4" />
            <div className="h-3 bg-slate-800/60 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (!certificates || certificates.length === 0) {
    return (
      <div className="p-8 bg-slate-900/40 rounded-2xl border border-slate-800/80 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
          <Award className="w-7 h-7" />
        </div>
        <h3 className="text-white font-bold text-base mb-1">No Verified Certificates Yet</h3>
        <p className="text-slate-400 text-xs mb-4 max-w-md mx-auto">
          Upload course certificates, workshop credentials, or hackathon awards via Growth Hub to feature visual previews on your profile.
        </p>
        <Link
          href="/dashboard/student/growth?upload=certificate"
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition inline-flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
        >
          <span>Upload First Certificate</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {certificates.map((cert, index) => {
          const certKey = cert.id || `cert-${index}`;
          const brand = getIssuerBrand(cert.issuer);

          const fullThumb = cert.thumbnailUrl
            ? cert.thumbnailUrl.startsWith('http')
              ? cert.thumbnailUrl
              : `${apiBase}${cert.thumbnailUrl}`
            : null;

          const fullFile = cert.fileUrl
            ? cert.fileUrl.startsWith('http')
              ? cert.fileUrl
              : `${apiBase}${cert.fileUrl}`
            : null;

          const hasImage = fullThumb && !failedImages[certKey];

          return (
            <div
              key={certKey}
              className="group relative bg-slate-900/70 hover:bg-slate-900 rounded-2xl border border-slate-800 hover:border-slate-700/80 transition-all duration-300 flex flex-col overflow-hidden shadow-lg hover:shadow-xl hover:shadow-emerald-950/10"
            >
              {/* Card Header Thumbnail Container */}
              <div
                className="relative w-full h-40 bg-slate-950 overflow-hidden cursor-pointer flex items-center justify-center border-b border-slate-800/60"
                onClick={() => handleOpenPreview(cert)}
              >
                {hasImage ? (
                  <img
                    src={fullThumb!}
                    alt={cert.title}
                    loading="lazy"
                    onError={() => handleImageError(certKey)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                ) : (
                  /* Fallback visual gradient preview for non-image or loading certificates */
                  <div className={`w-full h-full bg-gradient-to-br ${brand.iconBg} opacity-20 group-hover:opacity-30 transition-opacity flex items-center justify-center p-4 text-center`}>
                    <div className="space-y-1">
                      <Award className="w-10 h-10 text-white mx-auto opacity-80" />
                      <span className="text-xs font-bold text-white block line-clamp-1">{cert.issuer}</span>
                    </div>
                  </div>
                )}

                {/* Top Badges */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                  {/* Verified Emerald Badge */}
                  <span className="px-2.5 py-1 rounded-full bg-slate-950/85 backdrop-blur-md text-emerald-400 border border-emerald-500/30 text-[10px] font-bold inline-flex items-center gap-1 shadow-md">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    Verified
                  </span>

                  {/* AI Confidence Pill */}
                  {cert.rawConfidence && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-amber-300 border border-amber-500/30 text-[10px] font-semibold inline-flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                      {Math.round(cert.rawConfidence * 100)}% Match
                    </span>
                  )}
                </div>

                {/* Hover Quick View Overlay */}
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenPreview(cert);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition inline-flex items-center gap-1.5 shadow-md"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Full</span>
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3
                    className="font-bold text-white text-sm line-clamp-2 leading-snug hover:text-emerald-400 transition cursor-pointer"
                    onClick={() => handleOpenPreview(cert)}
                    title={cert.title}
                  >
                    {cert.title}
                  </h3>

                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${brand.badgeBg} ${brand.badgeText} ${brand.badgeBorder} border`}>
                      {cert.issuer}
                    </span>
                    {cert.issuedDate && cert.issuedDate !== '1970-01-01T00:00:00.000Z' && (
                      <span className="text-[11px] text-slate-400">
                        • {new Date(cert.issuedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Credential ID section */}
                {cert.credentialId && (
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-mono text-slate-300 truncate max-w-[150px]">
                      ID: {cert.credentialId}
                    </span>
                    <button
                      onClick={(e) => handleCopyCredential(cert.credentialId!, e)}
                      className="p-1 text-slate-400 hover:text-emerald-400 transition rounded"
                      title="Copy Credential ID"
                    >
                      {copiedId === cert.credentialId ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}

                {/* Card Actions Footer */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                  <button
                    onClick={() => handleOpenPreview(cert)}
                    className="text-slate-300 hover:text-emerald-400 transition text-[11px] font-medium flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {fullFile && (
                      <a
                        href={fullFile}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition rounded-lg"
                        title="Download Certificate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {cert.processingId && (
                      <Link
                        href={`/dashboard/student/growth?processingId=${cert.processingId}`}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition rounded-lg"
                        title="View in Growth Hub"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fullscreen Preview Modal */}
      <CertificatePreviewModal
        certificate={selectedCert}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

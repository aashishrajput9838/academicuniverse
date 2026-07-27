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
  FileText,
  Calendar,
  Layers,
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

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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

  const handleImageError = (certKey: string) => {
    setFailedImages((prev) => ({ ...prev, [certKey]: true }));
  };

  // 14. Skeleton Loading Matching 70/30 Layout
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-900/80 rounded-2xl border border-slate-800 p-0 overflow-hidden flex flex-col h-[380px]">
            {/* 70% Thumbnail Skeleton */}
            <div className="w-full h-[240px] bg-slate-800/80" />
            {/* 30% Metadata Skeleton */}
            <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-slate-800 rounded w-3/4" />
                <div className="h-3 bg-slate-800/60 rounded w-1/2" />
              </div>
              <div className="h-8 bg-slate-800/40 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 15. Empty State
  if (!certificates || certificates.length === 0) {
    return (
      <div className="p-10 bg-slate-900/50 rounded-2xl border border-slate-800/80 text-center shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-950/20">
          <Award className="w-8 h-8" />
        </div>
        <h3 className="text-white font-bold text-lg mb-2">No Verified Certificates Yet</h3>
        <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto leading-relaxed">
          Upload course certificates, workshop credentials, or hackathon awards via Growth Hub to feature your recruiter-grade digital portfolio.
        </p>
        <Link
          href="/dashboard/student/growth?upload=certificate"
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition inline-flex items-center gap-2 shadow-lg shadow-emerald-950/50 hover:scale-105 duration-200"
        >
          <Award className="w-4 h-4" />
          <span>Upload First Certificate</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {certificates.map((cert, index) => {
          const rawKey = cert.id || cert.processingId || cert.sourceDocumentId;
          const certKey = rawKey ? `${rawKey}-${index}` : `cert-${index}`;
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

          // 3. Always display real thumbnail if available
          const hasImage = fullThumb && !failedImages[certKey];

          return (
            <div
              key={certKey}
              tabIndex={0}
              role="button"
              aria-label={`View details for ${cert.title} issued by ${cert.issuer}`}
              onClick={() => handleOpenPreview(cert)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOpenPreview(cert);
                }
              }}
              /* 1 & 5 & 6. Recruiter Card Dimensions, Entire Card Clickable & Premium Hover Animation */
              className="group relative bg-slate-900/80 hover:bg-slate-900 rounded-2xl border border-slate-800/90 hover:border-emerald-500/50 transition-all duration-300 ease-out flex flex-col overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-emerald-950/40 hover:-translate-y-1.5 cursor-pointer h-[380px]"
            >
              {/* 2. Upper ~70% Hero Thumbnail Section */}
              <div className="relative w-full h-[230px] bg-slate-950 overflow-hidden flex items-center justify-center p-2.5 border-b border-slate-800/80 select-none">

                {/* 9. Top-Right Glass Verified Badge */}
                <div className="absolute top-3 right-3 z-10">
                  <span className="px-2.5 py-1 rounded-full bg-slate-950/85 backdrop-blur-md text-emerald-400 border border-emerald-500/30 text-[10px] font-bold shadow-md inline-flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    Verified
                  </span>
                </div>

                {/* 10. AI Confidence Pill — Rendered ONLY IF rawConfidence exists */}
                {typeof cert.rawConfidence === 'number' && cert.rawConfidence > 0 && (
                  <div className="absolute top-3 left-3 z-10">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-950/85 backdrop-blur-md text-amber-300 border border-amber-500/30 text-[10px] font-semibold inline-flex items-center gap-1 shadow-md">
                      <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                      {Math.round(cert.rawConfidence * 100)}% Match
                    </span>
                  </div>
                )}

                {/* 3. Real Thumbnail Image */}
                {hasImage ? (
                  <div className="w-full h-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800/80 shadow-md flex items-center justify-center relative">
                    <img
                      src={fullThumb!}
                      alt={cert.title}
                      loading="lazy"
                      onError={() => handleImageError(certKey)}
                      /* 11. Certificate Image Styling — Never stretch, smooth zoom on hover */
                      className="w-full h-full object-contain object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                  </div>
                ) : (
                  /* 4. Beautiful Fallback Design when thumbnail fails or missing */
                  <div className={`w-full h-full rounded-xl bg-gradient-to-br ${brand.iconBg} opacity-20 group-hover:opacity-30 transition-opacity flex flex-col items-center justify-center p-4 text-center border border-white/10`}>
                    <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-2 shadow-inner">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xs font-bold text-white line-clamp-1">{cert.title}</span>
                    <span className="text-[10px] text-slate-300 mt-1">{cert.issuer}</span>
                    <span className="text-[9px] text-emerald-400 mt-2 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 font-medium">
                      Official Certificate Asset
                    </span>
                  </div>
                )}

                {/* Hover Overlay Hint */}
                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                  <span className="px-3.5 py-1.5 rounded-xl bg-emerald-600/90 text-white font-semibold text-xs shadow-xl flex items-center gap-1.5 backdrop-blur-md">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Quick Preview</span>
                  </span>
                </div>
              </div>

              {/* 8. Lower ~30% Metadata Section */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  {/* Title: Large, Bold, max 2 lines */}
                  <h3
                    className="font-bold text-white text-sm line-clamp-2 leading-snug group-hover:text-emerald-400 transition-colors"
                    title={cert.title}
                  >
                    {cert.title}
                  </h3>

                  {/* Issuer & Date Row */}
                  <div className="flex items-center justify-between text-xs mt-1.5">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${brand.badgeBg} ${brand.badgeText} ${brand.badgeBorder} border truncate max-w-[130px]`}>
                      {cert.issuer}
                    </span>
                    {cert.issuedDate && cert.issuedDate !== '1970-01-01T00:00:00.000Z' && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {new Date(cert.issuedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* 7. Modern Action Bar */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-1">
                    {/* View Action */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenPreview(cert);
                      }}
                      className="p-1.5 px-2 rounded-lg bg-slate-800/60 hover:bg-emerald-600 text-slate-300 hover:text-white transition flex items-center gap-1 text-[11px] font-medium"
                      title="View Full Certificate Modal"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">View</span>
                    </button>

                    {/* Download Action */}
                    {fullFile && (
                      <a
                        href={fullFile}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 px-2 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1 text-[11px]"
                        title="Download Certificate File"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Credential ID Copy Action */}
                    {cert.credentialId && (
                      <button
                        onClick={(e) => handleCopyCredential(cert.credentialId!, e)}
                        className="p-1.5 px-2 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition flex items-center gap-1 text-[11px]"
                        title={`Copy Credential ID: ${cert.credentialId}`}
                      >
                        {copiedId === cert.credentialId ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}

                    {/* Verify / Growth Hub Action */}
                    {cert.processingId && (
                      <Link
                        href={`/dashboard/student/growth?processingId=${cert.processingId}`}
                        className="p-1.5 px-2 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition flex items-center gap-1 text-[11px]"
                        title="Verify in Growth Hub"
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

      {/* 13. Fullscreen Preview Modal */}
      <CertificatePreviewModal
        certificate={selectedCert}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

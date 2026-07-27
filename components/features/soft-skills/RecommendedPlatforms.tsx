"use client";

import React, { useState } from 'react';
import { ExternalLink, Globe, ShieldCheck, Compass, Sparkles } from 'lucide-react';

export interface PlatformItem {
  id: string;
  name: string;
  url: string;
  category: string;
  description: string;
  domain: string;
  thumbnailUrl: string;
  backupThumbnailUrl: string;
  gradient: string;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  heroTag: string;
}

export const RECOMMENDED_PLATFORMS: PlatformItem[] = [
  {
    id: 'yoodli',
    name: 'Yoodli',
    url: 'https://www.yoodli.ai',
    domain: 'yoodli.ai',
    category: 'Public Speaking',
    description: 'AI-powered public speaking coach that analyzes speaking pace, filler words, confidence, eye contact and delivery.',
    thumbnailUrl: 'https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.yoodli.ai?w=800&h=500',
    backupThumbnailUrl: 'https://api.microlink.io/?url=https://www.yoodli.ai&screenshot=true&embed=screenshot.url',
    gradient: 'from-blue-900/60 via-indigo-950/80 to-slate-950',
    accentColor: 'text-blue-400',
    badgeBg: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
    badgeText: 'text-blue-400',
    heroTag: 'AI Speech & Filler Word Analytics'
  },
  {
    id: 'talkivo',
    name: 'Talkivo',
    url: 'https://talkivo.in',
    domain: 'talkivo.in',
    category: 'English Speaking',
    description: 'AI English speaking tutor with grammar correction, conversation practice and role-play sessions.',
    thumbnailUrl: 'https://s.wordpress.com/mshots/v1/https%3A%2F%2Ftalkivo.in?w=800&h=500',
    backupThumbnailUrl: 'https://api.microlink.io/?url=https://talkivo.in&screenshot=true&embed=screenshot.url',
    gradient: 'from-emerald-900/60 via-teal-950/80 to-slate-950',
    accentColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
    badgeText: 'text-emerald-400',
    heroTag: 'AI English Role-play & Tutor'
  },
  {
    id: 'speakili',
    name: 'Speakili',
    url: 'https://speakili.com',
    domain: 'speakili.com',
    category: 'Interview Practice',
    description: 'AI communication coach focused on interview preparation, fluency improvement and vocabulary enhancement.',
    thumbnailUrl: 'https://s.wordpress.com/mshots/v1/https%3A%2F%2Fspeakili.com?w=800&h=500',
    backupThumbnailUrl: 'https://api.microlink.io/?url=https://speakili.com&screenshot=true&embed=screenshot.url',
    gradient: 'from-cyan-900/60 via-slate-950 to-slate-950',
    accentColor: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300',
    badgeText: 'text-cyan-400',
    heroTag: 'Interview Fluency Coach'
  },
  {
    id: 'voicecoach',
    name: 'VoiceCoach AI',
    url: 'https://www.myvoicecoach.in',
    domain: 'myvoicecoach.in',
    category: 'Placements',
    description: 'Placement-focused AI platform providing mock interviews, speech analysis and communication training.',
    thumbnailUrl: 'https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.myvoicecoach.in?w=800&h=500',
    backupThumbnailUrl: 'https://api.microlink.io/?url=https://www.myvoicecoach.in&screenshot=true&embed=screenshot.url',
    gradient: 'from-purple-900/60 via-indigo-950/80 to-slate-950',
    accentColor: 'text-purple-400',
    badgeBg: 'bg-purple-500/20 border-purple-500/40 text-purple-300',
    badgeText: 'text-purple-400',
    heroTag: 'Placement Mock Interview Platform'
  },
  {
    id: 'practiceacademy',
    name: 'Practice Academy Online',
    url: 'https://www.practiceacademyonline.com',
    domain: 'practiceacademyonline.com',
    category: 'Learning Resources',
    description: 'Structured communication learning platform with guided speaking exercises and professional development content.',
    thumbnailUrl: 'https://s.wordpress.com/mshots/v1/https%3A%2F%2Fwww.practiceacademyonline.com?w=800&h=500',
    backupThumbnailUrl: 'https://api.microlink.io/?url=https://www.practiceacademyonline.com&screenshot=true&embed=screenshot.url',
    gradient: 'from-amber-900/60 via-orange-950/80 to-slate-950',
    accentColor: 'text-amber-400',
    badgeBg: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
    badgeText: 'text-amber-400',
    heroTag: 'Professional Speaking Exercises'
  }
];

export const RecommendedPlatforms: React.FC = () => {
  const [imageErrorState, setImageErrorState] = useState<Record<string, number>>({});
  const [faviconError, setFaviconError] = useState<Record<string, boolean>>({});

  const handleImageError = (id: string) => {
    setImageErrorState(prev => {
      const currentLevel = prev[id] || 0;
      return { ...prev, [id]: currentLevel + 1 };
    });
  };

  return (
    <div className="mt-12 bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" /> CURATED LEARNING ECOSYSTEM
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            Recommended Learning Platforms
          </h3>

          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Explore world-class external AI communication and soft skills platforms with live landing page previews.
          </p>
        </div>

        <span className="self-start sm:self-center text-xs font-semibold text-slate-400 bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-slate-800">
          5 Platforms Curated
        </span>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {RECOMMENDED_PLATFORMS.map((platform) => {
          const faviconUrl = `https://www.google.com/s2/favicons?domain=${platform.domain}&sz=128`;
          const errCount = imageErrorState[platform.id] || 0;
          const isFaviconErr = faviconError[platform.id];

          // Determine current image source
          let currentImageSrc = platform.thumbnailUrl;
          if (errCount === 1) {
            currentImageSrc = platform.backupThumbnailUrl;
          }

          const showFallbackBanner = errCount >= 2;

          return (
            <a
              key={platform.id}
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-slate-950/80 hover:bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between shadow-xl hover:shadow-2xl hover:shadow-cyan-950/30 hover:-translate-y-1.5"
            >
              {/* Thumbnail Container */}
              <div className="relative h-44 w-full bg-slate-900 overflow-hidden border-b border-slate-800">
                {!showFallbackBanner ? (
                  <img
                    src={currentImageSrc}
                    alt={`${platform.name} website preview`}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    onError={() => handleImageError(platform.id)}
                    loading="lazy"
                  />
                ) : (
                  /* Custom Rich Platform Banner if external APIs are blocked */
                  <div className={`w-full h-full bg-gradient-to-br ${platform.gradient} p-5 flex flex-col justify-between relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                    
                    <div className="relative z-10 flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase font-mono">
                        OFFICIAL PLATFORM
                      </span>
                      <Sparkles className={`w-4 h-4 ${platform.accentColor}`} />
                    </div>

                    <div className="relative z-10">
                      <span className={`text-[11px] font-extrabold ${platform.accentColor} uppercase tracking-wider block mb-1`}>
                        {platform.heroTag}
                      </span>
                      <h4 className="text-white text-lg font-black tracking-tight">
                        {platform.name}
                      </h4>
                    </div>
                  </div>
                )}

                {/* Dark Gradient Overlay for Badges */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent pointer-events-none" />

                {/* Category Badge - Top Right */}
                <div className="absolute top-3 right-3 z-10">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border backdrop-blur-md shadow-md ${platform.badgeBg}`}>
                    {platform.category}
                  </span>
                </div>

                {/* Platform Name & Favicon - Bottom Left */}
                <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-950/90 backdrop-blur-md border border-slate-700/80 p-1.5 flex items-center justify-center shrink-0 shadow-lg">
                      {!isFaviconErr ? (
                        <img
                          src={faviconUrl}
                          alt={`${platform.name} favicon`}
                          className="w-5 h-5 object-contain rounded"
                          onError={() => setFaviconError(prev => ({ ...prev, [platform.id]: true }))}
                        />
                      ) : (
                        <Globe className={`w-4 h-4 ${platform.accentColor}`} />
                      )}
                    </div>

                    <div>
                      <h4 className="text-white font-extrabold text-sm group-hover:text-cyan-300 transition-colors drop-shadow-md">
                        {platform.name}
                      </h4>
                      <span className="text-[10px] text-slate-300 font-mono drop-shadow">
                        {platform.domain}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Primary Focus: <strong className="text-slate-200">{platform.category}</strong>
                  </span>
                  <p className="text-slate-300 text-xs leading-relaxed line-clamp-3">
                    {platform.description}
                  </p>
                </div>

                {/* Visit Website Button */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium group-hover:text-slate-300 transition-colors">
                    Official Website
                  </span>

                  <span className="px-3.5 py-1.5 bg-slate-800 group-hover:bg-cyan-500 group-hover:text-slate-950 text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 border border-slate-700 group-hover:border-cyan-400 shadow-sm">
                    Visit Website <ExternalLink className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </a>
          );
        })}
      </div>

      {/* Disclaimer Note */}
      <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-center">
        <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1.5 leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            These are trusted external learning resources. Academic Universe does not own or operate these platforms.
          </span>
        </p>
      </div>
    </div>
  );
};

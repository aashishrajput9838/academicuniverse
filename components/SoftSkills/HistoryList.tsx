"use client";

import React, { useState, useMemo } from 'react';
import { AnalysisData } from './AnalysisResult';
import { AttemptDetailModal } from './AttemptDetailModal';
import { Clock, ExternalLink, Sparkles } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { SearchBar } from '@/components/common/SearchBar';

interface HistoryListProps {
  history: AnalysisData[];
  loading: boolean;
}

export const HistoryList: React.FC<HistoryListProps> = ({ history, loading }) => {
  const [selectedAttempt, setSelectedAttempt] = useState<AnalysisData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [modeFilter, setModeFilter] = useState('ALL');

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const matchesSearch =
        !debouncedSearch.trim() ||
        item.originalSentence.toLowerCase().includes(debouncedSearch.toLowerCase().trim()) ||
        item.improvedSentence.toLowerCase().includes(debouncedSearch.toLowerCase().trim()) ||
        (item.practiceMode && item.practiceMode.toLowerCase().includes(debouncedSearch.toLowerCase().trim()));

      const matchesMode = modeFilter === 'ALL' || item.practiceMode === modeFilter;
      return matchesSearch && matchesMode;
    });
  }, [history, debouncedSearch, modeFilter]);

  const handleOpenAttempt = (item: AnalysisData) => {
    setSelectedAttempt(item);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 text-center py-12">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Loading practice history...</p>
      </div>
    );
  }

  // 8. BETTER EMPTY STATES
  if (history.length === 0) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-10 text-center border border-slate-800 shadow-xl mt-8">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-400">
          <Sparkles className="w-8 h-8" />
        </div>
        <h4 className="text-white text-lg font-bold">Start Your First Practice Session</h4>
        <p className="text-slate-400 text-sm max-w-md mx-auto mt-2 leading-relaxed">
          Your AI coach will evaluate your communication, rate grammar & fluency, and track your placement readiness over time.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 border border-slate-800 shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" /> Practice History Logs
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">
            Review previous attempts, score cards, and detailed coach feedback.
          </p>
        </div>

        {/* Search - using shared SearchBar component */}
        <div className="flex items-center gap-2.5">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search history..."
            className="w-48"
          />
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm bg-slate-950/40 rounded-xl">
          No practice attempt matches your query &quot;{debouncedSearch}&quot;
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((item, index) => {
            const overall = item.overallScore ?? (item.fluencyScore > 10 ? item.fluencyScore : Math.round(item.fluencyScore * 10));
            const grammar = item.grammarScore ?? overall;
            const fluency10 = item.fluencyScore > 10 ? Math.round(item.fluencyScore / 10) : item.fluencyScore;
            const confidence = item.confidenceScore ?? overall;

            const dateStr = item.createdAt
              ? new Date(item.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Recent Attempt';

            return (
              <div
                key={item.id || index}
                onClick={() => handleOpenAttempt(item)}
                className="group p-4 bg-slate-950/60 hover:bg-slate-800/60 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      {item.practiceMode || 'General Practice'}
                    </span>
                    <span className="text-xs text-slate-500">{dateStr}</span>
                  </div>

                  <p className="text-slate-200 text-sm font-medium line-clamp-1 group-hover:text-white transition-colors">
                    "{item.originalSentence}"
                  </p>

                  <p className="text-slate-400 text-xs line-clamp-1 italic">
                    Improved: "{item.improvedSentence}"
                  </p>
                </div>

                {/* Score Badges */}
                <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
                  <div className="text-center px-2.5 py-1 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Overall</span>
                    <span className="text-xs font-bold text-emerald-400">{overall}</span>
                  </div>
                  <div className="text-center px-2.5 py-1 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Grammar</span>
                    <span className="text-xs font-bold text-cyan-400">{grammar}</span>
                  </div>
                  <div className="text-center px-2.5 py-1 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Fluency</span>
                    <span className="text-xs font-bold text-purple-400">{fluency10}/10</span>
                  </div>
                  <div className="text-center px-2.5 py-1 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Confidence</span>
                    <span className="text-xs font-bold text-amber-400">{confidence}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenAttempt(item);
                    }}
                    className="p-2 text-slate-400 hover:text-emerald-400 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
                    title="View Full Report"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Attempt Detail Modal */}
      <AttemptDetailModal
        attempt={selectedAttempt}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
};

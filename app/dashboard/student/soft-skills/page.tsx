"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { apiRequest } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import { SentenceInput } from '@/components/SoftSkills/SentenceInput';
import { AnalysisResult, AnalysisData } from '@/components/SoftSkills/AnalysisResult';
import { HistoryList } from '@/components/SoftSkills/HistoryList';
import { DailyChallenge } from '@/components/SoftSkills/DailyChallenge';
import { PracticeModeSelector } from '@/components/SoftSkills/PracticeModeSelector';
import { PersonalProgressDashboard } from '@/components/SoftSkills/PersonalProgressDashboard';
import { RecommendedPlatforms } from '@/components/SoftSkills/RecommendedPlatforms';
import {
  Mic,
  Award,
  BarChart3,
  Clock,
  Sparkles,
  Target,
  Compass
} from 'lucide-react';

export default function SoftSkillsLabPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [result, setResult] = useState<AnalysisData | null>(null);
  const [history, setHistory] = useState<AnalysisData[]>([]);
  const [selectedMode, setSelectedMode] = useState<string>('General Practice');
  const [activeTab, setActiveTab] = useState<'COACH' | 'PROGRESS' | 'HISTORY' | 'MODES' | 'PLATFORMS'>('COACH');

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error("No token found");
      const res = await apiRequest('/api/softskills/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(res.data?.history || res.history || []);
    } catch (error: any) {
      console.error('Error fetching history:', error);
      toast({
        title: "History Note",
        description: error.message || "Failed to load past practice sessions.",
        variant: "destructive"
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSentenceSubmit = async (text: string, mode?: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error("No token found");

      const activePracticeMode = mode || selectedMode || 'General Practice';

      const res = await apiRequest('/api/softskills/improve', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          originalSentence: text,
          practiceMode: activePracticeMode
        })
      });

      const analysisData: AnalysisData = res.analysis;
      setResult(analysisData);

      // Prepend to history
      setHistory(prev => [analysisData, ...prev]);

      toast({
        title: "Evaluation Complete",
        description: `Your communication response has been evaluated for ${activePracticeMode}.`,
      });

      // Scroll smoothly to result
      setTimeout(() => {
        const resultEl = document.getElementById('ai-analysis-result');
        if (resultEl) {
          resultEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);

    } catch (error: any) {
      console.error('Error analyzing sentence:', error);
      toast({
        title: "Evaluation Error",
        description: error.message || "Failed to evaluate sentence. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChallengeSelected = (promptText: string) => {
    setActiveTab('COACH');
    toast({
      title: "Challenge Selected",
      description: "Prompt loaded into practice coach. Type or speak your answer below!",
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="bg-slate-900/60 p-6 sm:p-8 rounded-2xl border border-slate-800/80 shadow-xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold uppercase tracking-wider rounded-full flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> SOFT SKILLS LAB 2.0
              </span>
              <span className="px-2.5 py-1 bg-slate-800 text-slate-400 text-xs font-medium rounded-full border border-slate-700">
                AI COMMUNICATION COACH
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span className="text-3xl sm:text-4xl">🎙️</span> Soft Skills Lab
            </h1>

            <p className="text-slate-400 text-sm sm:text-base mt-2 max-w-3xl leading-relaxed">
              Master placement interviews, public speaking, group discussions, and technical pitches with real-time AI feedback on grammar, fluency, tone, and confidence.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
            <div className="px-4 py-3 bg-slate-950/80 rounded-xl border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 font-semibold block">Total Sessions</span>
              <span className="text-xl font-black text-emerald-400">{history.length}</span>
            </div>
          </div>
        </div>

        {/* Top Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('COACH')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'COACH'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-lg shadow-emerald-950/30'
                : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Mic className="w-4 h-4" /> AI Practice Coach
          </button>

          <button
            onClick={() => setActiveTab('MODES')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'MODES'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-lg shadow-emerald-950/30'
                : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Target className="w-4 h-4" /> Practice Modes (9)
          </button>

          <button
            onClick={() => setActiveTab('PROGRESS')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'PROGRESS'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-lg shadow-emerald-950/30'
                : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Progress & Scorecard
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'HISTORY'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-lg shadow-emerald-950/30'
                : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" /> Practice History ({history.length})
          </button>

          <button
            onClick={() => setActiveTab('PLATFORMS')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'PLATFORMS'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-950/30'
                : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Compass className="w-4 h-4 text-cyan-400" /> Recommended Platforms
          </button>
        </div>

        {/* Tab Content */}

        {/* TAB 1: PRACTICE COACH */}
        {activeTab === 'COACH' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Daily Challenge Card */}
            <DailyChallenge onChallengeSelected={handleChallengeSelected} />

            {/* Practice Mode Selector Quick Strip */}
            <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-slate-400">Active Scenario:</span>
                <span className="text-xs font-bold text-white bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
                  {selectedMode}
                </span>
              </div>

              <button
                onClick={() => setActiveTab('MODES')}
                className="text-xs text-emerald-400 hover:underline font-semibold"
              >
                Switch Mode →
              </button>
            </div>

            {/* Sentence & Voice Input Component */}
            <SentenceInput
              onSubmit={handleSentenceSubmit}
              loading={loading}
              selectedMode={selectedMode}
            />

            {/* Analysis Result Container */}
            <div id="ai-analysis-result">
              <AnalysisResult result={result} />
            </div>

            {/* Past History */}
            <HistoryList history={history} loading={historyLoading} />

            {/* Recommended Learning Platforms Section */}
            <RecommendedPlatforms />
          </div>
        )}

        {/* TAB 2: PRACTICE MODES */}
        {activeTab === 'MODES' && (
          <div className="animate-fadeIn">
            <PracticeModeSelector
              selectedMode={selectedMode}
              onSelectMode={(mode) => {
                setSelectedMode(mode);
                setActiveTab('COACH');
                toast({
                  title: "Practice Mode Set",
                  description: `Switched mode to "${mode}". Practice input is ready!`,
                });
              }}
            />
          </div>
        )}

        {/* TAB 3: PERSONAL PROGRESS */}
        {activeTab === 'PROGRESS' && (
          <div className="animate-fadeIn space-y-8">
            <PersonalProgressDashboard history={history} />

            {result && (
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-400" /> Latest Session Evaluation
                </h3>
                <AnalysisResult result={result} />
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PRACTICE HISTORY */}
        {activeTab === 'HISTORY' && (
          <div className="animate-fadeIn">
            <HistoryList history={history} loading={historyLoading} />
          </div>
        )}

        {/* TAB 5: RECOMMENDED PLATFORMS */}
        {activeTab === 'PLATFORMS' && (
          <div className="animate-fadeIn">
            <RecommendedPlatforms />
          </div>
        )}

      </div>
    </div>
  );
}

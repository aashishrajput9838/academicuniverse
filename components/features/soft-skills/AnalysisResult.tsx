"use client";

import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Award,
  BookOpen,
  Zap,
  TrendingUp,
  MessageSquare,
  Flame,
  Check,
  Target
} from 'lucide-react';

export interface VocabularySuggestion {
  original: string;
  suggested: string;
  reason: string;
}

export interface AnalysisData {
  id?: string;
  originalSentence: string;
  correctedSentence: string;
  improvedSentence: string;
  professionalVersion?: string;
  fluencyScore: number; // 1-10 or normalized
  overallScore?: number; // 0-100
  grammarScore?: number; // 0-100
  vocabularyScore?: number; // 0-100
  confidenceScore?: number; // 0-100
  professionalToneScore?: number; // 0-100
  clarityScore?: number; // 0-100
  shortTip: string;
  pronunciationFeedback?: string;
  grammarMistakes?: string[];
  vocabularySuggestions?: VocabularySuggestion[];
  speakingTips?: string[];
  confidenceTips?: string[];
  practiceRecommendation?: string;
  aiRecommendations?: string[];
  practiceMode?: string;
  topic?: string;
  createdAt?: string;
}

interface AnalysisResultProps {
  result: AnalysisData | null;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ result }) => {
  if (!result) return null;

  // Normalized scores (0-100)
  const overall = result.overallScore ?? (result.fluencyScore > 10 ? result.fluencyScore : Math.round(result.fluencyScore * 10));
  const grammar = result.grammarScore ?? overall;
  const vocabulary = result.vocabularyScore ?? overall;
  const fluency100 = result.fluencyScore > 10 ? result.fluencyScore : Math.round(result.fluencyScore * 10);
  const confidence = result.confidenceScore ?? overall;
  const tone = result.professionalToneScore ?? overall;
  const clarity = result.clarityScore ?? overall;

  const getScoreColor = (score: number) => {
    if (score >= 80) return { text: 'text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-500/30' };
    if (score >= 60) return { text: 'text-cyan-400', bg: 'bg-cyan-500', border: 'border-cyan-500/30' };
    if (score >= 45) return { text: 'text-amber-400', bg: 'bg-amber-500', border: 'border-amber-500/30' };
    return { text: 'text-rose-400', bg: 'bg-rose-500', border: 'border-rose-500/30' };
  };

  const overallTheme = getScoreColor(overall);

  const subScores = [
    { label: 'Grammar', score: grammar, icon: '📝', desc: 'Syntax & Tense Precision' },
    { label: 'Vocabulary', score: vocabulary, icon: '📚', desc: 'Word Choice & Range' },
    { label: 'Fluency', score: fluency100, icon: '⚡', desc: 'Speech Flow & Pacing' },
    { label: 'Confidence', score: confidence, icon: '🔥', desc: 'Assertiveness & Posture' },
    { label: 'Professional Tone', score: tone, icon: '💼', desc: 'Executive Placement Readiness' },
    { label: 'Clarity', score: clarity, icon: '🎯', desc: 'Conciseness & Directness' },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* 1. AI PERFORMANCE SCORECARD */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> AI Performance Scorecard
              </span>
              {result.practiceMode && (
                <span className="px-2.5 py-1 bg-slate-800 text-slate-300 text-xs font-medium rounded-full border border-slate-700">
                  {result.practiceMode}
                </span>
              )}
            </div>
            <h3 className="text-2xl font-extrabold text-white tracking-tight">
              Communication Evaluation
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              AI analysis based on executive placement rubrics & professional speaking standards.
            </p>
          </div>

          {/* Circular / Large Score Badge */}
          <div className="flex flex-col items-center justify-center shrink-0 w-32 h-32 rounded-2xl bg-slate-950/80 border-2 border-slate-800 shadow-inner relative group">
            <span className={`text-4xl font-black tracking-tight ${overallTheme.text}`}>
              {overall}
            </span>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Overall Score
            </span>
            <span className="text-[10px] text-slate-500">out of 100</span>
          </div>
        </div>

        {/* 6 Sub-Score Breakdown Progress Bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {subScores.map((item, idx) => {
            const color = getScoreColor(item.score);
            return (
              <div key={idx} className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{item.icon}</span>
                    <span className="text-sm font-semibold text-slate-200">{item.label}</span>
                  </div>
                  <span className={`text-sm font-bold ${color.text}`}>{item.score}/100</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-1.5">
                  <div
                    className={`h-full ${color.bg} transition-all duration-1000 ease-out`}
                    style={{ width: `${Math.min(100, Math.max(5, item.score))}%` }}
                  />
                </div>
                <span className="text-[11px] text-slate-400">{item.desc}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. AI FEEDBACK SECTIONS GRID */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-400" />
          Detailed Feedback Breakdown
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Card 1: Original Response */}
          <div className="bg-slate-900/80 rounded-xl p-5 border border-slate-800">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-500" /> Original Response
            </div>
            <p className="text-slate-300 text-sm bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 leading-relaxed font-mono">
              "{result.originalSentence}"
            </p>
          </div>

          {/* Card 2: Grammar Mistakes & Corrections */}
          <div className="bg-slate-900/80 rounded-xl p-5 border border-slate-800">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Grammatically Correct Version
            </div>
            <p className="text-white text-sm bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-500/20 leading-relaxed font-medium">
              {result.correctedSentence}
            </p>
            {result.grammarMistakes && result.grammarMistakes.length > 0 && (
              <div className="mt-3 space-y-1">
                <span className="text-[11px] text-amber-400 font-semibold">Corrections Noted:</span>
                <ul className="text-xs text-slate-400 space-y-1">
                  {result.grammarMistakes.map((err, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-amber-400">•</span> {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Card 3: Improved Version */}
          <div className="bg-slate-900/80 rounded-xl p-5 border border-slate-800">
            <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" /> Eloquent Student Version
            </div>
            <p className="text-cyan-100 text-sm bg-cyan-950/30 p-3.5 rounded-xl border border-cyan-500/20 leading-relaxed font-medium">
              "{result.improvedSentence}"
            </p>
          </div>

          {/* Card 4: Professional Executive Version */}
          <div className="bg-slate-900/80 rounded-xl p-5 border border-slate-800">
            <div className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-400" /> Placement-Ready Professional Version
            </div>
            <p className="text-purple-100 text-sm bg-purple-950/30 p-3.5 rounded-xl border border-purple-500/20 leading-relaxed font-medium">
              "{result.professionalVersion || result.improvedSentence}"
            </p>
          </div>
        </div>

        {/* Card 5: Vocabulary Suggestions */}
        {result.vocabularySuggestions && result.vocabularySuggestions.length > 0 && (
          <div className="mt-4 bg-slate-900/80 rounded-xl p-5 border border-slate-800">
            <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" /> Vocabulary Enhancements
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {result.vocabularySuggestions.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-rose-400 line-through font-mono">{item.original}</span>
                    <span className="text-emerald-400 font-bold font-mono">→ {item.suggested}</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-tight">{item.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips & Recommendations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          
          {/* Speaking Tips */}
          <div className="bg-slate-900/80 rounded-xl p-5 border border-slate-800">
            <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" /> Speaking & Delivery Tips
            </div>
            <ul className="space-y-2 text-xs text-slate-300">
              {result.speakingTips && result.speakingTips.length > 0 ? (
                result.speakingTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-cyan-400 font-bold">•</span>
                    <span>{tip}</span>
                  </li>
                ))
              ) : (
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span>{result.shortTip || "Pace your speech evenly and articulate key technical terms clearly."}</span>
                </li>
              )}
            </ul>
          </div>

          {/* Confidence Tips */}
          <div className="bg-slate-900/80 rounded-xl p-5 border border-slate-800">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" /> Confidence & Tone Tips
            </div>
            <ul className="space-y-2 text-xs text-slate-300">
              {result.confidenceTips && result.confidenceTips.length > 0 ? (
                result.confidenceTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{tip}</span>
                  </li>
                ))
              ) : (
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>Maintain an assertive posture and replace tentative phrases with definitive statements.</span>
                </li>
              )}
            </ul>
          </div>

          {/* Practice Recommendation */}
          <div className="bg-slate-900/80 rounded-xl p-5 border border-slate-800">
            <div className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-400" /> Practice Recommendation
            </div>
            <p className="text-xs text-slate-300 leading-relaxed bg-purple-950/30 p-3 rounded-lg border border-purple-500/20">
              {result.practiceRecommendation || "Practice delivering a 60-second elevator pitch focusing on your core technical projects and leadership skills."}
            </p>
          </div>
        </div>

        {/* 7. DYNAMIC AI RECOMMENDATIONS */}
        {result.aiRecommendations && result.aiRecommendations.length > 0 && (
          <div className="mt-4 bg-gradient-to-r from-emerald-950/30 via-slate-900 to-cyan-950/30 rounded-xl p-5 border border-emerald-500/20">
            <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" /> Personal AI Coach Recommendations
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {result.aiRecommendations.map((rec, idx) => (
                <div key={idx} className="p-3 bg-slate-950/70 rounded-lg border border-slate-800 text-xs text-slate-200 flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

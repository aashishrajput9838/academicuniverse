'use client';

import React, { useState } from 'react';
import { Sparkles, Clock, AlertTriangle, ChevronDown, ChevronUp, Cpu } from 'lucide-react';

interface AISuggestionsPanelProps {
  aiSuggestions?: {
    detectedTechnologies?: string[];
    generatedTags?: string[];
    estimatedDifficulty?: string;
    estimatedSolvingTimeHours?: number;
    suggestedRootCauses?: string[];
  };
}

export const AISuggestionsPanel: React.FC<AISuggestionsPanelProps> = ({ aiSuggestions }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!aiSuggestions) return null;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border border-emerald-500/30 rounded-2xl p-5 mb-6 shadow-xl relative overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              AI Debugging Insights & Root Cause Analysis
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Gemini 2.5
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">Automated stack detection & debugging directions</p>
          </div>
        </div>

        <div className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-800 space-y-4 text-xs">
          {/* Metadata badges */}
          <div className="flex flex-wrap items-center gap-3">
            {aiSuggestions.estimatedDifficulty && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>Difficulty: <strong className="text-white">{aiSuggestions.estimatedDifficulty}</strong></span>
              </div>
            )}

            {aiSuggestions.estimatedSolvingTimeHours && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Est. Time: <strong className="text-white">~{aiSuggestions.estimatedSolvingTimeHours} hrs</strong></span>
              </div>
            )}
          </div>

          {/* Detected Technologies */}
          {aiSuggestions.detectedTechnologies && aiSuggestions.detectedTechnologies.length > 0 && (
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">Detected Stack</span>
              <div className="flex flex-wrap gap-1.5">
                {aiSuggestions.detectedTechnologies.map((tech, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px]"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Root Cause Suggestions */}
          {aiSuggestions.suggestedRootCauses && aiSuggestions.suggestedRootCauses.length > 0 && (
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Suggested Root Causes / Debugging Steps
              </span>
              <ul className="space-y-1.5 pl-2">
                {aiSuggestions.suggestedRootCauses.map((cause, idx) => (
                  <li key={idx} className="text-slate-300 flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{cause}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

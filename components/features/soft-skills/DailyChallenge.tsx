"use client";

import React, { useState, useEffect } from 'react';
import { RefreshCw, Zap, Clock, Target, ArrowRight } from 'lucide-react';

export interface ChallengeItem {
  prompt: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  timeEstimate: string;
  skillFocus: string;
  category: string;
}

const EXTENDED_CHALLENGES: ChallengeItem[] = [
  {
    prompt: "Explain a complex technical concept (e.g. Recursion or JWT authentication) to a non-technical manager.",
    difficulty: "Intermediate",
    timeEstimate: "2 mins",
    skillFocus: "Clarity & Simplicity",
    category: "Technical Communication"
  },
  {
    prompt: "Describe a major project setback or academic failure and explain what you learned from it.",
    difficulty: "Intermediate",
    timeEstimate: "2 mins",
    skillFocus: "STAR Method & Resilience",
    category: "HR Interview"
  },
  {
    prompt: "Deliver a 60-second elevator pitch introducing yourself to a senior campus recruiter.",
    difficulty: "Advanced",
    timeEstimate: "1 min",
    skillFocus: "Confidence & Executive Tone",
    category: "Placement Pitch"
  },
  {
    prompt: "Express a respectful disagreement with a team member who wants to rush a project release without testing.",
    difficulty: "Intermediate",
    timeEstimate: "2 mins",
    skillFocus: "Diplomacy & Professional Tone",
    category: "Group Discussion"
  },
  {
    prompt: "Explain what REST APIs are referencing real-world analogies like a restaurant waiter.",
    difficulty: "Beginner",
    timeEstimate: "2 mins",
    skillFocus: "Analogy & Vocabulary",
    category: "Technical Interview"
  },
  {
    prompt: "Pitch your final year project idea in exactly 3 clear, impact-driven sentences.",
    difficulty: "Advanced",
    timeEstimate: "1 min",
    skillFocus: "Conciseness & High Impact",
    category: "Presentation"
  },
  {
    prompt: "How do you handle scope creep and tight deadlines when working under pressure?",
    difficulty: "Intermediate",
    timeEstimate: "2 mins",
    skillFocus: "Problem Solving & Tone",
    category: "HR Interview"
  },
  {
    prompt: "Describe your ideal engineering work environment and why you thrive in cross-functional teams.",
    difficulty: "Beginner",
    timeEstimate: "2 mins",
    skillFocus: "Fluency & Enthusiasm",
    category: "Daily Conversation"
  }
];

interface DailyChallengeProps {
  onChallengeSelected: (promptText: string) => void;
}

export const DailyChallenge: React.FC<DailyChallengeProps> = ({ onChallengeSelected }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    setCurrentIndex(dayOfYear % EXTENDED_CHALLENGES.length);
  }, []);

  const handleRefresh = () => {
    setCurrentIndex(prev => (prev + 1) % EXTENDED_CHALLENGES.length);
  };

  const challenge = EXTENDED_CHALLENGES[currentIndex];

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case 'Beginner':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Intermediate':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'Advanced':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 rounded-2xl p-6 border border-purple-500/30 shadow-xl mb-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
            <Zap className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Daily Placement Challenge</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getDifficultyBadge(challenge.difficulty)}`}>
                {challenge.difficulty}
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              Daily curated speaking prompt to sharpen interview & placement readiness.
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          className="self-start sm:self-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
          title="Refresh Challenge Prompt"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Challenge
        </button>
      </div>

      <div className="mt-4">
        <p className="text-white font-semibold text-lg leading-relaxed bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
          "{challenge.prompt}"
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              Est. Time: <strong className="text-slate-200">{challenge.timeEstimate}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-cyan-400" />
              Skill Focus: <strong className="text-slate-200">{challenge.skillFocus}</strong>
            </span>
          </div>

          <button
            onClick={() => onChallengeSelected(challenge.prompt)}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-950/40 transition-all flex items-center gap-2"
          >
            Practice This Challenge <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

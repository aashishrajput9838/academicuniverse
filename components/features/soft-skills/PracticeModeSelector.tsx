"use client";

import React from 'react';
import {
  MessageSquare,
  Briefcase,
  Users,
  Presentation as PresentationIcon,
  Mail,
  UserCheck,
  Code,
  Mic,
  Share2
} from 'lucide-react';

export interface PracticeMode {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  targetFocus: string;
}

export const PRACTICE_MODES: PracticeMode[] = [
  {
    id: 'Daily Conversation',
    name: 'Daily Conversation',
    category: 'General',
    icon: '💬',
    description: 'Casual, fluent conversational English for everyday communication.',
    targetFocus: 'Fluency & Pronunciation'
  },
  {
    id: 'Interview Preparation',
    name: 'Interview Preparation',
    category: 'Placement',
    icon: '🎯',
    description: 'Structured behavioral & STAR-method answers for placement drives.',
    targetFocus: 'STAR Method & Clarity'
  },
  {
    id: 'HR Interview',
    name: 'HR Interview',
    category: 'Placement',
    icon: '👔',
    description: 'Answering questions about salary expectations, strengths, weaknesses & career goals.',
    targetFocus: 'Confidence & Professional Tone'
  },
  {
    id: 'Technical Interview',
    name: 'Technical Interview',
    category: 'Placement',
    icon: '💻',
    description: 'Explaining system design, algorithms & coding project architecture clearly.',
    targetFocus: 'Technical Precision & Vocabulary'
  },
  {
    id: 'Group Discussion',
    name: 'Group Discussion',
    category: 'Placement',
    icon: '👥',
    description: 'Pitching points, moderating debates & agreeing/disagreeing diplomatically.',
    targetFocus: 'Diplomacy & Moderation'
  },
  {
    id: 'Presentation',
    name: 'Presentation',
    category: 'Academic',
    icon: '📊',
    description: 'Delivering technical slide presentations, project demos & keynote pitches.',
    targetFocus: 'Executive Tone & Pacing'
  },
  {
    id: 'Email Writing',
    name: 'Email Writing',
    category: 'Professional',
    icon: '✉️',
    description: 'Crafting formal corporate emails, follow-ups, and recruiter communications.',
    targetFocus: 'Formal Grammar & Tone'
  },
  {
    id: 'Public Speaking',
    name: 'Public Speaking',
    category: 'Leadership',
    icon: '🎙️',
    description: 'Stage presence, storytelling, rhetorical structure, and audience engagement.',
    targetFocus: 'Rhetoric & Projection'
  },
  {
    id: 'Networking',
    name: 'Networking',
    category: 'Professional',
    icon: '🤝',
    description: 'Elevator pitches, LinkedIn outreach, conference small talk & mentor intros.',
    targetFocus: 'Elevator Pitch & Impact'
  }
];

interface PracticeModeSelectorProps {
  selectedMode: string;
  onSelectMode: (mode: string) => void;
}

export const PracticeModeSelector: React.FC<PracticeModeSelectorProps> = ({
  selectedMode,
  onSelectMode
}) => {
  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 border border-slate-800 shadow-xl mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-xl">🎯</span> Select AI Practice Mode
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">
            Choose a target scenario to tailor AI feedback, vocabulary metrics, and scoring rubrics.
          </p>
        </div>
        <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
          9 Modes Available
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {PRACTICE_MODES.map((mode) => {
          const isSelected = selectedMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => onSelectMode(mode.id)}
              className={`p-3.5 rounded-xl border text-left transition-all group relative overflow-hidden ${
                isSelected
                  ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/60 shadow-lg shadow-emerald-950/40'
                  : 'bg-slate-950/50 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              {isSelected && (
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
              )}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{mode.icon}</span>
                  <div>
                    <h4 className={`text-sm font-bold transition-colors ${isSelected ? 'text-emerald-400' : 'text-white group-hover:text-emerald-300'}`}>
                      {mode.name}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                      {mode.category}
                    </span>
                  </div>
                </div>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mt-1" />
                )}
              </div>

              <p className="text-slate-400 text-xs mt-2 leading-relaxed line-clamp-2">
                {mode.description}
              </p>

              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Focus:</span>
                <span className={`font-semibold ${isSelected ? 'text-emerald-300' : 'text-slate-300'}`}>
                  {mode.targetFocus}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

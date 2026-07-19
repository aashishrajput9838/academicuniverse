'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Award, Calendar, TrendingUp } from 'lucide-react';
import { SkillRecordDTO, ProficiencyLevel } from '../types/skills';
import { cn } from '@/lib/utils';

const proficiencyColors: Record<ProficiencyLevel, string> = {
  BEGINNER: 'text-red-400 bg-red-400/10 border-red-400/20',
  INTERMEDIATE: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  ADVANCED: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  EXPERT: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
};

const proficiencyLabel: Record<ProficiencyLevel, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
  EXPERT: 'Expert',
};

interface SkillCardProps {
  skill: SkillRecordDTO;
  onSelect: (skill: SkillRecordDTO) => void;
  isSelected?: boolean;
}

export function SkillCard({ skill, onSelect, isSelected }: SkillCardProps) {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-200 cursor-pointer',
        'bg-slate-900/50 backdrop-blur-sm',
        isSelected
          ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10'
          : 'border-slate-700 hover:border-slate-600',
      )}
      onClick={() => onSelect(skill)}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-lg truncate">{skill.skillName}</h3>
            <p className="text-slate-400 text-sm mt-0.5">{skill.skillId}</p>
          </div>
          <span
            className={cn(
              'px-2.5 py-0.5 rounded-full text-xs font-medium border',
              proficiencyColors[skill.proficiencyLevel],
            )}
          >
            {proficiencyLabel[skill.proficiencyLevel]}
          </span>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-400">Proficiency</span>
              <span className="text-emerald-400 font-medium">{skill.proficiencyScore}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${skill.proficiencyScore}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1">
              <Award className="w-4 h-4" />
              {skill.evidenceCount} evidence
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(skill.lastVerifiedAt)}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-400 block">Category</span>
                <span className="text-white font-medium">{skill.skillCategory}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Status</span>
                <span className="text-white font-medium">{skill.status}</span>
              </div>
              <div>
                <span className="text-slate-400 block">First Seen</span>
                <span className="text-white font-medium">{formatDate(skill.firstSeenAt)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Evidence Count</span>
                <span className="text-white font-medium">{skill.evidenceCount}</span>
              </div>
            </div>
            {skill.aliases.length > 0 && (
              <div>
                <span className="text-slate-400 text-sm block mb-1">Aliases</span>
                <div className="flex flex-wrap gap-1.5">
                  {skill.aliases.map((alias, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-slate-800 text-slate-300 text-xs rounded-md border border-slate-700"
                    >
                      {alias}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(skill);
              }}
              className="w-full mt-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium transition-colors border border-emerald-500/20"
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              View Full Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

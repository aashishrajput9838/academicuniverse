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
  BEGINNER: 'Basic',
  INTERMEDIATE: 'Medium',
  ADVANCED: 'Advanced',
  EXPERT: 'Perfect',
};

interface SkillCardProps {
  skill: SkillRecordDTO;
  onSelect: (skill: SkillRecordDTO) => void;
  onEdit?: (skill: SkillRecordDTO) => void;
  isSelected?: boolean;
}

export function SkillCard({ skill, onSelect, onEdit, isSelected }: SkillCardProps) {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getVerificationBadge = (status?: string, confidence?: number) => {
    const conf = Math.round((confidence || 0.5) * 100);
    switch (status) {
      case 'VERIFIED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">✓ VERIFIED ({conf}%)</span>;
      case 'HIGH_CONFIDENCE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">HIGH CONF ({conf}%)</span>;
      case 'MEDIUM_CONFIDENCE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">MED CONF ({conf}%)</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">PENDING ({conf}%)</span>;
    }
  };

  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-200 cursor-pointer relative group',
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
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-white font-semibold text-lg truncate">{skill.skillName}</h3>
              {getVerificationBadge(skill.verificationStatus, skill.confidenceScore)}
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(skill);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-emerald-400 text-[10px] font-medium transition border border-slate-700"
                >
                  Edit
                </button>
              )}
            </div>
            <p className="text-slate-400 text-xs mt-0.5 font-medium flex items-center gap-2">
              <span className="text-emerald-400/90">{skill.skillCategory}</span>
              {skill.scoringModelVersion && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-500 border border-slate-700 font-mono">
                  {skill.scoringModelVersion}
                </span>
              )}
            </p>
          </div>
          <span
            className={cn(
              'px-2.5 py-0.5 rounded-full text-xs font-medium border ml-2 shrink-0',
              proficiencyColors[skill.proficiencyLevel],
            )}
          >
            {proficiencyLabel[skill.proficiencyLevel]}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Proficiency</span>
              <span className="text-emerald-400 font-semibold">{skill.proficiencyScore}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 border border-slate-700">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${skill.proficiencyScore}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Confidence</span>
              <span className="text-cyan-400 font-semibold">{Math.round((skill.confidenceScore || 0.5) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 border border-slate-700">
              <div
                className="bg-cyan-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.round((skill.confidenceScore || 0.5) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1 text-xs">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              {skill.evidenceCount} evidence artifacts
            </span>
            <span className="flex items-center gap-1 text-xs">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              {formatDate(skill.firstSeenAt)}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="text-slate-400 hover:text-white transition-colors p-1"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
            {skill.recruiterExplanation && (
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-1">
                <span className="text-emerald-400 font-semibold block text-[11px] uppercase tracking-wider">Recruiter Proof Summary</span>
                <p className="leading-relaxed text-slate-300">{skill.recruiterExplanation}</p>
              </div>
            )}

            {skill.scoreBreakdown && (
              <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80 space-y-2">
                <span className="text-slate-400 font-medium text-[11px] block uppercase tracking-wider">SIE-1.0 Score Breakdown</span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Volume Contribution:</span>
                    <span className="text-slate-200 font-mono">{skill.scoreBreakdown.volume} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Recency Weight:</span>
                    <span className="text-slate-200 font-mono">{skill.scoreBreakdown.recency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ownership Ratio:</span>
                    <span className="text-slate-200 font-mono">{Math.round((skill.scoreBreakdown.ownership || 1) * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Complexity Factor:</span>
                    <span className="text-slate-200 font-mono">{skill.scoreBreakdown.complexity}x</span>
                  </div>
                </div>
              </div>
            )}

            {skill.explanation && (
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Proficiency Score</span>
                  <span className="text-white font-medium">{skill.explanation.score}/100</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Level</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${proficiencyColors[skill.proficiencyLevel]}`}>
                    {skill.proficiencyLevel}
                  </span>
                </div>
                <div className="text-xs text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Thresholds:</span>
                    <span>INTERMEDIATE ≥{skill.explanation.thresholds.INTERMEDIATE} | ADVANCED ≥{skill.explanation.thresholds.ADVANCED} | EXPERT ≥{skill.explanation.thresholds.EXPERT}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Formula:</span>
                    <span className="text-slate-400">{skill.explanation.formula}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active evidence:</span>
                    <span className="text-slate-400">{skill.explanation.activeEvidenceCount} of {skill.explanation.evidenceCount}</span>
                  </div>
                </div>
                {skill.explanation.sourceBreakdown.length > 0 && (
                  <div className="text-xs text-slate-500">
                    <span className="block mb-1">Sources:</span>
                    {skill.explanation.sourceBreakdown.map((src, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-slate-400">{src.source} {src.isSourceDefault ? '(default)' : ''}</span>
                        <span className="text-slate-500">×{src.count} · w={src.sourceWeight.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-500 italic">{skill.explanation.description}</p>
              </div>
            )}

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

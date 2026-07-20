'use client';

import { useState } from 'react';
import { X, Calendar, MapPin, Tag, Link as LinkIcon } from 'lucide-react';
import { SkillRecordDTO, SkillDetailDTO, MissingEvidenceItem, ProficiencyLevel } from '../types/skills';
import { SkillCard } from './SkillCard';
import { EvidenceExplorer } from './EvidenceExplorer';
import { SkillTimeline } from './SkillTimeline';
import { SourceContributionChart } from './SourceContributionChart';
import { ConfidenceExplanation } from './ConfidenceExplanation';
import { MissingEvidencePanel } from './MissingEvidencePanel';
import { RelatedSkillsPanel } from './RelatedSkillsPanel';
import { cn } from '@/lib/utils';

const proficiencyColors: Record<ProficiencyLevel, string> = {
  BEGINNER: 'text-red-400 bg-red-400/10 border-red-400/20',
  INTERMEDIATE: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  ADVANCED: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  EXPERT: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
};

interface SkillDetailPanelProps {
  skill: SkillRecordDTO;
  detail: SkillDetailDTO | null;
  detailLoading: boolean;
  onClose: () => void;
}

export function SkillDetailPanel({ skill, detail, detailLoading, onClose }: SkillDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'timeline'>('overview');

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getMissingEvidence = () => {
    const missing: MissingEvidenceItem[] = [];
    const evidenceTypes = new Set(detail?.evidence.map(e => e.primarySource) || []);
    const isTechnical = skill.skillCategory === 'TECHNICAL';
    
    if (!evidenceTypes.has('GITHUB')) {
      missing.push({ type: 'GITHUB', label: 'GitHub Project', description: 'Add code repositories to demonstrate practical application' });
    }
    
    if (!evidenceTypes.has('PROJECT')) {
      missing.push({ type: 'PROJECT', label: 'Project', description: 'Submit a deployed project with:\n• Live URL\n• Screenshots\n• Supporting documentation' });
    }
    
    if (!evidenceTypes.has('CERTIFICATE')) {
      if (isTechnical) {
        missing.push({ type: 'CERTIFICATE', label: 'Certification (Optional)', description: 'Earn a recognized certificate in this skill area' });
      } else {
        missing.push({ type: 'CERTIFICATE', label: 'Certification', description: 'Earn a recognized certificate in this skill area' });
      }
    }
    
    return missing;
  };

  const getRelatedSkills = () => {
    if (!skill.aliases || skill.aliases.length === 0) return [];
    return skill.aliases.map(alias => ({
      name: alias,
      relationship: 'Known alias / related skill',
    }));
  };

  const avgConfidence = detail?.evidence.length
    ? detail.evidence.reduce((sum, e) => sum + e.confidence, 0) / detail.evidence.length
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-white">{skill.skillName}</h2>
            <p className="text-slate-400 text-sm mt-1">{skill.skillId} • {skill.skillCategory}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 px-6">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'evidence', label: 'Evidence' },
            { key: 'timeline', label: 'Timeline' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={cn(
                'px-4 py-3 text-sm font-medium transition-colors border-b-2',
                activeTab === tab.key
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {detailLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-32 bg-slate-800 rounded-lg" />
              <div className="h-32 bg-slate-800 rounded-lg" />
            </div>
          ) : (
            <div className="space-y-6">
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700">
                      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
                        Skill Details
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-400 text-sm block">Proficiency</span>
                          <span className="text-white font-medium">{skill.proficiencyScore}%</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-sm block">Level</span>
                          <span className="text-white font-medium">{skill.proficiencyLevel}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-sm block">Evidence Count</span>
                          <span className="text-white font-medium">{skill.evidenceCount}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-sm block">Confidence</span>
                          <span className="text-white font-medium">{Math.round(avgConfidence * 100)}%</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-sm block">First Detected</span>
                          <span className="text-white font-medium">{formatDate(skill.firstSeenAt)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-sm block">Last Verified</span>
                          <span className="text-white font-medium">{formatDate(skill.lastVerifiedAt)}</span>
                        </div>
                      </div>
                    </div>

                    {detail?.explanation && (
                      <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700">
                        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
                          Proficiency Breakdown
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">Score</span>
                            <span className="text-white font-medium">{detail.explanation.score}/100</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">Level</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${proficiencyColors[skill.proficiencyLevel]}`}>
                              {detail.explanation.level}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 space-y-1">
                            <div className="flex justify-between">
                              <span>Thresholds:</span>
                              <span>INTERMEDIATE ≥{detail.explanation.thresholds.INTERMEDIATE} | ADVANCED ≥{detail.explanation.thresholds.ADVANCED} | EXPERT ≥{detail.explanation.thresholds.EXPERT}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Formula:</span>
                              <span className="text-slate-400">{detail.explanation.formula}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Active evidence:</span>
                              <span className="text-slate-400">{detail.explanation.activeEvidenceCount} of {detail.explanation.evidenceCount}</span>
                            </div>
                          </div>
                          {detail.explanation.sourceBreakdown.length > 0 && (
                            <div className="text-xs text-slate-500 space-y-1">
                              <span className="block mb-1">Source weights:</span>
                              {detail.explanation.sourceBreakdown.map((src, idx) => (
                                <div key={idx} className="flex justify-between items-center">
                                  <span className="text-slate-400">{src.source} {src.isSourceDefault ? '(default)' : ''}</span>
                                  <span className="text-slate-500">×{src.count} · weight={src.sourceWeight.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-slate-500 italic">{detail.explanation.description}</p>
                        </div>
                      </div>
                    )}

                    <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700">
                      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
                        Confidence Explanation
                      </h3>
                      {detail?.evidence && detail.evidence.length > 0 ? (
                        <ConfidenceExplanation confidence={avgConfidence} evidence={detail.evidence} />
                      ) : (
                        <p className="text-slate-400 text-sm">No evidence available for confidence analysis.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700">
                      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
                        Source Contribution
                      </h3>
                      {detail?.evidence && detail.evidence.length > 0 ? (
                        <SourceContributionChart evidence={detail.evidence} />
                      ) : (
                        <p className="text-slate-400 text-sm">No evidence data available.</p>
                      )}
                    </div>

                    <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700">
                      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
                        Missing Evidence
                      </h3>
                      <MissingEvidencePanel missingItems={getMissingEvidence()} />
                    </div>

                    <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700">
                      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
                        Related Skills
                      </h3>
                      <RelatedSkillsPanel skills={getRelatedSkills()} />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'evidence' && (
                <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700">
                  <EvidenceExplorer evidence={detail?.evidence || []} />
                </div>
              )}

              {activeTab === 'timeline' && (
                <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700">
                  <SkillTimeline evidence={detail?.evidence || []} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

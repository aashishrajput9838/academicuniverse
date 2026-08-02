'use client';

import { useState } from 'react';
import { X, Check, Copy, Award, ShieldCheck, FileCheck, Layers } from 'lucide-react';
import { SkillRecordDTO } from '../types/skills';

interface RecruiterViewModalProps {
  skill: SkillRecordDTO | null;
  onClose: () => void;
}

export function RecruiterViewModal({ skill, onClose }: RecruiterViewModalProps) {
  const [copied, setCopied] = useState(false);

  if (!skill) return null;

  const confPercent = Math.round((skill.confidenceScore || 0.5) * 100);

  const proofText = `[Academic Universe Verified Skill Proof]
Skill: ${skill.skillName} (${skill.skillCategory})
Proficiency: ${skill.proficiencyScore}% (${skill.proficiencyLevel})
Confidence: ${confPercent}% (${skill.verificationStatus || 'VERIFIED'})
Evidence Artifacts: ${skill.evidenceCount} verified entries
Algorithm Version: ${skill.scoringModelVersion || 'SIE-1.0'}
Verification Proof: ${skill.recruiterExplanation || 'Supported by verified code artifacts and automated sync.'}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(proofText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Recruiter Proof & Evidence Report
              </h3>
              <p className="text-xs text-slate-400">
                {skill.skillName} • {skill.skillCategory} • Model: <span className="font-mono text-emerald-400">{skill.scoringModelVersion || 'SIE-1.0'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Top Verification Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 text-center">
              <span className="text-xs text-slate-400 block mb-1">Proficiency Score</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">{skill.proficiencyScore}%</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">{skill.proficiencyLevel}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 text-center">
              <span className="text-xs text-slate-400 block mb-1">Confidence Rating</span>
              <span className="text-2xl font-black text-cyan-400 font-mono">{confPercent}%</span>
              <span className="text-[10px] text-cyan-400/80 block mt-0.5 font-bold">{skill.verificationStatus || 'HIGH_CONFIDENCE'}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 text-center">
              <span className="text-xs text-slate-400 block mb-1">Verified Artifacts</span>
              <span className="text-2xl font-black text-white font-mono">{skill.evidenceCount}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Immutable Entries</span>
            </div>
          </div>

          {/* Recruiter Proof Synthesis Box */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4" /> Recruiter Proof Statement
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy Proof'}
              </button>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed font-sans pt-1">
              {skill.recruiterExplanation || 'Intermediate proficiency supported by verified code artifacts across multi-source repositories and automated intelligence evaluation.'}
            </p>
          </div>

          {/* Mathematical SIE-1.0 Breakdown */}
          {skill.scoreBreakdown && (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" /> Mathematical SIE-1.0 Formula Breakdown
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400">Code Volume:</span>
                  <span className="font-mono text-emerald-400 font-bold">{skill.scoreBreakdown.volume} pts</span>
                </div>
                <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400">Recency Weight:</span>
                  <span className="font-mono text-cyan-400 font-bold">{skill.scoreBreakdown.recency}</span>
                </div>
                <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400">Ownership Ratio:</span>
                  <span className="font-mono text-amber-400 font-bold">{Math.round((skill.scoreBreakdown.ownership || 1) * 100)}%</span>
                </div>
                <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400">Project Complexity:</span>
                  <span className="font-mono text-purple-400 font-bold">{skill.scoreBreakdown.complexity}x</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-500">
          <span>Academic Universe • Evidence Intelligence Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition"
          >
            Close Proof Report
          </button>
        </div>
      </div>
    </div>
  );
}

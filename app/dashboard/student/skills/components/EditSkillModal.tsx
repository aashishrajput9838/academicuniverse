'use client';

import { useState, useEffect } from 'react';
import { updateSkillApi, deleteSkillApi } from '../skillsApi';
import { X, AlertCircle, Loader2, Trash2, Save, Award, Sparkles, Sliders } from 'lucide-react';
import { SkillRecordDTO, ProficiencyLevel, SkillCategory } from '../types/skills';

interface EditSkillModalProps {
  skill: SkillRecordDTO | null;
  isOpen: boolean;
  onClose: () => void;
  backendToken: string;
  onSuccess: () => void;
}

const levelDefaults: Record<ProficiencyLevel, { label: string; sub: string; score: number; color: string }> = {
  BEGINNER: { label: 'Basic / Beginner', sub: 'Basic understanding (~35%)', score: 35, color: 'border-red-500/50 text-red-400 bg-red-500/10' },
  INTERMEDIATE: { label: 'Medium / Intermediate', sub: 'Practical experience (~60%)', score: 60, color: 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' },
  ADVANCED: { label: 'Advanced', sub: 'High proficiency (~80%)', score: 80, color: 'border-blue-500/50 text-blue-400 bg-blue-500/10' },
  EXPERT: { label: 'Perfect / Expert', sub: 'Mastery & top score (~95%)', score: 95, color: 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' },
};

export function EditSkillModal({
  skill,
  isOpen,
  onClose,
  backendToken,
  onSuccess,
}: EditSkillModalProps) {
  const [level, setLevel] = useState<ProficiencyLevel>(skill?.proficiencyLevel || 'INTERMEDIATE');
  const [score, setScore] = useState<number>(skill?.proficiencyScore || 50);
  const [category, setCategory] = useState<SkillCategory>(skill?.skillCategory || 'TECHNICAL');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisMsg, setAnalysisMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (skill) {
      setLevel(skill.proficiencyLevel || 'INTERMEDIATE');
      setScore(skill.proficiencyScore || levelDefaults[skill.proficiencyLevel || 'INTERMEDIATE'].score);
      setCategory(skill.skillCategory || 'TECHNICAL');
      setAnalysisMsg(null);
    }
  }, [skill]);

  if (!isOpen || !skill) return null;

  const handleLevelSelect = (selectedLevel: ProficiencyLevel) => {
    setLevel(selectedLevel);
    setScore(levelDefaults[selectedLevel].score);
  };

  const handleAnalysePerformance = () => {
    setAnalyzing(true);
    setAnalysisMsg(null);
    setTimeout(() => {
      // Analyze performance from evidence count and skill context
      const evidenceCount = skill.evidenceCount || 1;
      let calculatedScore = Math.min(98, Math.max(35, 50 + evidenceCount * 12));
      let calculatedLevel: ProficiencyLevel = 'INTERMEDIATE';

      if (calculatedScore >= 90) calculatedLevel = 'EXPERT';
      else if (calculatedScore >= 75) calculatedLevel = 'ADVANCED';
      else if (calculatedScore >= 50) calculatedLevel = 'INTERMEDIATE';
      else calculatedLevel = 'BEGINNER';

      setLevel(calculatedLevel);
      setScore(calculatedScore);
      setAnalyzing(false);
      setAnalysisMsg(`Analyzed based on ${evidenceCount} verified evidence record(s). Suggested proficiency: ${calculatedScore}% (${calculatedLevel}).`);
    }, 600);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await updateSkillApi(backendToken, skill.skillId, {
        proficiencyLevel: level,
        proficiencyScore: score,
        category,
        notes: notes || `Set proficiency to ${score}% (${level}) via Skills Intelligence`,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update skill');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to remove ${skill.skillName} from your profile?`)) return;

    setDeleting(true);
    setError(null);

    try {
      await deleteSkillApi(backendToken, skill.skillId);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete skill');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden relative">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Skill Intelligence: {skill.skillName}</h2>
              <p className="text-xs text-slate-400">Analyse and set your exact proficiency level & percentage</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleUpdate} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* AI Skill Performance Analyzer Button */}
          <div className="p-3.5 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Performance Analyzer
              </span>
              <button
                type="button"
                onClick={handleAnalysePerformance}
                disabled={analyzing}
                className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
              >
                {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Analyse My Skill
              </button>
            </div>
            {analysisMsg && (
              <p className="text-[11px] text-emerald-400/90 bg-emerald-950/40 p-2 rounded border border-emerald-800/40">
                {analysisMsg}
              </p>
            )}
          </div>

          {/* Proficiency Level Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Select Skill Level
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as ProficiencyLevel[]).map((lvl) => {
                const isSelected = level === lvl;
                const def = levelDefaults[lvl];
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleLevelSelect(lvl)}
                    className={`p-3 rounded-xl text-left border transition flex flex-col justify-between ${
                      isSelected
                        ? `${def.color} ring-1 ring-emerald-500/50 shadow-md`
                        : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-700/80'
                    }`}
                  >
                    <span className="text-xs font-bold">{def.label}</span>
                    <span className="text-[10px] opacity-80 mt-1">{def.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Proficiency Percentage Slider & Input */}
          <div className="space-y-2 p-3.5 bg-slate-800/50 border border-slate-700/50 rounded-xl">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                Proficiency Percentage
              </span>
              <span className="text-emerald-400 font-bold text-sm bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {score}%
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Basic (25%)</span>
              <span>Medium (50%)</span>
              <span>Advanced (75%)</span>
              <span>Perfect (100%)</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SkillCategory)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="TECHNICAL">Technical</option>
              <option value="SOFT">Soft Skills</option>
              <option value="LANGUAGE">Language</option>
              <option value="TOOL">Tools</option>
              <option value="DOMAIN_SPECIFIC">Domain Specific</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || saving}
              className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>Delete</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || deleting}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <Save className="w-3.5 h-3.5" />
                <span>Save Proficiency</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

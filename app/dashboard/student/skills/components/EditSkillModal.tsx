'use client';

import { useState } from 'react';
import { updateSkillApi, deleteSkillApi } from '../skillsApi';
import { X, AlertCircle, Loader2, Trash2, Save, Award } from 'lucide-react';
import { SkillRecordDTO, ProficiencyLevel, SkillCategory } from '../types/skills';

interface EditSkillModalProps {
  skill: SkillRecordDTO | null;
  isOpen: boolean;
  onClose: () => void;
  backendToken: string;
  onSuccess: () => void;
}

export function EditSkillModal({
  skill,
  isOpen,
  onClose,
  backendToken,
  onSuccess,
}: EditSkillModalProps) {
  const [level, setLevel] = useState<ProficiencyLevel>(skill?.proficiencyLevel || 'INTERMEDIATE');
  const [category, setCategory] = useState<SkillCategory>(skill?.skillCategory || 'TECHNICAL');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !skill) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await updateSkillApi(backendToken, skill.skillId, {
        proficiencyLevel: level,
        category,
        notes: notes || 'Updated via Skills Intelligence',
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
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden relative">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Manage Skill: {skill.skillName}</h2>
              <p className="text-xs text-slate-400">Update proficiency level or remove skill</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleUpdate} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Proficiency Level
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as ProficiencyLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevel(lvl)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border text-center transition ${
                    level === lvl
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {lvl}
                </button>
              ))}
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
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { SKILL_TAXONOMY_DICTIONARY, SkillTaxonomyItem } from '../data/skillTaxonomy';
import { addSkillsApi } from '../skillsApi';
import { X, Search, Check, AlertCircle, Plus, Loader2, Sparkles } from 'lucide-react';
import { SkillCategory, ProficiencyLevel, SkillSource } from '../types/skills';

interface AddSkillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  backendToken: string;
  existingSkillIds: Set<string>;
  onSuccess: () => void;
}

export function AddSkillsModal({
  isOpen,
  onClose,
  backendToken,
  existingSkillIds,
  onSuccess,
}: AddSkillsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSkills, setSelectedSkills] = useState<Map<string, SkillTaxonomyItem>>(new Map());
  const [customSkillName, setCustomSkillName] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<ProficiencyLevel>('INTERMEDIATE');
  const [selectedSource, setSelectedSource] = useState<SkillSource>('MANUAL');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredTaxonomy = useMemo(() => {
    return SKILL_TAXONOMY_DICTIONARY.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        item.subcategory.toLowerCase().includes(searchQuery.toLowerCase().trim());
      const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory || item.subcategory === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [searchQuery, selectedCategory]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    SKILL_TAXONOMY_DICTIONARY.forEach((item) => set.add(item.subcategory));
    return Array.from(set);
  }, []);

  const toggleSelectSkill = (item: SkillTaxonomyItem) => {
    setSelectedSkills((prev) => {
      const next = new Map(prev);
      if (next.has(item.name)) {
        next.delete(item.name);
      } else {
        next.set(item.name, item);
      }
      return next;
    });
  };

  const handleAddCustomSkill = () => {
    if (!customSkillName.trim()) return;
    const item: SkillTaxonomyItem = {
      name: customSkillName.trim(),
      category: 'TECHNICAL',
      subcategory: 'Custom Skill',
    };
    setSelectedSkills((prev) => new Map(prev).set(item.name, item));
    setCustomSkillName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSkills.size === 0) {
      setError('Please select or add at least one skill.');
      return;
    }

    setSaving(true);
    setError(null);

    const skillsPayload = Array.from(selectedSkills.values()).map((item) => ({
      skillName: item.name,
      category: item.category,
      proficiencyLevel: selectedLevel,
      source: selectedSource,
      notes: notes || `Direct skill entry via Skills Intelligence`,
    }));

    try {
      await addSkillsApi(backendToken, skillsPayload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save skills');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Add Core Skills</h2>
              <p className="text-xs text-slate-400">Select core technical & professional competencies to track</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Scrollable */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Search & Custom Add Bar */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search skills (e.g., React, Python, Docker, SQL)..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* Custom Skill Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customSkillName}
                onChange={(e) => setCustomSkillName(e.target.value)}
                placeholder="Add custom skill if not listed above..."
                className="flex-1 px-3.5 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 transition"
              />
              <button
                type="button"
                onClick={handleAddCustomSkill}
                disabled={!customSkillName.trim()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-semibold flex items-center gap-1 transition disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom</span>
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition border ${
                selectedCategory === 'ALL'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition border ${
                  selectedCategory === cat
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Multi-Select Skill Checkboxes Grid */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Select Skills ({selectedSkills.size} selected)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 max-h-52 overflow-y-auto p-1 border border-slate-800 rounded-xl bg-slate-950/40">
              {filteredTaxonomy.map((item) => {
                const isSelected = selectedSkills.has(item.name);
                const normalizedId = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                const isExisting = existingSkillIds.has(normalizedId);

                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => toggleSelectSkill(item)}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-semibold text-white">{item.name}</p>
                      <span className="text-[10px] text-slate-400 block">{item.subcategory}</span>
                      {isExisting && (
                        <span className="text-[9px] text-amber-400 font-medium block">
                          Exists (Will update)
                        </span>
                      )}
                    </div>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-slate-600'
                    }`}>
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Skill Level & Evidence Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Proficiency Level
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as ProficiencyLevel[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSelectedLevel(level)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border text-center transition ${
                      selectedLevel === level
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Evidence Source
              </label>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value as SkillSource)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500 transition"
              >
                <option value="MANUAL">Manual Student Entry</option>
                <option value="GITHUB">GitHub OAuth Repository</option>
                <option value="RESUME_BUILDER">Resume Builder Document</option>
                <option value="CERTIFICATE">Industry Certificate</option>
                <option value="RESEARCH">Research Wing Output</option>
                <option value="AI_INFERENCE">AI Skill Inference</option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                Evidence sources establish verification confidence scores.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {selectedSkills.size} {selectedSkills.size === 1 ? 'skill' : 'skills'} selected
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || selectedSkills.size === 0}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Save Skills to Profile</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

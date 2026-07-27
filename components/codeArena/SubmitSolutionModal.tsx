'use client';

import React, { useState } from 'react';
import { MessageSquare, Code, Github, Link as LinkIcon, Plus, X, Upload, Send } from 'lucide-react';
import { apiRequest } from '@/utils/api';

interface SubmitSolutionModalProps {
  issueId: string;
  issueTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SubmitSolutionModal: React.FC<SubmitSolutionModalProps> = ({
  issueId,
  issueTitle,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [explanation, setExplanation] = useState('');
  const [codeSnippets, setCodeSnippets] = useState<string[]>(['']);
  const [githubCommitUrl, setGithubCommitUrl] = useState('');
  const [githubPrUrl, setGithubPrUrl] = useState('');
  const [referencesInput, setReferencesInput] = useState('');
  const [references, setReferences] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddCodeSnippet = () => {
    setCodeSnippets([...codeSnippets, '']);
  };

  const handleUpdateCodeSnippet = (idx: number, val: string) => {
    const updated = [...codeSnippets];
    updated[idx] = val;
    setCodeSnippets(updated);
  };

  const handleRemoveCodeSnippet = (idx: number) => {
    setCodeSnippets(codeSnippets.filter((_, i) => i !== idx));
  };

  const handleAddReference = () => {
    if (referencesInput.trim() && !references.includes(referencesInput.trim())) {
      setReferences([...references, referencesInput.trim()]);
      setReferencesInput('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!explanation.trim()) {
      setErrorMsg('Please provide a detailed explanation of your solution.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const filteredSnippets = codeSnippets.filter((s) => s.trim().length > 0);

      await apiRequest(`/api/code-arena/solutions/${issueId}`, {
        method: 'POST',
        body: JSON.stringify({
          explanation,
          codeSnippets: filteredSnippets,
          githubCommitUrl: githubCommitUrl || undefined,
          githubPrUrl: githubPrUrl || undefined,
          references,
        }),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit solution');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-2xl w-full shadow-2xl text-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" /> Submit Solution
            </h3>
            <p className="text-xs text-slate-400 line-clamp-1">{issueTitle}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Explanation & Root Cause Analysis <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={5}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explain why the issue occurred and how your solution fixes it..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
            />
          </div>

          {/* Code Blocks */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">Code Snippets</label>
              <button
                type="button"
                onClick={handleAddCodeSnippet}
                className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Add Snippet Block
              </button>
            </div>

            <div className="space-y-3">
              {codeSnippets.map((snippet, idx) => (
                <div key={idx} className="relative">
                  <textarea
                    rows={4}
                    value={snippet}
                    onChange={(e) => handleUpdateCodeSnippet(idx, e.target.value)}
                    placeholder={`// Solution Code Block #${idx + 1}`}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                  {codeSnippets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCodeSnippet(idx)}
                      className="absolute top-2 right-2 p-1 text-slate-500 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* GitHub Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                <Github className="w-3.5 h-3.5 inline mr-1 text-slate-400" /> GitHub Commit URL (Optional)
              </label>
              <input
                type="url"
                value={githubCommitUrl}
                onChange={(e) => setGithubCommitUrl(e.target.value)}
                placeholder="https://github.com/user/repo/commit/..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                <Github className="w-3.5 h-3.5 inline mr-1 text-slate-400" /> GitHub PR URL (Optional)
              </label>
              <input
                type="url"
                value={githubPrUrl}
                onChange={(e) => setGithubPrUrl(e.target.value)}
                placeholder="https://github.com/user/repo/pull/..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !explanation.trim()}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Submit Solution
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

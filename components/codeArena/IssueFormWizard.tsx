'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Coins,
  FileCode,
  Layers,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Upload,
  AlertCircle,
  CheckCircle2,
  Lock,
  Github,
  Link as LinkIcon,
} from 'lucide-react';
import { ISSUE_CATEGORIES, IssueCategory, IssueDifficulty } from '@/backend/src/models/CodeArenaIssue';
import { apiRequest } from '@/utils/api';

interface IssueFormWizardProps {
  userWalletBalance: number;
  onDepositNeeded?: () => void;
}

export const IssueFormWizard: React.FC<IssueFormWizardProps> = ({
  userWalletBalance,
  onDepositNeeded,
}) => {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [currentOutput, setCurrentOutput] = useState('');
  const [errorLogs, setErrorLogs] = useState('');

  const [category, setCategory] = useState<IssueCategory>('Frontend');
  const [difficulty, setDifficulty] = useState<IssueDifficulty>('MEDIUM');
  const [programmingLanguage, setProgrammingLanguage] = useState('');
  const [framework, setFramework] = useState('');
  const [techStackInput, setTechStackInput] = useState('');
  const [techStack, setTechStack] = useState<string[]>([]);
  const [githubRepo, setGithubRepo] = useState('');

  const [rewardAmount, setRewardAmount] = useState<number>(100);
  const [attachments, setAttachments] = useState<
    { storageId: string; fileName: string; mimeType: string; size: number }[]
  >([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  const handleAddTech = () => {
    if (techStackInput.trim() && !techStack.includes(techStackInput.trim())) {
      setTechStack([...techStack, techStackInput.trim()]);
      setTechStackInput('');
    }
  };

  const handleRemoveTech = (item: string) => {
    setTechStack(techStack.filter((t) => t !== item));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingFile(true);
      setErrorMsg(null);
      const formData = new FormData();
      formData.append('file', file);

      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5003';

      const res = await fetch(`${apiBase}/api/code-arena/attachments/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Upload failed with status ${res.status}`);
      }

      const data = await res.json();
      setAttachments([...attachments, data.data]);
    } catch (err: any) {
      setErrorMsg(err.message || 'File upload failed');
    } font: {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userWalletBalance < rewardAmount) {
      setErrorMsg(`Insufficient wallet balance (${userWalletBalance} CR). Deposit at least ${rewardAmount - userWalletBalance} CR to proceed.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const payload = {
        title,
        description,
        expectedOutput: expectedOutput || undefined,
        currentOutput: currentOutput || undefined,
        errorLogs: errorLogs || undefined,
        category,
        difficulty,
        programmingLanguage: programmingLanguage || undefined,
        framework: framework || undefined,
        techStack: techStack.length > 0 ? techStack : [category],
        githubRepo: githubRepo || undefined,
        rewardAmount,
        attachments,
      };

      const res = await apiRequest('/api/code-arena/issues', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      router.push(`/dashboard/student/code/issues/${res.data._id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create issue.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl max-w-4xl mx-auto text-white">
      {/* Wizard Progress Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileCode className="w-5 h-5 text-emerald-400" /> Post New Issue to Code Arena
          </h2>
          <p className="text-xs text-slate-400">Collaborate with peers to solve real technical challenges</p>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center gap-2">
          {[
            { num: 1, label: 'Problem Details' },
            { num: 2, label: 'Stack & Category' },
            { num: 3, label: 'Escrow & Reward' },
          ].map((s) => (
            <div
              key={s.num}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                step === s.num
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : step > s.num
                  ? 'bg-slate-800 border-slate-700 text-slate-300'
                  : 'bg-slate-900 border-slate-800 text-slate-600'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                step === s.num ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
              }`}>
                {s.num}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ─── STEP 1: Problem Details ─── */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Issue Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Next.js 15 Hydration Error when rendering dynamic Canvas component"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Detailed Problem Description (Markdown Supported) <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the technical issue in detail. What are you trying to accomplish? What steps lead to the error?"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Expected Behavior / Output</label>
              <textarea
                rows={3}
                value={expectedOutput}
                onChange={(e) => setExpectedOutput(e.target.value)}
                placeholder="What output or behavior did you expect?"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Current Output / Behavior</label>
              <textarea
                rows={3}
                value={currentOutput}
                onChange={(e) => setCurrentOutput(e.target.value)}
                placeholder="What output or error are you currently seeing?"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Error Logs / Stack Traces</label>
            <textarea
              rows={3}
              value={errorLogs}
              onChange={(e) => setErrorLogs(e.target.value)}
              placeholder="Paste terminal stack traces, console errors, or server logs..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              disabled={!title.trim() || !description.trim()}
              onClick={() => setStep(2)}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition flex items-center gap-2"
            >
              Next: Stack & Category <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 2: Stack & Category ─── */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as IssueCategory)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {ISSUE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Estimated Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as IssueDifficulty)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="EASY">Easy (Minor bug / simple fix)</option>
                <option value="MEDIUM">Medium (Moderate logic / API issue)</option>
                <option value="HARD">Hard (Complex architecture / memory leak)</option>
                <option value="EXPERT">Expert (Deep optimization / low-level)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Language (Optional)</label>
              <input
                type="text"
                value={programmingLanguage}
                onChange={(e) => setProgrammingLanguage(e.target.value)}
                placeholder="e.g. TypeScript, Python, C++"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Framework (Optional)</label>
              <input
                type="text"
                value={framework}
                onChange={(e) => setFramework(e.target.value)}
                placeholder="e.g. Next.js, Django, Spring Boot"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tech Stack Tags</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={techStackInput}
                onChange={(e) => setTechStackInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTech();
                  }
                }}
                placeholder="Type tag and press Add (e.g. tailwind, mongodb)"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleAddTech}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {techStack.map((tech) => (
                <span
                  key={tech}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs"
                >
                  #{tech}
                  <button type="button" onClick={() => handleRemoveTech(tech)} className="hover:text-red-400">
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              <Github className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
              GitHub Repository Link (Optional)
            </label>
            <input
              type="url"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              placeholder="https://github.com/username/repo"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center gap-2"
            >
              Next: Escrow & Reward <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: Escrow & Reward ─── */}
      {step === 3 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5">
            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" /> Reward Escrow Setup
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              Academic Universe locks your reward in escrow. The reward is released to the solver only when you explicitly accept their solution.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Reward Amount (CR)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    required
                    value={rewardAmount}
                    onChange={(e) => setRewardAmount(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-12 py-2.5 text-base font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    CR
                  </span>
                </div>
              </div>

              <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between">
                <span className="text-[11px] text-slate-400">Your Current Wallet Balance</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-lg font-bold text-emerald-400">{userWalletBalance} CR</span>
                  {userWalletBalance < rewardAmount && (
                    <button
                      type="button"
                      onClick={onDepositNeeded}
                      className="text-xs text-amber-400 hover:underline font-semibold"
                    >
                      Deposit Funds
                    </button>
                  )}
                </div>
              </div>
            </div>

            {userWalletBalance < rewardAmount && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
                <span>You need {rewardAmount - userWalletBalance} more credits in your wallet to lock this reward.</span>
              </div>
            )}
          </div>

          {/* Attachment Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              <Upload className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
              Attachments (Screenshots, Log Files, Code Zips)
            </label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white flex items-center gap-2">
                {uploadingFile ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-emerald-400" /> Select File
                  </>
                )}
                <input type="file" onChange={handleFileUpload} className="hidden" />
              </label>

              <span className="text-[11px] text-slate-400">Max 50MB. PNG, JPG, MP4, ZIP, LOG, PDF supported.</span>
            </div>

            {attachments.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs"
                  >
                    <span className="text-slate-300 truncate">{att.fileName}</span>
                    <span className="text-[10px] text-slate-500">{Math.round(att.size / 1024)} KB</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting || userWalletBalance < rewardAmount}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  Locking Escrow & Posting Issue...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" /> Lock {rewardAmount} CR & Publish Issue
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

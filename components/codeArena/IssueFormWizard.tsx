'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileCode,
  Layers,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Upload,
  AlertCircle,
  CheckCircle2,
  HeartHandshake,
  Github,
  Coins,
} from 'lucide-react';
import { apiRequest } from '@/utils/api';

const ISSUE_CATEGORIES = [
  'Frontend', 'Backend', 'Full Stack', 'Java', 'Python', 'C++',
  'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Express',
  'Spring Boot', 'Android', 'Flutter', 'AI', 'Machine Learning',
  'Data Science', 'Docker', 'DevOps', 'Cloud', 'MongoDB', 'MySQL',
  'PostgreSQL', 'Firebase', 'Git', 'Cyber Security', 'Blockchain',
  'Research', 'Other',
] as const;

type IssueCategory = typeof ISSUE_CATEGORIES[number];
type IssueDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';

interface IssueFormWizardProps {
  userArenaPoints: number;
}

export const IssueFormWizard: React.FC<IssueFormWizardProps> = ({
  userArenaPoints,
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

  const remainingBalance = userArenaPoints - rewardAmount;
  const isCommunityHelp = rewardAmount === 0;

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
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rewardAmount > 0 && userArenaPoints < rewardAmount) {
      setErrorMsg(`Insufficient Arena Points. Current: ${userArenaPoints} AP, Required: ${rewardAmount} AP.`);
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
      {/* Wizard Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileCode className="w-5 h-5 text-emerald-400" /> Post New Technical Issue
          </h2>
          <p className="text-xs text-slate-400">Collaborate with peers using Arena Points (AP) or Community Help</p>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center gap-2">
          {[
            { num: 1, label: 'Problem Details' },
            { num: 2, label: 'Stack & Category' },
            { num: 3, label: 'Arena Points Reward' },
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

      {/* STEP 1: Problem Details */}
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

      {/* STEP 2: Stack & Category */}
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
              Next: Arena Points Reward <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Arena Points Reward */}
      {step === 3 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5">
            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              ⚡ Select Arena Points (AP) Reward
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              Reward solver developers with Arena Points. If set to 0 AP, your issue will be published under <strong>Community Help</strong> mode.
            </p>

            {/* AP Presets */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-5">
              {[
                { amount: 0, label: '0 AP (Community Help)' },
                { amount: 25, label: '25 AP' },
                { amount: 50, label: '50 AP' },
                { amount: 100, label: '100 AP' },
                { amount: 250, label: '250 AP' },
                { amount: 500, label: '500 AP' },
              ].map((preset) => (
                <button
                  type="button"
                  key={preset.amount}
                  onClick={() => setRewardAmount(preset.amount)}
                  className={`p-3 rounded-xl border text-xs font-bold text-center transition ${
                    rewardAmount === preset.amount
                      ? preset.amount === 0
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300 shadow-md'
                        : 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Live Balance Calculation Box */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block mb-1">Current AP</span>
                <span className="text-base font-extrabold text-white">{userArenaPoints} AP</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-semibold block mb-1">AP Reward</span>
                <span className={`text-base font-extrabold ${rewardAmount === 0 ? 'text-teal-400' : 'text-amber-400'}`}>
                  {rewardAmount === 0 ? '0 AP' : `-${rewardAmount} AP`}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-semibold block mb-1">Remaining AP</span>
                <span className={`text-base font-extrabold ${remainingBalance < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {remainingBalance} AP
                </span>
              </div>
            </div>

            {/* Insufficient AP Warning */}
            {remainingBalance < 0 && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Insufficient Arena Points. Earn more AP by solving community issues or daily check-ins.</span>
              </div>
            )}
          </div>

          {/* Attachments */}
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

          {/* Actions */}
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
              disabled={isSubmitting || remainingBalance < 0}
              className={`px-6 py-3 rounded-xl font-bold text-xs transition shadow-lg flex items-center gap-2 ${
                isCommunityHelp
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 shadow-teal-500/20'
                  : 'bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 shadow-amber-500/20 disabled:opacity-50'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  Publishing Issue...
                </>
              ) : isCommunityHelp ? (
                <>
                  <HeartHandshake className="w-4 h-4" /> Publish Community Issue
                </>
              ) : (
                <>
                  ⚡ Publish Issue (-{rewardAmount} AP)
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

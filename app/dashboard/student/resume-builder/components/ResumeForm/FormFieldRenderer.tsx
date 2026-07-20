'use client';

import type { TemplateQuestion } from '@/components/Resume/types/api';

interface FormFieldRendererProps {
  question: TemplateQuestion;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function FormFieldRenderer({ question, value, onChange, error }: FormFieldRendererProps) {
  const isTextarea = question.type === 'textarea';

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-white flex items-center gap-1">
        {question.question}
        {question.aiEnhanceable && (
          <span className="text-xs text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
            AI
          </span>
        )}
      </label>
      {isTextarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${question.question.toLowerCase()}...`}
          className="w-full min-h-[120px] px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${question.question.toLowerCase()}...`}
          className="w-full h-10 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
        />
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

'use client';

interface GenerationLoadingProps {
  message?: string;
}

export function GenerationLoading({ message = 'Generating your resume...' }: GenerationLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-slate-400 text-sm">{message}</p>
    </div>
  );
}

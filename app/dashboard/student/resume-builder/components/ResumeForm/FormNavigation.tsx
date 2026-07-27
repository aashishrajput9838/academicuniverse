'use client';

interface FormNavigationProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  canProceed: boolean;
  isSubmitting?: boolean;
  nextLabel?: string;
  onAutoFill?: () => void;
}

export function FormNavigation({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  canProceed,
  isSubmitting = false,
  nextLabel,
  onAutoFill,
}: FormNavigationProps) {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const isDev = process.env.NODE_ENV !== 'production';

  return (
    <div className="flex items-center justify-between pt-6 border-t border-slate-700">
      <button
        type="button"
        onClick={onPrevious}
        disabled={isFirstStep}
        className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600"
      >
        Previous
      </button>
      <div className="text-sm text-slate-400">
        Step {currentStep + 1} of {totalSteps}
      </div>
      <div className="flex items-center space-x-3">
        {isDev && onAutoFill && (
          <button
            type="button"
            onClick={onAutoFill}
            className="px-3.5 py-2 bg-purple-900/40 hover:bg-purple-800/50 text-purple-300 border border-purple-500/40 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Auto-fill form with realistic sample resume data (Dev Only)"
          >
            <span>✨</span>
            <span>AI Auto Fill (Dev)</span>
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed || isSubmitting}
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {nextLabel || (isLastStep ? 'Finish' : 'Next')}
        </button>
      </div>
    </div>
  );
}

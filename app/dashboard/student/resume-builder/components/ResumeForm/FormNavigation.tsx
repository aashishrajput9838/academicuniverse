'use client';

interface FormNavigationProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  canProceed: boolean;
  isSubmitting?: boolean;
}

export function FormNavigation({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  canProceed,
  isSubmitting = false,
}: FormNavigationProps) {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

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
      <button
        type="button"
        onClick={onNext}
        disabled={!canProceed || isSubmitting}
        className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLastStep ? 'Finish' : 'Next'}
      </button>
    </div>
  );
}

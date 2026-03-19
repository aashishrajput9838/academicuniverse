import ResumeBuilder from '@/components/Resume/ResumeBuilder';

export default function ResumeBuilderPage() {
  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
        <h1 className="text-3xl font-bold text-white mb-2">Resume Builder</h1>
        <p className="text-slate-400">
          Select a template provided by your faculty, fill out your details, and instantly generate your customized resume in PDF or DOCX format.
        </p>
      </div>

      <ResumeBuilder />
    </div>
  );
}

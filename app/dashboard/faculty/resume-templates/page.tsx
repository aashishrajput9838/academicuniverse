'use client';

import { useState } from 'react';
import { TemplateUploadForm } from './components/TemplateUploadForm';
import { TemplateList } from './components/TemplateList';

export default function ResumeTemplatesPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
        <h1 className="text-3xl font-bold text-white mb-2">Resume Templates</h1>
        <p className="text-slate-400">
          Upload and manage DOCX templates for your students to use. Use placeholders like {'{{name}}'}, {'{{skills}}'} to inject data.
        </p>
      </div>

      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-4">Upload New Template</h2>
        <TemplateUploadForm onUploadSuccess={handleUploadSuccess} />
      </div>

      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-4">Uploaded Templates</h2>
        <TemplateList refreshKey={refreshKey} />
      </div>
    </div>
  );
}

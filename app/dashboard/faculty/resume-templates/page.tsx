'use client';

import React, { useState } from 'react';

export default function ResumeTemplatesPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
        <h1 className="text-3xl font-bold text-white mb-2">Resume Templates</h1>
        <p className="text-slate-400">
          Upload and manage DOCX templates for your students to use. Use placeholders like {'{{name}}'}, {'{{skills}}'} to inject data.
        </p>
      </div>

      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700 shadow-xl">
        <p className="text-slate-400 text-center py-8">
          Template management interface coming in Phase 6.
        </p>
      </div>
    </div>
  );
}

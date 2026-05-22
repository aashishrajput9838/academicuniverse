"use client";

import { useState } from 'react';

export default function TestCrashPage() {
    const [shouldCrash, setShouldCrash] = useState(false);

    if (shouldCrash) {
        // This simulates a deep React unhandled rendering exception
        throw new Error('TEST_CRASH: Deliberate Front-End React UI Failure!');
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-200">
            <h1 className="text-3xl font-bold mb-6 text-slate-100">Frontend Crash Test</h1>
            <p className="mb-8 text-slate-400">Clicking the button below will intentionally break this React page.</p>
            <button 
                onClick={() => setShouldCrash(true)}
                className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-xl text-white font-bold transition-colors shadow-lg shadow-red-500/20"
            >
                Trigger Fatal React Crash
            </button>
        </div>
    );
}

"use client";

import React from 'react';

export interface AnalysisData {
    id?: string;
    originalSentence: string;
    correctedSentence: string;
    improvedSentence: string;
    fluencyScore: number;
    shortTip: string;
    pronunciationFeedback?: string;
}

interface AnalysisResultProps {
    result: AnalysisData | null;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ result }) => {
    if (!result) return null;

    const getScoreColor = (score: number) => {
        if (score >= 8) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
        if (score >= 5) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
        return 'text-red-400 bg-red-500/10 border-red-500/20';
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mt-8 mb-4">AI Analysis Report</h3>
            
            <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700 shadow-xl">
                    <div className="text-sm text-slate-400 mb-1 flex items-center gap-2">
                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        Original
                    </div>
                    <p className="text-white bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 line-through decoration-red-500/50">{result.originalSentence}</p>
                </div>

                <div className="bg-emerald-900/20 rounded-xl p-5 border border-emerald-800/30 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
                    <div className="text-sm text-emerald-400 mb-1 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Grammatically Correct
                    </div>
                    <p className="text-white bg-emerald-950/30 p-3 rounded-lg border border-emerald-800/50 font-medium relative z-10">{result.correctedSentence}</p>
                </div>
            </div>

            <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 rounded-xl p-6 border border-blue-800/30 shadow-xl relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/10 blur-3xl rounded-full"></div>
                
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
                    <div className="flex-1">
                        <div className="text-sm text-blue-300 font-medium mb-2 flex items-center gap-2 uppercase tracking-wider">
                            <span className="text-lg">✨</span> Professional Vocabulary Version
                        </div>
                        <p className="text-white text-lg font-medium leading-relaxed">
                            "{result.improvedSentence}"
                        </p>
                    </div>

                    <div className="flex flex-col items-center justify-center shrink-0 w-32 h-32 bg-slate-900/60 rounded-full border-4 border-slate-800 shadow-inner">
                        <span className={`text-4xl font-bold ${getScoreColor(result.fluencyScore).split(' ')[0]}`}>
                            {result.fluencyScore}
                        </span>
                        <span className="text-xs text-slate-400 font-medium uppercase tracking-widest mt-1">Fluency</span>
                    </div>
                </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700 flex gap-4 mt-6">
                <div className="p-3 bg-amber-500/20 rounded-xl h-fit">
                    <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                    <h4 className="text-white font-semibold mb-1">Coach's Tip</h4>
                    <p className="text-slate-300">{result.shortTip}</p>
                </div>
            </div>

            {result.pronunciationFeedback && (
                <div className="bg-rose-900/20 rounded-xl p-5 border border-rose-800/30 flex gap-4 mt-2">
                    <div className="p-3 bg-rose-500/20 rounded-xl h-fit">
                        <svg className="w-6 h-6 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-1">Pronunciation Feedback</h4>
                        <p className="text-slate-300">{result.pronunciationFeedback}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

"use client";

import React from 'react';
import { AnalysisData } from './AnalysisResult';

interface HistoryListProps {
    history: AnalysisData[];
    loading: boolean;
}

export const HistoryList: React.FC<HistoryListProps> = ({ history, loading }) => {
    if (loading) {
        return <div className="text-slate-400 mt-6">Loading past sentences...</div>;
    }

    if (history.length === 0) {
        return (
            <div className="bg-slate-800/30 rounded-xl p-8 text-center border border-slate-700 mt-6">
                <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </div>
                <p className="text-slate-400">No history yet. Start speaking or typing above!</p>
            </div>
        );
    }

    return (
        <div className="mt-8">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Your Practice History
            </h3>
            
            <div className="space-y-4">
                {history.map((item, index) => (
                    <div key={item.id || index} className="bg-slate-800/40 hover:bg-slate-800/60 transition-colors rounded-xl p-4 border border-slate-700">
                        <div className="flex justify-between items-start mb-3">
                            <span className="text-sm font-medium text-slate-400">Original Setup</span>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${item.fluencyScore >= 8 ? 'bg-emerald-500/20 text-emerald-400' : item.fluencyScore >= 5 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                                Score: {item.fluencyScore}/10
                            </span>
                        </div>
                        <p className="text-slate-300 text-sm mb-3">"{item.originalSentence}"</p>
                        
                        <div className="border-t border-slate-700/50 pt-3 mt-3">
                            <span className="text-xs text-blue-400 font-medium uppercase tracking-wider block mb-1">Better Version</span>
                            <p className="text-white font-medium">{item.improvedSentence}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

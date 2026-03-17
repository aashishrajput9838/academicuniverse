"use client";

import React, { useState, useEffect } from 'react';

const CHALLENGES = [
    "Explain a complex technical concept to a non-technical person.",
    "Describe your biggest academic failing and what you learned.",
    "Argue for why your favorite programming language is the best.",
    "Tell me about a time you had a disagreement with a team member.",
    "Explain what a REST API is referencing real-world examples.",
    "Pitch your final year project idea in exactly three sentences.",
    "Describe your ideal work environment.",
    "How do you handle scope creep in a group project?",
];

interface DailyChallengeProps {
    onChallengeSelected: (text: string) => void;
}

export const DailyChallenge: React.FC<DailyChallengeProps> = ({ onChallengeSelected }) => {
    const [challenge, setChallenge] = useState("");

    useEffect(() => {
        // Pseudo-random daily concept based on date
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
        const index = dayOfYear % CHALLENGES.length;
        setChallenge(CHALLENGES[index]);
    }, []);

    if (!challenge) return null;

    return (
        <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 rounded-2xl p-6 border border-purple-500/30 shadow-lg mb-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-purple-400 font-semibold mb-1 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        Daily Speaking Challenge
                    </h3>
                    <p className="text-white font-medium text-lg mt-2">"{challenge}"</p>
                    <p className="text-slate-400 text-sm mt-3">Practice answering this prompt aloud. The AI will evaluate your fluency, clarity, and grammatical structure.</p>
                </div>
            </div>
        </div>
    );
};

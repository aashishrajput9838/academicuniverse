"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { apiRequest } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import { SentenceInput } from '@/components/SoftSkills/SentenceInput';
import { AnalysisResult, AnalysisData } from '@/components/SoftSkills/AnalysisResult';
import { HistoryList } from '@/components/SoftSkills/HistoryList';
import { DailyChallenge } from '@/components/SoftSkills/DailyChallenge';

export default function SoftSkillsLabPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [loading, setLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [result, setResult] = useState<AnalysisData | null>(null);
    const [history, setHistory] = useState<AnalysisData[]>([]);

    useEffect(() => {
        if (user) {
            fetchHistory();
        }
    }, [user]);

    const fetchHistory = async () => {
        try {
            setHistoryLoading(true);
            const token = localStorage.getItem('authToken');
            if (!token) throw new Error("No token found");
            const res = await apiRequest('/api/softskills/history', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(res.data?.history || res.history || []);
        } catch (error) {
            console.error('Error fetching history:', error);
            toast({
                title: "History Error",
                description: "Failed to load past practice sessions.",
                variant: "destructive"
            });
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleSentenceSubmit = async (text: string) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('authToken');
            if (!token) throw new Error("No token found");
            
            const res = await apiRequest('/api/softskills/improve', {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ originalSentence: text })
            });
            
            const analysisData = res.data.analysis;
            setResult(analysisData);
            
            // Instantly prepend to history for UX
            setHistory(prev => [analysisData, ...prev]);
            
            toast({
                title: "Analysis Complete",
                description: "Your sentence has been evaluated.",
            });
            
        } catch (error: any) {
            console.error('Error analyzing sentence:', error);
            toast({
                title: "Analysis Failed",
                description: error.response?.data?.error || "Failed to analyze your sentence. Please try again.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto min-h-screen">
            <div className="mb-8">
                <h1 className="text-3xl font-bold border-b border-blue-500/30 pb-4 flex items-center gap-3">
                    <span className="text-4xl">🎙️</span>
                    <span className="bg-gradient-to-r from-blue-400 to-indigo-400 text-transparent bg-clip-text">Soft Skills Lab</span>
                </h1>
                <p className="text-slate-400 mt-4 text-lg">
                    Practice your verbal and written communication. The AI engine will critique your grammar, rate your fluency, and construct better, professional variants of your sentences.
                </p>
            </div>

            <DailyChallenge onChallengeSelected={() => {}} />

            <SentenceInput onSubmit={handleSentenceSubmit} loading={loading} />

            <div className="mt-8">
                <AnalysisResult result={result} />
            </div>

            <div className="mt-12">
                <HistoryList history={history} loading={historyLoading} />
            </div>
        </div>
    );
}

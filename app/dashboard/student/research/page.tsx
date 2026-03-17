"use client";

import React, { useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/utils/api';
import TopicGenerator from '@/components/ResearchWing/TopicGenerator';
import OutlineGenerator from '@/components/ResearchWing/OutlineGenerator';
import ContentWriter from '@/components/ResearchWing/ContentWriter';
import FinalizePaper from '@/components/ResearchWing/FinalizePaper';
import FinalExport from '@/components/ResearchWing/FinalExport';
import ResearchHistory from '@/components/ResearchWing/ResearchHistory';

export interface ResearchPaperData {
    id?: string;
    topic: string;
    outline: any[];
    content: Record<string, string>;
    abstract: string;
    citations: any;
}

const STEPS = [
    { id: 'topic', title: '1. Topic Generation' },
    { id: 'outline', title: '2. Research Outline' },
    { id: 'content', title: '3. Write & Improve' },
    { id: 'abstract', title: '4. Abstract & Citations' },
    { id: 'export', title: '5. Final Paper' }
];

export default function ResearchWingPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [currentStep, setCurrentStep] = useState(0);
    const [paperData, setPaperData] = useState<ResearchPaperData>({
        topic: '',
        outline: [],
        content: {},
        abstract: '',
        citations: []
    });
    
    // UI states
    const [saving, setSaving] = useState(false);
    const [viewMode, setViewMode] = useState<'editor' | 'history'>('editor');

    const handleSave = async (dataToSave = paperData) => {
        try {
            setSaving(true);
            const token = localStorage.getItem('authToken');
            if (!token) throw new Error("Authentication token not found");

            const res = await apiRequest('/api/research/save', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataToSave)
            });

            if (res.id && !paperData.id) {
                setPaperData(prev => ({ ...prev, id: res.id }));
            }
            
            toast({ title: 'Saved successfully' });
        } catch (error: any) {
            console.error("Save error:", error);
            toast({ 
                title: 'Save Failed', 
                description: error.message || 'Could not save research progress',
                variant: 'destructive' 
            });
        } finally {
            setSaving(false);
        }
    };

    const nextStep = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(s => s + 1);
            if (paperData.topic) handleSave(); // Auto-save on next step
        }
    };

    const prevStep = () => {
        if (currentStep > 0) setCurrentStep(s => s - 1);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 text-transparent bg-clip-text flex items-center gap-3">
                        <span className="text-4xl">🔬</span>
                        Research Wing
                    </h1>
                    <p className="text-slate-400 mt-2">
                        AI-powered research assistant to formulate, outline, and refine your academic papers.
                    </p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={() => setViewMode('editor')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'editor' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                        Active Paper
                    </button>
                    <button 
                        onClick={() => setViewMode('history')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'history' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                        History Library
                    </button>
                </div>
            </div>

            {viewMode === 'editor' && (
                <>
                    {/* Stepper Navigation */}
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center overflow-x-auto">
                        {STEPS.map((step, idx) => (
                            <div 
                                key={step.id} 
                                className={`flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-lg cursor-pointer ${currentStep === idx ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : currentStep > idx ? 'text-emerald-400' : 'text-slate-500'}`}
                                onClick={() => setCurrentStep(idx)}
                            >
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentStep === idx ? 'bg-blue-500 text-white' : currentStep > idx ? 'bg-emerald-500 text-white' : 'bg-slate-700'}`}>
                                    {currentStep > idx ? '✓' : idx + 1}
                                </div>
                                {step.title}
                            </div>
                        ))}
                    </div>

                    {/* Step Content Area */}
                    <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 min-h-[500px]">
                        {currentStep === 0 && (
                            <TopicGenerator 
                                onTopicSelected={(topic: string) => {
                                    setPaperData(prev => ({ ...prev, topic }));
                                    nextStep();
                                }} 
                                currentTopic={paperData.topic}
                            />
                        )}
                        
                        {currentStep === 1 && (
                            <OutlineGenerator
                                topic={paperData.topic}
                                outline={paperData.outline}
                                onOutlineGenerated={(outline: any[]) => {
                                    setPaperData(prev => ({ ...prev, outline }));
                                }}
                            />
                        )}
                        
                        {/* Step content routing */}
                        {currentStep === 2 && (
                            <ContentWriter
                                outline={paperData.outline}
                                content={paperData.content}
                                onContentChange={(newContent) => setPaperData(prev => ({ ...prev, content: newContent }))}
                            />
                        )}
                        
                        {currentStep === 3 && (
                            <FinalizePaper
                                content={paperData.content}
                                abstract={paperData.abstract}
                                citations={paperData.citations}
                                onAbstractGenerated={(abstract) => setPaperData(prev => ({ ...prev, abstract }))}
                                onCitationsGenerated={(citations) => setPaperData(prev => ({ ...prev, citations }))}
                            />
                        )}
                        
                        {currentStep === 4 && (
                            <FinalExport paperData={paperData} />
                        )}
                    </div>

                    {/* Footer Controls */}
                    <div className="flex justify-between items-center pt-4">
                        <button 
                            onClick={prevStep}
                            disabled={currentStep === 0}
                            className="px-6 py-2 rounded-lg font-medium bg-slate-700 text-white disabled:opacity-50 hover:bg-slate-600 transition"
                        >
                            Back
                        </button>
                        
                        <div className="flex gap-4">
                            <button 
                                onClick={() => handleSave()}
                                disabled={saving || !paperData.topic}
                                className="px-6 py-2 rounded-lg font-medium border border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 transition disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Draft'}
                            </button>
                            
                            <button 
                                onClick={nextStep}
                                disabled={currentStep === STEPS.length - 1}
                                className="px-6 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-500 transition disabled:opacity-50"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </>
            )}

            {viewMode === 'history' && (
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 min-h-[500px]">
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 text-transparent bg-clip-text mb-6">Your Past Research Library</h2>
                    <ResearchHistory 
                        onSelectPaper={(paper) => {
                            setPaperData(paper);
                            setCurrentStep(0); // Optional: Could read progress and jump to highest step
                            setViewMode('editor');
                        }} 
                    />
                </div>
            )}
        </div>
    );
}
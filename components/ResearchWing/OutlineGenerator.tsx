import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw } from 'lucide-react';

interface OutlineItem {
    title: string;
    points: string[];
}

interface OutlineGeneratorProps {
    topic: string;
    outline: OutlineItem[];
    onOutlineGenerated: (outline: OutlineItem[]) => void;
}

export default function OutlineGenerator({ topic, outline, onOutlineGenerated }: OutlineGeneratorProps) {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    // Auto-generate if empty and we have a topic
    useEffect(() => {
        if (topic && outline.length === 0 && !loading) {
            generateOutline();
        }
    }, [topic]);

    const generateOutline = async () => {
        if (!topic) return;

        try {
            setLoading(true);
            const token = localStorage.getItem('authToken');
            
            const res = await apiRequest('/api/research/outline', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ topic })
            });

            if (res.outline && Array.isArray(res.outline)) {
                onOutlineGenerated(res.outline);
                toast({ title: 'Outline Synthesized', description: 'Academic paper structure successfully compiled.' });
            } else {
                throw new Error("Invalid structure returned by AI");
            }
        } catch (error: any) {
            console.error("Failed to generate outline:", error);
            toast({
                title: "Generation Failed",
                description: error.message || "Failed to generate outline structure",
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    if (!topic) {
        return (
            <div className="text-center py-12 text-slate-400">
                <p>Please select a topic in the previous step first.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 min-h-[400px] space-y-6">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-emerald-500">
                        {/* Placeholder icon inside spinner */}
                    </div>
                </div>
                <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-2">Architecting Framework</h3>
                    <p className="text-slate-400">Analyzing domain constraints and generating academic skeleton...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-start mb-8 pb-6 border-b border-slate-700/50">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Research Paper Outline</h2>
                    <p className="text-emerald-400 font-medium">{topic}</p>
                </div>
                
                <button
                    onClick={generateOutline}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition"
                >
                    <RefreshCw className="w-4 h-4" /> Regenerate
                </button>
            </div>

            {outline.length > 0 ? (
                <div className="space-y-6">
                    {outline.map((section, sectionIdx) => (
                        <div key={sectionIdx} className="bg-slate-900/50 rounded-xl border border-slate-700/50 p-6">
                            <h3 className="text-xl font-semibold text-blue-400 mb-4 pb-2 border-b border-slate-800">
                                {section.title}
                            </h3>
                            <ul className="space-y-3">
                                {section.points.map((point, pointIdx) => (
                                    <li key={pointIdx} className="flex items-start gap-3 text-slate-300">
                                        <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs text-slate-500">
                                            {pointIdx + 1}
                                        </div>
                                        <p className="leading-relaxed">{point}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                    
                    <div className="bg-emerald-900/20 border border-emerald-500/20 rounded-xl p-4 text-center mt-8">
                        <p className="text-emerald-400 font-medium">Outline structure completed! Click "Continue" to start writing your paper sections.</p>
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 text-slate-500">
                    <p>No outline generated yet.</p>
                </div>
            )}
        </div>
    );
}

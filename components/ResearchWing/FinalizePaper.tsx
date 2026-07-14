import React, { useState } from 'react';
import { apiRequest } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, BookOpen } from 'lucide-react';

interface FinalizePaperProps {
    content: Record<string, string>;
    abstract: string;
    citations: any;
    onAbstractGenerated: (abstract: string) => void;
    onCitationsGenerated: (citations: any) => void;
}

export default function FinalizePaper({ content, abstract, citations, onAbstractGenerated, onCitationsGenerated }: FinalizePaperProps) {
    const [generatingAbstract, setGeneratingAbstract] = useState(false);
    const [generatingCitations, setGeneratingCitations] = useState(false);
    
    // Citation input state
    const [citeTitle, setCiteTitle] = useState('');
    const [citeAuthor, setCiteAuthor] = useState('');
    const [citeYear, setCiteYear] = useState('');
    
    const { toast } = useToast();

    const compileFullContent = () => {
        return Object.values(content).join('\n\n');
    };

    const handleGenerateAbstract = async () => {
        const fullContent = compileFullContent();
        if (fullContent.length < 100) {
            toast({ title: 'Insufficient Content', description: 'Please write more content in your paper before generating an abstract.', variant: 'destructive' });
            return;
        }

        try {
            setGeneratingAbstract(true);
            const token = localStorage.getItem('authToken');
            
            const res = await apiRequest('/api/research/abstract', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: fullContent })
            });

            const abstractText = res?.data?.abstract ?? res?.abstract;
            if (abstractText) {
                onAbstractGenerated(abstractText);
                toast({ title: 'Abstract Generated' });
            }
        } catch (error: any) {
            toast({ title: "Failed", description: error.message || "Failed to generate abstract", variant: 'destructive' });
        } finally {
            setGeneratingAbstract(false);
        }
    };

    const handleGenerateCitation = async () => {
        if (!citeTitle || !citeAuthor || !citeYear) {
            toast({ title: 'Missing details', description: 'Please fill in Title, Author, and Year to generate citations.', variant: 'destructive' });
            return;
        }

        try {
            setGeneratingCitations(true);
            const token = localStorage.getItem('authToken');
            
            const detailsText = `Title: ${citeTitle}, Author: ${citeAuthor}, Year: ${citeYear}`;
            
            const res = await apiRequest('/api/research/citations', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ details: detailsText })
            });

            const citationPayload = res?.data?.citations ?? res?.citations;
            if (citationPayload) {
                const newCitations = [...(citations || []), citationPayload];
                onCitationsGenerated(newCitations);
                
                // Clear inputs
                setCiteTitle('');
                setCiteAuthor('');
                setCiteYear('');
                toast({ title: 'Citation Generated' });
            }
        } catch (error: any) {
            toast({ title: "Failed", description: error.message || "Failed to generate citation", variant: 'destructive' });
        } finally {
            setGeneratingCitations(false);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Abstract Section */}
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl flex flex-col min-h-[400px]">
                <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-400" /> Executive Abstract
                    </h2>
                    <button 
                        onClick={handleGenerateAbstract}
                        disabled={generatingAbstract}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition disabled:bg-slate-700 flex items-center gap-2"
                    >
                        {generatingAbstract ? <><Loader2 className="w-4 h-4 animate-spin"/> Generating...</> : "Generate from Paper"}
                    </button>
                </div>
                
                <div className="mb-3 text-xs text-slate-500">Draft or revise your executive summary directly in this panel.</div>
                <textarea
                    aria-label="Academic abstract"
                    value={abstract}
                    onChange={(e) => onAbstractGenerated(e.target.value)}
                    className="flex-1 w-full bg-transparent text-slate-300 resize-none focus:outline-none leading-relaxed"
                />
            </div>

            {/* Citations Section */}
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl flex flex-col min-h-[400px]">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6 border-b border-slate-800 pb-4">
                    <BookOpen className="w-5 h-5 text-emerald-400" /> References Library
                </h2>
                
                {/* Citation Input Form */}
                <div className="bg-slate-800/50 p-4 rounded-xl mb-6 space-y-3">
                    <label className="block text-xs font-medium text-slate-300 uppercase tracking-wide">
                        Reference title
                    </label>
                    <input
                        aria-label="Reference title"
                        className="w-full bg-slate-900 border border-slate-700 text-white text-sm px-3 py-2 rounded-lg focus:ring-1 focus:ring-emerald-500"
                        value={citeTitle}
                        onChange={(e) => setCiteTitle(e.target.value)}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wide mb-1">
                                Authors
                            </label>
                            <input
                                aria-label="Reference authors"
                                className="w-full bg-slate-900 border border-slate-700 text-white text-sm px-3 py-2 rounded-lg focus:ring-1 focus:ring-emerald-500"
                                value={citeAuthor}
                                onChange={(e) => setCiteAuthor(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wide mb-1">
                                Year
                            </label>
                            <input
                                aria-label="Reference year"
                                className="w-full bg-slate-900 border border-slate-700 text-white text-sm px-3 py-2 rounded-lg focus:ring-1 focus:ring-emerald-500"
                                value={citeYear}
                                onChange={(e) => setCiteYear(e.target.value)}
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleGenerateCitation}
                        disabled={generatingCitations}
                        className="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition disabled:bg-slate-700 flex justify-center items-center gap-2"
                    >
                        {generatingCitations ? <><Loader2 className="w-4 h-4 animate-spin"/> Processing...</> : "Generate AMA/APA/IEEE Citations"}
                    </button>
                </div>

                {/* Citations List */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                    {citations?.length > 0 ? citations.map((citeObj: any, idx: number) => (
                        <div key={idx} className="bg-slate-800 p-4 rounded-xl border border-slate-700/50 text-sm">
                            <span className="text-emerald-400 font-bold mb-1 block">APA:</span>
                            <p className="text-slate-300 italic mb-3">{citeObj.apa}</p>
                            <span className="text-blue-400 font-bold mb-1 block">MLA:</span>
                            <p className="text-slate-300 italic mb-3">{citeObj.mla}</p>
                            <span className="text-purple-400 font-bold mb-1 block">IEEE:</span>
                            <p className="text-slate-300 italic">{citeObj.ieee}</p>
                        </div>
                    )) : (
                        <p className="text-center mt-12 text-slate-500">No references added yet. Generate citations to populate your bibliography.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

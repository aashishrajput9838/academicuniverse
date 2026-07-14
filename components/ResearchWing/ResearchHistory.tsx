import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import { ResearchPaperData } from '@/app/dashboard/student/research/page';
import { Loader2, FileText, Clock, ChevronRight } from 'lucide-react';

interface ResearchHistoryProps {
    onSelectPaper: (paper: ResearchPaperData) => void;
}

export default function ResearchHistory({ onSelectPaper }: ResearchHistoryProps) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('authToken');
            const res = await apiRequest('/api/research/history', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const historyItems = res?.data?.history ?? res?.history;
            if (historyItems) {
                setHistory(historyItems);
            }
        } catch (error: any) {
            toast({
                title: "Failed to load library",
                description: error.message || "Could not retrieve your past research.",
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="text-center py-20 text-slate-400 bg-slate-800/20 rounded-2xl border border-slate-700/50">
                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl text-slate-300 font-medium mb-2">No research found</h3>
                <p>You haven't generated any research papers yet. Go to the Active Paper tab to begin!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {history.map((paper) => (
                <button
                    type="button"
                    key={paper.id}
                    onClick={() => onSelectPaper(paper)}
                    className="w-full flex items-center justify-between p-6 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700/80 hover:border-emerald-500/50 transition cursor-pointer group text-left"
                >
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 mt-1">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition">{paper.topic || 'Untitled Paper'}</h3>
                            <div className="flex items-center gap-4 mt-2 text-xs font-medium text-slate-400">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(paper.updatedAt || paper.createdAt).toLocaleDateString()}</span>
                                <span className="bg-slate-700 px-2 py-0.5 rounded text-slate-300">{paper.outline?.length || 0} Sections</span>
                                {paper.abstract && <span className="bg-blue-900/40 text-blue-400 px-2 py-0.5 rounded">Abstract Generated</span>}
                            </div>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition transform group-hover:translate-x-1" />
                </button>
            ))}
        </div>
    );
}

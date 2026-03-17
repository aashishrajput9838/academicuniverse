import React, { useState } from 'react';
import { apiRequest } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, Check } from 'lucide-react';

interface OutlineItem {
    title: string;
    points: string[];
}

interface ContentWriterProps {
    outline: OutlineItem[];
    content: Record<string, string>;
    onContentChange: (newContent: Record<string, string>) => void;
}

export default function ContentWriter({ outline, content, onContentChange }: ContentWriterProps) {
    const [selectedSection, setSelectedSection] = useState<string>(outline[0]?.title || '');
    const [currentText, setCurrentText] = useState<string>('');
    const [improving, setImproving] = useState(false);
    const { toast } = useToast();

    // Sync selected section data to editor
    React.useEffect(() => {
        if (selectedSection) {
            setCurrentText(content[selectedSection] || '');
        }
    }, [selectedSection]);

    const handleSaveSection = (text: string) => {
        setCurrentText(text);
        onContentChange({
            ...content,
            [selectedSection]: text
        });
    };

    const improveTextWithAI = async () => {
        if (!currentText.trim()) {
            toast({ title: 'Please write some content first to improve', variant: 'destructive' });
            return;
        }

        try {
            setImproving(true);
            const token = localStorage.getItem('authToken');
            
            const res = await apiRequest('/api/research/improve', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: currentText })
            });

            if (res.improvedText) {
                handleSaveSection(res.improvedText);
                toast({ title: 'Content Enhanced', description: 'Academic tone and clarity improved successfully.' });
            }
        } catch (error: any) {
            console.error("Failed to improve text:", error);
            toast({
                title: "Improvement Failed",
                description: error.message || "Could not improve the text",
                variant: 'destructive'
            });
        } finally {
            setImproving(false);
        }
    };

    if (!outline || outline.length === 0) {
        return (
            <div className="text-center py-12 text-slate-400">
                <p>Please generate a topic and outline first.</p>
            </div>
        );
    }

    const currentOutlineIndex = outline.findIndex(o => o.title === selectedSection);
    const currentOutlineObj = outline[currentOutlineIndex];

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Sidebar Mapping */}
            <div className="md:col-span-1 space-y-2 max-h-[600px] overflow-y-auto pr-2">
                <h3 className="font-semibold text-slate-300 mb-4 px-2 uppercase text-xs tracking-wider">Document Sections</h3>
                {outline.map((section, idx) => {
                    const hasContent = !!content[section.title]?.trim();
                    const isSelected = selectedSection === section.title;
                    
                    return (
                        <button
                            key={idx}
                            onClick={() => setSelectedSection(section.title)}
                            className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all flex items-center justify-between ${
                                isSelected 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                            }`}
                        >
                            <span className="truncate pr-2">{section.title}</span>
                            {hasContent && <Check className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-white' : 'text-emerald-500'}`} />}
                        </button>
                    );
                })}
            </div>

            {/* Editor Area */}
            <div className="md:col-span-3 bg-slate-900 border border-slate-700/50 rounded-2xl flex flex-col h-[600px] overflow-hidden">
                <div className="bg-slate-800/80 p-4 border-b border-slate-700 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-white">{selectedSection}</h2>
                        <div className="flex gap-2 text-xs text-slate-400 mt-1">
                            {currentOutlineObj?.points.map((p, i) => (
                                <span key={i} className="bg-slate-700/50 px-2 py-0.5 rounded-full truncate max-w-[150px]">{p}</span>
                            ))}
                        </div>
                    </div>
                </div>
                
                <textarea
                    value={currentText}
                    onChange={(e) => handleSaveSection(e.target.value)}
                    placeholder="Start drafting this section here..."
                    className="flex-1 w-full bg-transparent p-6 text-slate-200 placeholder-slate-600 resize-none focus:outline-none leading-relaxed"
                />

                <div className="bg-slate-800/50 p-4 border-t border-slate-700 flex justify-between items-center">
                    <span className="text-xs text-slate-500">
                        {currentText.split(/\s+/).filter(w => w.length > 0).length} words
                    </span>
                    <button
                        onClick={improveTextWithAI}
                        disabled={improving || !currentText.trim()}
                        className="flex items-center gap-2 px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed"
                    >
                        {improving ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Enhancing Tone...</>
                        ) : (
                            <><Sparkles className="w-4 h-4" /> Improve with AI</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

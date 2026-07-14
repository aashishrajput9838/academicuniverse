import React, { useState } from 'react';
import { apiRequest } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface TopicGeneratorProps {
    onTopicSelected: (topic: string) => void;
    currentTopic?: string;
}

export default function TopicGenerator({ onTopicSelected, currentTopic }: TopicGeneratorProps) {
    const [domain, setDomain] = useState('');
    const [topics, setTopics] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const generateTopics = async () => {
        if (!domain.trim()) {
            toast({ title: 'Please enter a domain or interest', variant: 'destructive' });
            return;
        }

        try {
            setLoading(true);
            setTopics([]);
            const token = localStorage.getItem('authToken');

            const res = await apiRequest('/api/research/topics', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ domain })
            });

            const topics = res?.data?.topics ?? res?.topics;
            if (Array.isArray(topics)) {
                setTopics(topics);
                toast({
                    title: 'Topics generated',
                    description: 'Select the strongest direction to move into the outline step.'
                });
            } else {
                throw new Error("Invalid format received from server");
            }
        } catch (error: any) {
            const message = (error?.message || '').toLowerCase();
            const friendlyMessage = message.includes('quota') || message.includes('resource_exhausted') || message.includes('rate limit') || message.includes('usage limit')
                ? 'The AI service has reached its temporary usage limit. Please try again in a few moments.'
                : error.message || 'Failed to generate topics';

            toast({
                title: "Generation Failed",
                description: friendlyMessage,
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold text-white">Choose Your Research Direction</h2>
                <p className="text-slate-400">Enter a broad domain (e.g., "Artificial Intelligence in Healthcare" or "Renewable Energy Economics") and our AI will generate highly specific, academic paper topics for you to explore.</p>
            </div>

            <div className="space-y-2">
                <label htmlFor="research-domain" className="block text-sm font-medium text-slate-300">
                    Research domain
                </label>
                <div className="flex flex-col sm:flex-row gap-4">
                    <input
                        id="research-domain"
                        type="text"
                        value={domain}
                        aria-label="Research domain or field of interest"
                        onChange={(e) => setDomain(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && generateTopics()}
                        className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={generateTopics}
                        disabled={loading || !domain.trim()}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-8 py-3 rounded-xl transition flex items-center justify-center min-w-[160px] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                    {loading ? (
                        <div className="flex gap-2 items-center">
                            <Loader2 className="w-5 h-5 animate-spin"/> Generating...
                        </div>
                    ) : (
                        'Generate Topics'
                    )}
                    </button>
                </div>
                <p className="text-xs text-slate-500">Describe a broad subject area and the wizard will return tailored paper directions.</p>
            </div>

            {currentTopic && !topics.length && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <p className="text-emerald-400 text-sm font-semibold mb-1">Currently Selected Topic:</p>
                    <p className="text-white text-lg">{currentTopic}</p>
                </div>
            )}

            {topics.length > 0 && (
                <div className="space-y-4 mt-8">
                    <h3 className="text-lg font-semibold text-slate-300 mb-4">Select a Topic to Continue:</h3>
                    {topics.map((t, idx) => (
                        <button
                            type="button"
                            key={idx}
                            onClick={() => onTopicSelected(t)}
                            className={`w-full text-left p-5 rounded-xl border transition-all hover:-translate-y-1 ${
                                currentTopic === t
                                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                                : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:border-slate-500'
                            }`}
                        >
                            <div className="flex items-start gap-4">
                                <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${currentTopic === t ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                    {idx + 1}
                                </span>
                                <p className="text-lg leading-relaxed pt-0.5">{t}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

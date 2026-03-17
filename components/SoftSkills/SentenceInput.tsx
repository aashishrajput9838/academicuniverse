"use client";

import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface SentenceInputProps {
    onSubmit: (text: string) => Promise<void>;
    loading: boolean;
}

export const SentenceInput: React.FC<SentenceInputProps> = ({ onSubmit, loading }) => {
    const [text, setText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const { toast } = useToast();
    let recognition: any = null;

    useEffect(() => {
        if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setText(prev => prev ? prev + ' ' + transcript : transcript);
                setIsListening(false);
            };

            recognition.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                setIsListening(false);
                toast({
                    title: "Microphone Error",
                    description: "Please check your microphone permissions.",
                    variant: "destructive"
                });
            };

            recognition.onend = () => {
                setIsListening(false);
            };
        }
    }, [toast]);

    const handleSpeech = () => {
        if (!recognition) {
            toast({
                title: "Not Supported",
                description: "Your browser does not support the Web Speech API. Please use Chrome or Edge.",
                variant: "destructive"
            });
            return;
        }

        if (isListening) {
            recognition.stop();
            setIsListening(false);
        } else {
            try {
                recognition.start();
                setIsListening(true);
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleSubmit = async () => {
        if (!text.trim()) return;
        await onSubmit(text);
        setText('');
    };

    return (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Practice Your Communication</h2>
            
            <div className="relative">
                <textarea
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={4}
                    placeholder="Type or speak a sentence you want to improve..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
                
                <div className="absolute bottom-4 right-4 flex gap-2">
                    <button
                        onClick={handleSpeech}
                        type="button"
                        className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${isListening ? 'bg-red-500/20 text-red-500' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
                        title={isListening ? "Stop listening" : "Speak sentence"}
                    >
                        {isListening ? (
                            <>
                                <span className="animate-pulse h-2 w-2 bg-red-500 rounded-full"></span>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                            </>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        )}
                    </button>
                </div>
            </div>

            <div className="mt-4 flex justify-end">
                <button
                    onClick={handleSubmit}
                    disabled={loading || !text.trim()}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Analyzing...
                        </>
                    ) : (
                        'Improve Sentence'
                    )}
                </button>
            </div>
        </div>
    );
};

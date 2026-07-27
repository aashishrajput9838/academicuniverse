"use client";

import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff, Send, Sparkles, Trash2, HelpCircle } from 'lucide-react';

interface SentenceInputProps {
  onSubmit: (text: string, mode?: string) => Promise<void>;
  loading: boolean;
  selectedMode?: string;
}

export const SentenceInput: React.FC<SentenceInputProps> = ({
  onSubmit,
  loading,
  selectedMode = 'General Practice'
}) => {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const { toast } = useToast();
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setText(prev => (prev ? prev + ' ' + transcript : transcript));
        setIsListening(false);
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        toast({
          title: "Microphone Access Note",
          description: "Microphone speech input requires microphone permissions in browser.",
          variant: "destructive"
        });
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, [toast]);

  const handleSpeech = () => {
    if (!recognition) {
      toast({
        title: "Speech Recognition Unavailable",
        description: "Your browser does not support the Web Speech API. Please type your response or use Chrome/Edge.",
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
    await onSubmit(text, selectedMode);
  };

  const getPlaceholderByMode = (mode: string) => {
    switch (mode) {
      case 'HR Interview':
        return 'Type or speak your answer to: "Tell me about yourself and your career goals for this placement..."';
      case 'Technical Interview':
        return 'Explain a key programming concept or system architecture (e.g. "How Docker containers differ from VMs")...';
      case 'Presentation':
        return 'Practice opening your project presentation pitch (e.g. "Good morning esteemed panel, today I present...")...';
      case 'Group Discussion':
        return 'State your position on a GD topic (e.g. "While AI accelerates software engineering, human oversight remains vital because...")...';
      case 'Email Writing':
        return 'Draft your professional outreach email to a campus recruiter or company mentor...';
      default:
        return 'Type or speak a sentence or response you want to evaluate for placement readiness...';
    }
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 border border-slate-800 shadow-xl mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" /> Practice Your Response
          </h3>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {selectedMode}
          </span>
        </div>

        {text && (
          <button
            onClick={() => setText('')}
            className="text-xs text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear Text
          </button>
        )}
      </div>

      <div className="relative">
        <textarea
          className="w-full bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none text-sm leading-relaxed transition-all"
          rows={4}
          placeholder={getPlaceholderByMode(selectedMode)}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {/* Speech input button inside textarea */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2">
          <button
            onClick={handleSpeech}
            type="button"
            className={`p-2.5 rounded-xl transition-all flex items-center gap-2 text-xs font-semibold ${
              isListening
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
            title={isListening ? "Listening... Click to stop" : "Speak into microphone"}
          >
            {isListening ? (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                Listening...
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 text-emerald-400" />
                Voice Speech
              </>
            )}
          </button>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <p className="text-xs text-slate-400 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
          Supports direct voice speech recording or written text responses.
        </p>

        <button
          onClick={handleSubmit}
          disabled={loading || !text.trim()}
          className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              Evaluating Response...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 fill-slate-950" />
              Get AI Feedback
            </>
          )}
        </button>
      </div>
    </div>
  );
};

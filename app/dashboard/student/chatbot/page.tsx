'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { MoodSelector } from '@/components/chat/MoodSelector';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { ChatInput } from '@/components/chat/ChatInput';
import { AlertTriangle, Info, MessageSquare, History } from 'lucide-react';

interface Message {
  id: string | number;
  text: string;
  sender: 'user' | 'ai';
  timestamp?: string;
  imageUrl?: string;
  isNew?: boolean;
}

export default function StudentChatbot() {
  const { user, backendUser, loading } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [mood, setMood] = useState<string>('neutral');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && (!user || !backendUser)) {
      router.push('/login');
    } else if (!loading && backendUser && backendUser.role !== 'STUDENT') {
      // Access restricted to students
      router.push('/dashboard');
    }
  }, [user, backendUser, loading, router]);

  // Handle message sending
  const handleSendMessage = async (text: string, file?: File) => {
    if ((!text.trim() && !file) || isSending) return;

    let imageUrl;
    if (file) {
      imageUrl = URL.createObjectURL(file);
    }

    const userMessage: Message = {
      id: Date.now(),
      text,
      sender: 'user',
      timestamp: new Date().toISOString(),
      imageUrl
    };

    setMessages(prev => [...prev, userMessage]);
    setIsSending(true);
    setError(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
      const token = localStorage.getItem('authToken');
      let response;

      if (file) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('message', text);
        formData.append('mood', mood);

        response = await fetch(`${baseUrl}/api/ai/image-chat`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
      } else {
        response = await fetch(`${baseUrl}/api/ai/ai-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ message: text, mood })
        });
      }

      if (!response.ok) {
        let errorMsg = 'Failed to get response from AI assistant';
        try {
          const errorData = await response.json();
          if (errorData.message) errorMsg = errorData.message;
        } catch (e) {}
        throw new Error(errorMsg);
      }

      const data = await response.json();

      const aiMessage: Message = {
        id: Date.now() + 1,
        text: data.data.reply,
        sender: 'ai',
        timestamp: new Date().toISOString(),
        isNew: true
      };

      setMessages(prev => {
        // Mark older messages as not new so they don't re-animate
        const updated = prev.map(m => ({ ...m, isNew: false }));
        return [...updated, aiMessage];
      });
    } catch (err: any) {
      console.error('Chat error:', err);
      setError(err.message || 'I lost connection for a moment. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const quickPrompts = [
    "I'm feeling a bit overwhelmed with my current timetable.",
    "Can you suggest some study tips for my next class?",
    "I need help managing my stress today.",
    "What's a good way to use my upcoming free slot?"
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400" />
      </div>
    );
  }

  if (!user || !backendUser || backendUser.role !== 'STUDENT') return null;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <MessageSquare className="text-emerald-500" />
            AI Emotional Support
          </h1>
          <p className="text-slate-400 mt-1">Your dedicated companion for academic well-being and stress management.</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-800/40 px-4 py-2 rounded-full border border-slate-700 text-xs text-slate-300">
          <History size={14} className="text-emerald-500" />
          Chat history is saved automatically
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-250px)]">
        {/* Left Panel: Mood & Tips */}
        <div className="space-y-6 flex flex-col overflow-y-auto pr-1">
          <MoodSelector selectedMood={mood} onSelect={setMood} />

          <div className="bg-slate-800/80 backdrop-blur-md p-6 rounded-2xl border border-slate-700 flex-1">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>
              Quick Prompts
            </h3>
            <div className="space-y-3">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(prompt)}
                  className="w-full text-left p-3 rounded-xl bg-slate-700/30 border border-slate-600/50 text-slate-300 text-sm hover:bg-emerald-500/10 hover:border-emerald-500/50 hover:text-emerald-400 transition-all duration-300 group"
                >
                  <span className="opacity-70 group-hover:opacity-100 transition-opacity">“{prompt}”</span>
                </button>
              ))}
            </div>

            <div className="mt-8 p-4 bg-red-500/10 rounded-xl border border-red-500/20">
              <div className="flex gap-3 text-red-400">
                <AlertTriangle size={24} className="flex-shrink-0" />
                <div className="text-[10px] leading-relaxed uppercase font-bold tracking-wider">
                  <p className="mb-1">Safety Disclaimer</p>
                  <p className="text-slate-400 font-normal normal-case italic">
                    This AI assistant provides supportive suggestions but does not replace professional counseling or medical advice.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Main Chat Window */}
        <div className="lg:col-span-2 flex flex-col bg-slate-800/40 backdrop-blur-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden relative">
          <div className="absolute top-4 right-4 z-10">
            <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-700">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Live AI Node</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border-b border-red-500/30 p-3 flex items-center justify-center gap-2 text-red-400 text-sm animate-in fade-in slide-in-from-top duration-300">
              <Info size={16} />
              {error}
            </div>
          )}

          <ChatWindow messages={messages} loading={isSending} />
          <ChatInput onSendMessage={handleSendMessage} disabled={isSending} />
        </div>
      </div>
    </div>
  );
}

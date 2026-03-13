import React, { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';

interface Message {
    id: string | number;
    text: string;
    sender: 'user' | 'ai';
    timestamp?: string;
}

interface ChatWindowProps {
    messages: Message[];
    loading?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ messages, loading }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    return (
        <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent custom-scrollbar"
        >
            <div className="max-w-5xl mx-auto">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-20 text-center opacity-50">
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-700">
                            <span className="text-3xl">✨</span>
                        </div>
                        <p className="text-slate-400 font-medium">No messages yet. Start a conversation above!</p>
                    </div>
                ) : (
                    messages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                    ))
                )}

                {loading && (
                    <div className="flex justify-start mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/50">
                                <span className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
                            </div>
                            <div className="flex gap-1 items-center px-4 py-2 bg-slate-700/50 rounded-xl border border-slate-600">
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

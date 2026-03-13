import React from 'react';
import { User, Bot } from 'lucide-react';

interface MessageBubbleProps {
    message: {
        id: string | number;
        text: string;
        sender: 'user' | 'ai';
        timestamp?: string;
    };
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
    const isUser = message.sender === 'user';

    return (
        <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] md:max-w-[70%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border ${isUser
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400'
                    }`}>
                    {isUser ? <User size={20} /> : <Bot size={20} />}
                </div>

                {/* Bubble */}
                <div className="flex flex-col">
                    <div className={`px-5 py-3 rounded-2xl shadow-lg relative ${isUser
                            ? 'bg-emerald-600 text-white rounded-tr-none'
                            : 'bg-slate-700 text-slate-100 rounded-tl-none border border-slate-600'
                        }`}>
                        <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                            {message.text}
                        </p>

                        {/* Pointer Decorator (optional glassmorphic touch) */}
                        <div className={`absolute top-0 w-4 h-4 ${isUser
                                ? '-right-1 bg-emerald-600 rotate-45 -z-10'
                                : '-left-1 bg-slate-700 rotate-45 border-l border-t border-slate-600 -z-10'
                            }`}></div>
                    </div>

                    {message.timestamp && (
                        <span className={`text-[10px] mt-1 text-slate-500 ${isUser ? 'text-right' : 'text-left'}`}>
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

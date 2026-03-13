import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';

interface ChatInputProps {
    onSendMessage: (message: string) => void;
    disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled }) => {
    const [value, setValue] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = () => {
        if (value.trim() && !disabled) {
            onSendMessage(value.trim());
            setValue('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [value]);

    return (
        <div className="relative group p-4 bg-slate-800/50 border-t border-slate-700/50 backdrop-blur-sm rounded-b-2xl">
            <div className="flex items-end gap-3 max-w-5xl mx-auto">
                <div className="flex-1 relative">
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        placeholder="Tell me what's on your mind..."
                        className="w-full bg-slate-900/80 text-white rounded-xl px-5 py-4 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 border border-slate-700 resize-none min-h-[56px] placeholder-slate-500 transition-all duration-300"
                        rows={1}
                    />
                    <div className="absolute right-4 bottom-4 flex items-center gap-2 text-emerald-500/50 group-focus-within:text-emerald-500 transition-colors pointer-events-none">
                        <Sparkles size={18} />
                    </div>
                </div>

                <button
                    onClick={handleSend}
                    disabled={!value.trim() || disabled}
                    className={`h-[56px] w-[56px] flex items-center justify-center rounded-xl transition-all duration-300 shadow-lg ${!value.trim() || disabled
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'
                            : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:scale-105 active:scale-95 shadow-emerald-500/20'
                        }`}
                >
                    <Send size={22} className={value.trim() && !disabled ? 'animate-pulse' : ''} />
                </button>
            </div>

            <div className="mt-2 text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold flex items-center justify-center gap-2">
                    <span>AI Support Active</span>
                    <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></span>
                </p>
            </div>
        </div>
    );
};

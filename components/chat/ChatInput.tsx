import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, Image as ImageIcon, X } from 'lucide-react';

interface ChatInputProps {
    onSendMessage: (message: string, file?: File) => void;
    disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled }) => {
    const [value, setValue] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSend = () => {
        if ((value.trim() || imageFile) && !disabled) {
            onSendMessage(value.trim(), imageFile || undefined);
            setValue('');
            setImageFile(null);
            if (imagePreview) URL.revokeObjectURL(imagePreview);
            setImagePreview(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleFile = (file: File) => {
        if (!file.type.startsWith('image/')) return;
        setImageFile(file);
        const previewUrl = URL.createObjectURL(file);
        setImagePreview(previewUrl);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) handleFile(file);
                break;
            }
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const clearImage = () => {
        setImageFile(null);
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [value]);

    return (
        <div 
            className={`relative group p-4 bg-slate-800/50 border-t ${isDragging ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700/50'} backdrop-blur-sm rounded-b-2xl transition-all`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="flex flex-col gap-3 max-w-5xl mx-auto">
                {imagePreview && (
                    <div className="relative self-start mb-2 animate-in fade-in zoom-in duration-300">
                        <img 
                            src={imagePreview} 
                            alt="Attached preview" 
                            className="h-24 w-auto rounded-lg border border-slate-600 shadow-md object-contain bg-slate-900/50"
                        />
                        <button 
                            onClick={clearImage}
                            className="absolute -top-2 -right-2 bg-slate-700 hover:bg-red-500 text-white rounded-full p-1 shadow-lg transition-colors"
                        >
                            <X size={14} />
                        </button>
                        <div className="flex flex-wrap gap-2 mt-2">
                            <button onClick={() => { setValue("Explain this image clearly."); }} className="text-[10px] bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded border border-slate-600 transition text-slate-300">Explain</button>
                            <button onClick={() => { setValue("Solve this step-by-step."); }} className="text-[10px] bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded border border-slate-600 transition text-slate-300">Solve</button>
                            <button onClick={() => { setValue("Summarize these notes."); }} className="text-[10px] bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded border border-slate-600 transition text-slate-300">Summarize</button>
                        </div>
                    </div>
                )}
                
                <div className="flex items-end gap-3 flex-1 relative">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileInput} 
                        accept="image/*" 
                        className="hidden" 
                    />
                    <div className="flex-1 relative">
                        <textarea
                            ref={textareaRef}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            disabled={disabled}
                            placeholder={imagePreview ? "Add a message about this image..." : "Tell me what's on your mind... (Paste an image)"}
                            className="w-full bg-slate-900/80 text-white rounded-xl px-5 py-4 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 border border-slate-700 resize-none min-h-[56px] placeholder-slate-500 transition-all duration-300"
                            rows={1}
                        />
                        <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute left-4 bottom-4 text-slate-500 hover:text-emerald-400 cursor-pointer z-10 p-1 rounded-md transition-colors"
                            title="Upload an image"
                        >
                            <ImageIcon size={20} className={imagePreview ? "text-emerald-500" : ""} />
                        </button>
                        <div className="absolute right-4 bottom-4 flex items-center gap-2 text-emerald-500/50 group-focus-within:text-emerald-500 transition-colors pointer-events-none">
                            <Sparkles size={18} />
                        </div>
                    </div>
                    
                    <button
                        onClick={handleSend}
                        disabled={(!value.trim() && !imageFile) || disabled}
                        className={`h-[56px] w-[56px] flex-shrink-0 flex items-center justify-center rounded-xl transition-all duration-300 shadow-lg ${(!value.trim() && !imageFile) || disabled
                                ? 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'
                                : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:scale-105 active:scale-95 shadow-emerald-500/20'
                            }`}
                    >
                        <Send size={22} className={(value.trim() || imageFile) && !disabled ? 'animate-pulse' : ''} />
                    </button>
                </div>
            </div>

            <div className="mt-2 flex justify-between items-center max-w-5xl mx-auto px-1">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold flex items-center justify-center gap-2">
                    <span>AI Support Active</span>
                    <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></span>
                </p>
                <p className="text-[10px] text-slate-500 italic">Drag & Drop or Ctrl+V an image</p>
            </div>
        </div>
    );
};

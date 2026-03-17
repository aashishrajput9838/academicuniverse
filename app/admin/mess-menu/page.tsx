"use client";

import React, { useState } from 'react';
import { Upload, FileType, Check, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import EditableMenuPreview from '@/components/Mess/EditableMenuPreview';

export default function AdminMessMenu() {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [parsedMenu, setParsedMenu] = useState<any>(null);
    const [weekStart, setWeekStart] = useState<string>('');
    const [dragActive, setDragActive] = useState(false);
    const { toast } = useToast();

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0]);
        }
    };

    const validateAndSetFile = (selectedFile: File) => {
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!validTypes.includes(selectedFile.type)) {
            toast({ title: 'Invalid File', description: 'Please upload a PDF, JPG, or PNG.', variant: 'destructive' });
            return;
        }
        if (selectedFile.size > 5 * 1024 * 1024) {
            toast({ title: 'File Too Large', description: 'Max file size is 5MB.', variant: 'destructive' });
            return;
        }
        setFile(selectedFile);
        setParsedMenu(null); // Reset preview
    };

    const extractMenu = async () => {
        if (!file) return;

        try {
            setIsProcessing(true);
            const token = localStorage.getItem('authToken');
            
            // Note: We use FormData to send the multipart file
            const formData = new FormData();
            formData.append('menuFile', file);

            // Cannot use standard apiRequest easily with FormData because of Content-Type 
            // Browser needs to auto-set boundary
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const res = await fetch(`${baseUrl}/api/mess/extract`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Extraction failed');
            }

            const data = await res.json();
            setWeekStart(data.weekStartDate);
            setParsedMenu(data.menuData);
            toast({ title: 'Extraction Success', description: 'AI successfully parsed the menu. Please review below.' });

        } catch (error: any) {
            console.error("Extraction error:", error);
            toast({
                title: 'AI Processing Failed', 
                description: error.message || 'Could not parse document. Try again or enter manually.',
                variant: 'destructive'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700">
                <h1 className="text-2xl font-bold text-white mb-2">Mess Menu AI Extraction</h1>
                <p className="text-slate-400">Upload a printed photo or PDF of the weekly mess menu. Gemini Flash will extract the structured data magically.</p>
            </div>

            {!parsedMenu ? (
                <div 
                    className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all ${
                        dragActive ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-600 bg-slate-900'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <Upload className={`w-16 h-16 mx-auto mb-6 ${dragActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <h2 className="text-xl font-medium text-white mb-2">Drag and drop your Mess Menu here</h2>
                    <p className="text-slate-400 mb-8">Supports PDF, JPG, or PNG up to 5MB</p>

                    {file && (
                        <div className="bg-slate-800 p-4 rounded-xl flex items-center justify-between max-w-md mx-auto mb-8 border border-slate-600">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <FileType className="w-6 h-6 text-blue-400 flex-shrink-0" />
                                <span className="text-slate-200 truncate">{file.name}</span>
                            </div>
                            <button onClick={() => setFile(null)} className="text-slate-400 hover:text-red-400 p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    <div className="flex justify-center gap-4">
                        <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 px-6 py-3 rounded-xl border border-slate-600 transition font-medium">
                            Browse Files
                            <input 
                                type="file" 
                                className="hidden" 
                                accept="application/pdf,image/jpeg,image/png"
                                onChange={handleFileChange}
                            />
                        </label>
                        
                        <button 
                            onClick={extractMenu}
                            disabled={!file || isProcessing}
                            className={`px-8 py-3 rounded-xl font-medium flex items-center gap-2 transition ${
                                !file 
                                ? 'bg-emerald-900/50 text-emerald-500/50 cursor-not-allowed' 
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                            }`}
                        >
                            {isProcessing ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Processing with AI...</>
                            ) : (
                                <><Check className="w-5 h-5" /> Extract Data</>
                            )}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-center px-2">
                        <h2 className="text-xl font-bold text-emerald-400">Step 2: Review and Confirm extraction</h2>
                        <button 
                            onClick={() => {
                                setFile(null);
                                setParsedMenu(null);
                            }}
                            className="text-slate-400 hover:text-white"
                        >
                            Start Over
                        </button>
                    </div>
                    
                    <EditableMenuPreview 
                        initialData={parsedMenu} 
                        initialDate={weekStart}
                        onSaveComplete={() => {
                            setFile(null);
                            setParsedMenu(null);
                        }}
                    />
                </div>
            )}
        </div>
    );
}

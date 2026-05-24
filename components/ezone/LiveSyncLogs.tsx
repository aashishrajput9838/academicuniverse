'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Terminal, CheckCircle2, AlertCircle, Info, Timer } from 'lucide-react';

interface LogStep {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    timestamp: string;
}

interface LiveSyncLogsProps {
    userId: string;
    isActive: boolean;
}

export default function LiveSyncLogs({ userId, isActive }: LiveSyncLogsProps) {
    const [logs, setLogs] = useState<LogStep[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!userId || !isActive) return;

        // Listen to Firestore for real-time log updates from the backend
        const unsub = onSnapshot(doc(db, 'ezone_sync_logs', userId), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                if (data.steps) {
                    setLogs(data.steps);
                }
            }
        });

        return () => unsub();
    }, [userId, isActive]);

    useEffect(() => {
        // Auto-scroll to bottom on new logs
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    if (!isActive && logs.length === 0) return null;

    return (
        <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-700 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <CardHeader className="py-3 border-b border-slate-800 bg-slate-900/50">
                <CardTitle className="text-sm font-mono text-emerald-400 flex items-center gap-2">
                    <Terminal className="h-4 w-4" />
                    Live Automation Logs
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div 
                    ref={scrollRef}
                    className="h-64 overflow-y-auto p-4 font-mono text-xs space-y-2 scrollbar-thin scrollbar-thumb-slate-700"
                >
                    {logs.length === 0 ? (
                        <div className="text-slate-500 italic flex items-center gap-2">
                            <Timer className="h-3 w-3 animate-pulse" />
                            Waiting for automation engine...
                        </div>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className="flex gap-3 animate-in fade-in slide-in-from-left-2">
                                <span className="text-slate-600 shrink-0">
                                    [{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                                </span>
                                <span className={`flex gap-2 ${getLogColor(log.type)}`}>
                                    {getLogIcon(log.type)}
                                    <span>{log.message}</span>
                                </span>
                            </div>
                        ))
                    )}
                </div>
                <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/30 text-[10px] text-slate-500 flex justify-between items-center">
                    <span>Engine: Playwright Chromium v1.60</span>
                    <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Real-time Stream Active
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}

function getLogIcon(type: string) {
    switch (type) {
        case 'success': return <CheckCircle2 className="h-3 w-3 mt-0.5" />;
        case 'error': return <AlertCircle className="h-3 w-3 mt-0.5" />;
        case 'warning': return <Info className="h-3 w-3 mt-0.5" />;
        default: return <Info className="h-3 w-3 mt-0.5" />;
    }
}

function getLogColor(type: string) {
    switch (type) {
        case 'success': return 'text-emerald-400';
        case 'error': return 'text-red-400';
        case 'warning': return 'text-amber-400';
        default: return 'text-blue-400';
    }
}

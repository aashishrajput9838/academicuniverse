'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, limit, where } from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Terminal, CheckCircle2, AlertCircle, Info, Timer, ShieldAlert } from 'lucide-react';

interface LogStep {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    createdAt: any;
}

interface LiveSyncLogsProps {
    userId: string;
    sessionId: string;
    isActive: boolean;
}

export default function LiveSyncLogs({ userId, sessionId, isActive }: LiveSyncLogsProps) {
    const [logs, setLogs] = useState<LogStep[]>([]);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { user: firebaseUser } = useAuth();

    useEffect(() => {
        if (!userId || !sessionId || !isActive) return;

        setError(null);
        console.log(`[LiveSyncLogs] Attempting listener for path: ezoneSyncSessions/${sessionId}/logs`);

        // Listen to Firestore for real-time log updates from the backend
        // We use a flat query without orderBy to bypass permission/index issues
        const logsCollectionRef = collection(db, 'ezoneSyncSessions', sessionId, 'logs');
        const logsQuery = query(logsCollectionRef, limit(100));

        const unsub = onSnapshot(
            logsQuery, 
            (snapshot) => {
                console.log(`[LiveSyncLogs] Snapshot received with ${snapshot.docs.length} docs`);
                const newLogs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as LogStep[];
                
                // Sort locally since we removed orderBy
                const sortedLogs = [...newLogs].sort((a, b) => {
                    const timeA = a.createdAt?.seconds || 0;
                    const timeB = b.createdAt?.seconds || 0;
                    return timeA - timeB;
                });
                
                setLogs(sortedLogs);
            },
            (err) => {
                console.error("Realtime logs failed", err);
                if (err.code === 'permission-denied') {
                    setError("Security Policy: Access to live logs restricted.");
                } else {
                    setError("Failed to connect to live log stream.");
                }
            }
        );

        return () => unsub();
    }, [userId, sessionId, isActive]);

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
                    {error ? (
                        <div className="h-full flex flex-col items-center justify-center text-red-400 gap-2 opacity-80">
                            <ShieldAlert className="h-8 w-8" />
                            <div className="font-bold">Realtime logs unavailable</div>
                            <div className="text-[10px] text-slate-500 max-w-[200px] text-center">{error}</div>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-slate-500 italic flex items-center gap-2">
                            <Timer className="h-3 w-3 animate-pulse" />
                            Waiting for automation engine...
                        </div>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className="flex gap-3 animate-in fade-in slide-in-from-left-2">
                                <span className="text-slate-600 shrink-0">
                                    [{log.createdAt?.toDate ? 
                                        log.createdAt.toDate().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 
                                        '--:--:--'}]
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
                        <span className={`h-1.5 w-1.5 rounded-full ${error ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                        {error ? 'Stream Blocked' : 'Real-time Stream Active'}
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

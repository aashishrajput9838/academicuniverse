'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, limit, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Terminal, CheckCircle2, AlertCircle, Info, Timer, ShieldAlert, ChevronDown, ChevronRight, PlayCircle, Database, Search, Fingerprint } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface LogStep {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'action';
    category: 'AUTHENTICATION' | 'DISCOVERY' | 'EXTRACTION' | 'DATABASE' | 'GENERAL';
    message: string;
    step: number;
    createdAt: any;
    metadata?: any;
}

interface SessionSummary {
    currentCategory: string;
    currentProgress: number;
    routesDiscovered: number;
    apisFound: number;
}

interface LiveSyncLogsProps {
    userId: string;
    sessionId: string;
    isActive: boolean;
}

export default function LiveSyncLogs({ userId, sessionId, isActive }: LiveSyncLogsProps) {
    const [logs, setLogs] = useState<LogStep[]>([]);
    const [summary, setSessionSummary] = useState<SessionSummary | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
        'AUTHENTICATION': true,
        'EXTRACTION': true,
        'DISCOVERY': true,
        'DATABASE': true
    });
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!userId || !sessionId || !isActive) return;

        setError(null);

        // 1. Listen to the specific session document for progress/summary
        const sessionDocRef = doc(db, 'ezoneSyncSessions', sessionId);
        const unsubSummary = onSnapshot(sessionDocRef, (doc) => {
            if (doc.exists()) {
                setSessionSummary(doc.data() as SessionSummary);
            }
        });

        // 2. Listen to logs collection
        const logsCollectionRef = collection(db, 'ezoneSyncSessions', sessionId, 'logs');
        const logsQuery = query(logsCollectionRef, limit(200));

        const unsubLogs = onSnapshot(
            logsQuery, 
            (snapshot) => {
                const newLogs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as LogStep[];
                
                const sortedLogs = [...newLogs].sort((a, b) => {
                    const timeA = a.createdAt?.seconds || 0;
                    const timeB = b.createdAt?.seconds || 0;
                    if (timeA === timeB) return a.step - b.step;
                    return timeA - timeB;
                });
                
                setLogs(sortedLogs);
            },
            (err) => {
                console.error("Realtime logs failed", err);
                setError(err.code === 'permission-denied' ? "Security Policy: Access restricted." : "Stream connection failed.");
            }
        );

        return () => {
            unsubSummary();
            unsubLogs();
        };
    }, [userId, sessionId, isActive]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const toggleCategory = (cat: string) => {
        setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    if (!isActive && logs.length === 0) return null;

    const categories = ['AUTHENTICATION', 'EXTRACTION', 'DATABASE', 'DISCOVERY'];
    
    return (
        <Card className="bg-slate-900/90 backdrop-blur-2xl border-slate-700 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-6 duration-700">
            <CardHeader className="py-4 border-b border-slate-800 bg-slate-900/50 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                        <Terminal className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                        <CardTitle className="text-sm font-bold text-white tracking-tight">Automation Command Center</CardTitle>
                        <div className="text-[10px] text-slate-500 font-mono">Session ID: {sessionId.substring(0, 8)}...</div>
                    </div>
                </div>
                {summary && (
                    <div className="flex gap-4">
                        <div className="text-right">
                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Discovery</div>
                            <div className="text-xs text-emerald-400 font-mono">{summary.routesDiscovered || 0} Routes</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">API Graph</div>
                            <div className="text-xs text-blue-400 font-mono">{summary.apisFound || 0} Found</div>
                        </div>
                    </div>
                )}
            </CardHeader>
            
            <CardContent className="p-0">
                {/* Progress Indicators */}
                {summary && (
                    <div className="px-6 py-4 bg-slate-950/40 border-b border-slate-800 space-y-3">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <PlayCircle className="h-3 w-3 text-emerald-500 animate-pulse" />
                                {summary.currentCategory} IN PROGRESS
                            </span>
                            <span className="text-xs font-mono text-emerald-400">{summary.currentProgress}%</span>
                        </div>
                        <Progress value={summary.currentProgress} className="h-1 bg-slate-800" />
                    </div>
                )}

                <div 
                    ref={scrollRef}
                    className="h-[400px] overflow-y-auto p-6 font-mono text-xs space-y-6 scrollbar-thin scrollbar-thumb-slate-700"
                >
                    {error ? (
                        <div className="h-full flex flex-col items-center justify-center text-red-400 gap-3 opacity-80">
                            <ShieldAlert className="h-10 w-10" />
                            <div className="font-bold text-lg">Real-time Stream Offline</div>
                            <div className="text-xs text-slate-500 max-w-[250px] text-center leading-relaxed">{error}</div>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-3">
                            <Timer className="h-8 w-8 animate-spin-slow" />
                            <div className="italic text-sm">Initialising Playwright Engine...</div>
                        </div>
                    ) : (
                        categories.map(cat => {
                            const catLogs = logs.filter(l => l.category === cat);
                            if (catLogs.length === 0) return null;
                            const isExpanded = expandedCategories[cat];
                            
                            return (
                                <div key={cat} className="space-y-2 border-l-2 border-slate-800 ml-2 pl-4 relative">
                                    <button 
                                        onClick={() => toggleCategory(cat)}
                                        className="flex items-center gap-2 -ml-[25px] bg-slate-900 pr-3 py-1 hover:text-white transition-colors group"
                                    >
                                        <div className="bg-slate-800 p-1 rounded">
                                            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                        </div>
                                        {getCategoryIcon(cat)}
                                        <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400 group-hover:text-emerald-400">
                                            {cat}
                                        </span>
                                        <span className="text-[9px] text-slate-600 font-normal">({catLogs.length} events)</span>
                                    </button>
                                    
                                    {isExpanded && (
                                        <div className="space-y-2.5 pt-1 animate-in fade-in slide-in-from-top-1">
                                            {catLogs.map((log) => (
                                                <div key={log.id} className="flex gap-4 items-start group">
                                                    <span className="text-slate-700 shrink-0 text-[9px] mt-0.5">
                                                        [{log.step.toString().padStart(2, '0')}]
                                                    </span>
                                                    <div className={`flex flex-col gap-0.5 ${getLogColor(log.type)}`}>
                                                        <div className="flex gap-2 items-center">
                                                            {getLogIcon(log.type)}
                                                            <span className="leading-relaxed">{log.message}</span>
                                                        </div>
                                                        {log.metadata?.actionType && (
                                                            <span className="text-[9px] text-slate-600 ml-5 font-bold italic opacity-0 group-hover:opacity-100 transition-opacity">
                                                                engine.{log.metadata.actionType}()
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* completion report placeholder */}
                {summary?.currentProgress === 100 && summary?.currentCategory === 'DATABASE' && (
                    <div className="mx-6 mb-6 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl animate-in zoom-in-95">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-2">
                            <CheckCircle2 className="h-4 w-4" />
                            SYNC REPORT GENERATED
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-[10px]">
                            <div className="text-slate-400">Status: <span className="text-white">COMPLETED</span></div>
                            <div className="text-slate-400">Integrity: <span className="text-white">VERIFIED</span></div>
                            <div className="text-slate-400">Profile: <span className="text-white">EXTRACTED</span></div>
                            <div className="text-slate-400">Explorer: <span className="text-white">RUNNING IN BG</span></div>
                        </div>
                    </div>
                )}

                <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/30 text-[10px] text-slate-500 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"></div>
                            REAL-TIME VERBOSE STREAM
                        </span>
                        <span className="text-slate-700">|</span>
                        <span>PW_VERSION: 1.60.0-HEADLESS</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-600 italic">Auto-scrolling active</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function getCategoryIcon(cat: string) {
    switch (cat) {
        case 'AUTHENTICATION': return <Fingerprint className="h-3 w-3 text-purple-400" />;
        case 'EXTRACTION': return <Search className="h-3 w-3 text-amber-400" />;
        case 'DISCOVERY': return <PlayCircle className="h-3 w-3 text-blue-400" />;
        case 'DATABASE': return <Database className="h-3 w-3 text-emerald-400" />;
        default: return <Terminal className="h-3 w-3 text-slate-400" />;
    }
}

function getLogIcon(type: string) {
    switch (type) {
        case 'success': return <CheckCircle2 className="h-3 w-3" />;
        case 'error': return <AlertCircle className="h-3 w-3" />;
        case 'action': return <PlayCircle className="h-3 w-3 opacity-70" />;
        default: return <div className="h-1 w-1 rounded-full bg-current mt-1.5 ml-1 mr-1" />;
    }
}

function getLogColor(type: string) {
    switch (type) {
        case 'success': return 'text-emerald-400 font-bold';
        case 'error': return 'text-red-400 font-bold';
        case 'warning': return 'text-amber-400';
        case 'action': return 'text-blue-400 italic';
        default: return 'text-slate-400';
    }
}

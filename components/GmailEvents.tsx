"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { apiRequest } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { classifyEvent, categorizeAllEvents, EventCategory } from '@/utils/eventClassification';

interface GmailStats {
  totalMessages: number;
  totalThreads: number;
}

interface DetectedEvent {
    id: string;
    title: string;
    date: string;
    location: string;
    registrationLink: string;
    organizer: string;
    emailId: string;
    detectedAt: string;
}

export const GmailEvents: React.FC = () => {
    const { user, backendToken } = useAuth();
    const { toast } = useToast();
    const [events, setEvents] = useState<DetectedEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const [gmailConnected, setGmailConnected] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<EventCategory>('All');
    const [gmailStats, setGmailStats] = useState<GmailStats | null>(null);

    // Store latest user ID to handle user changes/logout
    const latestUserIdRef = useRef<string | null>(null);

    // Memoized categorized events for efficient filtering and counts
    const categorizedEvents = useMemo(() => categorizeAllEvents(events), [events]);

    const filteredEvents = useMemo(() => {
        return categorizedEvents[selectedCategory];
    }, [categorizedEvents, selectedCategory]);

    const categories: EventCategory[] = ['All', 'Internship', 'Hackathon', 'Admission', 'Workshop', 'Placement', 'Exam', 'Scholarship', 'Other'];

    // Check if we just returned from OAuth
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const success = urlParams.get('gmail_success');
        const error = urlParams.get('gmail_error');
        if (success) {
            toast({ title: 'Success', description: 'Gmail connected successfully!' });
            // clean url
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (error) {
            let description = `Failed to connect Gmail: ${error}`;
            if (error === 'invalid_grant') description = 'The authorization code has expired or has already been used. Please try again.';
            else if (error === 'user_not_found') description = 'User account not found in our database.';
            else if (error === 'redirect_mismatch') description = 'Configuration error: Redirect URI mismatch. Please contact support.';
            else if (error === 'config_incomplete') description = 'Server configuration error: Google OAuth is not properly set up.';
            else if (error === 'access_denied') description = 'Access was denied by the user.';
            
            toast({ 
                title: 'Connection Failed', 
                description: description, 
                variant: 'destructive' 
            });
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [toast]);

    useEffect(() => {
        if (user && backendToken) {
            latestUserIdRef.current = user.uid;
            const abortController = new AbortController();
            const signal = abortController.signal;

            // Call fetchEvents (we don't return it, so useEffect doesn't get a Promise)
            fetchEvents(user.uid, signal);

            // Return only the cleanup function
            return () => {
                abortController.abort();
            };
        }

        latestUserIdRef.current = null;
        // Reset state on logout or missing backend token
        setLoading(false);
        setGmailConnected(false);
        setEvents([]);
    }, [user, backendToken]);

    const fetchEvents = async (currentUserId: string, signal: AbortSignal) => {
        console.log("🔄 [fetchEvents] CALLED! currentUserId:", currentUserId);
        
        if (!user || user.uid !== currentUserId) {
            console.log("❌ [fetchEvents] EARLY RETURN: user not exists or uid mismatch!");
            return;
        }

        try {
            setLoading(true);
            if (!backendToken) {
                throw new Error('Backend authentication token is missing');
            }

            // First, check Gmail connection status from backend
            console.log("🔄 [fetchEvents] About to call GET /api/gmail/status!");
            const statusRes = await apiRequest('/api/gmail/status', {
                headers: { Authorization: `Bearer ${backendToken}` },
                signal
            });
            console.log("🔄 [fetchEvents] statusRes from apiRequest:", statusRes);

            // Only update state if user is still the same and component is not aborted
            if (signal.aborted) {
                console.log("❌ [fetchEvents] EARLY RETURN: signal ABORTED!");
                return;
            }
            if (latestUserIdRef.current !== currentUserId) {
                console.log("❌ [fetchEvents] EARLY RETURN: latestUserIdRef mismatch!");
                return;
            }
            
            console.log("⚠️ [fetchEvents] ABOUT TO CALL setGmailConnected with:", statusRes.data.connected, "[SOURCE: post-status-fetch]");
            setGmailConnected(statusRes.data.connected);
            console.log("✅ [fetchEvents] setGmailConnected CALLED! [SOURCE: post-status-fetch]");

            // Fetch Gmail stats if connected
            if (statusRes.data.connected) {
                try {
                    const statsRes = await apiRequest('/api/gmail/stats', {
                        headers: { Authorization: `Bearer ${backendToken}` },
                        signal
                    });
                    console.log("🔄 [fetchEvents] statsRes:", statsRes);
                    if (!signal.aborted && latestUserIdRef.current === currentUserId) {
                        setGmailStats(statsRes.data);
                    }
                } catch (statsErr) {
                    console.error("Error fetching Gmail stats:", statsErr);
                    // Don't block main flow on stats error
                }
            } else {
                setGmailStats(null);
            }

            // Then fetch events from Firestore
            const eventsRef = collection(db, 'detected_events');
            const q = query(eventsRef, where('userId', '==', currentUserId), orderBy('detectedAt', 'desc'));

            const querySnapshot = await getDocs(q);
            // Check again before updating state
            if (signal.aborted) return;
            if (latestUserIdRef.current !== currentUserId) return;
            const fetchedEvents: DetectedEvent[] = [];
            querySnapshot.forEach((doc) => {
                fetchedEvents.push({ id: doc.id, ...doc.data() } as DetectedEvent);
            });

            setEvents(fetchedEvents);
        } catch (error) {
            // Ignore abort errors (expected during logout, don't log them
            if (signal.aborted) return;
            // Ignore auth errors during logout (also expected)
            if (latestUserIdRef.current !== currentUserId) return;
            console.error('Error fetching events:', error);
            // Might need an index, check console for Firestore link
        } finally {
            // Only update loading if still valid
            if (latestUserIdRef.current === currentUserId && !signal.aborted) {
                setLoading(false);
            }
        }
    };

    const handleConnect = async () => {
        if (!user) return;
        try {
            if (!backendToken) {
                throw new Error('Backend authentication token is missing');
            }
            const res = await apiRequest('/api/gmail/connect', {
                headers: { Authorization: `Bearer ${backendToken}` }
            });
            if (res.data?.authUrl) {
                window.location.href = res.data.authUrl;
            }
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Could not connect to Google', variant: 'destructive' });
        }
    };

    const handleSync = async () => {
        if (!user) return;
        const currentUserId = user.uid;
        const abortController = new AbortController();
        try {
            setSyncing(true);
            if (!backendToken) {
                throw new Error('Backend authentication token is missing');
            }
            const res = await apiRequest('/api/gmail/sync', {
                method: 'POST',
                headers: { Authorization: `Bearer ${backendToken}` }
            });
            // Only show toast and fetchEvents if user is still the same
            if (latestUserIdRef.current === currentUserId) {
                toast({ title: 'Sync Completed', description: `Found ${res.data.newEventsCount} new events.` });
                fetchEvents(currentUserId, abortController.signal);
            }
        } catch (error: any) {
            if (latestUserIdRef.current !== currentUserId) return;
            const errorMsg = error.message || 'Gmail not connected or sync failed.';
            toast({
                title: 'Sync Failed',
                description: errorMsg,
                variant: 'destructive'
            });
            if (errorMsg.includes('not connected') || errorMsg.includes('expired')) {
                setGmailConnected(false);
            }
        } finally {
            if (latestUserIdRef.current === currentUserId) {
                setSyncing(false);
            }
        }
    };

    const handleDisconnect = async () => {
        console.log("✅ [1] Button onClick fired!");
        console.log("✅ [2] handleDisconnect entered!");
        
        if (!user) {
            console.log("❌ [3] Early return: No user!");
            return;
        }
        console.log("✅ [3] User exists, currentUserId:", user.uid);
        
        const currentUserId = user.uid;
        const abortController = new AbortController();
        
        try {
            setDisconnecting(true);
            console.log("✅ [4] Set disconnecting to true!");
            
            if (!backendToken) {
                throw new Error('Backend authentication token is missing');
            }
            console.log("✅ [5] Backend JWT token available!");
            
            console.log("✅ [6] About to send apiRequest DELETE to /api/gmail/disconnect!");
            await apiRequest('/api/gmail/disconnect', {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${backendToken}` }
            });
            console.log("✅ [7] apiRequest DELETE succeeded!");
            
            if (latestUserIdRef.current === currentUserId) {
                console.log("✅ [8] latestUserIdRef matches currentUserId, setting gmailConnected to false!");
                console.log("⚠️ About to setGmailConnected(false) [SOURCE: disconnect-success]");
                setGmailConnected(false); // Immediately set to false
                console.log("✅ setGmailConnected(false) CALLED! [SOURCE: disconnect-success]");
                toast({ title: 'Disconnected', description: 'Gmail has been unlinked.' });
                // Re-fetch backend status to confirm and update UI!
                console.log("✅ [9] Calling fetchEvents to confirm status!");
                fetchEvents(currentUserId, abortController.signal);
            } else {
                console.log("❌ [8] latestUserIdRef does NOT match currentUserId! Skipping UI update.");
            }
        } catch (error: any) {
            console.error("❌ Handle disconnect ERROR:", error);
            if (latestUserIdRef.current === currentUserId) {
                toast({ 
                    title: 'Error', 
                    description: error.message || 'Failed to disconnect', 
                    variant: 'destructive' 
                });
            }
        } finally {
            console.log("✅ [10] handleDisconnect finally block!");
            if (latestUserIdRef.current === currentUserId) {
                setDisconnecting(false);
            }
        }
    };

    return (
        <div id="gmail-events" className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
            <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        📧 Gmail Event Detector
                    </h2>
                    {gmailStats && (
                        <div className="flex flex-wrap gap-3 items-center">
                            <div className="text-sm text-slate-400 flex items-center gap-1">
                                📥 Total Mail: <span className="font-semibold text-white">{gmailStats.totalMessages.toLocaleString()}</span>
                            </div>
                            <Link href="/dashboard/student/mail" className="inline-flex items-center rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500">
                                View All Mail
                            </Link>
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    {!gmailConnected ? (
                        <button onClick={handleConnect} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
                            Connect Gmail
                        </button>
                    ) : (
                        <>
                            <button onClick={handleSync} disabled={syncing} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition disabled:opacity-50">
                                {syncing ? 'Syncing...' : 'Sync Events'}
                            </button>
                            <button onClick={handleDisconnect} disabled={disconnecting} className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-500 rounded-lg transition disabled:opacity-50">
                                {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
                {categories.map(category => (
                    <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition whitespace-nowrap ${
                            selectedCategory === category
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                        }`}
                    >
                        {category === 'All' ? 'All Events' : category} <span className="opacity-75 ml-1">{categorizedEvents[category].length}</span>
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="text-slate-400">Loading events...</div>
            ) : filteredEvents.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                    {!gmailConnected 
                        ? "Connect your Gmail to automatically detect hackathons, workshops, and tech events."
                        : selectedCategory === 'All'
                        ? "No events found yet. Try syncing!"
                        : `No ${selectedCategory.toLowerCase()} events found.`}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredEvents.map(event => (
                        <div key={event.id} className="bg-slate-700/30 p-4 rounded-xl border border-slate-600/50 hover:border-blue-500/30 transition">
                            <h3 className="font-semibold text-white mb-2 line-clamp-2" title={event.title}>{event.title}</h3>
                            <div className="text-sm text-slate-300 mb-1">📅 {new Date(event.date).toLocaleDateString()}</div>
                            <div className="text-sm text-slate-300 mb-3">🏢 {event.organizer}</div>
                            <a
                                href={event.registrationLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block text-sm text-blue-400 hover:text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-md transition"
                            >
                                View Email
                            </a>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

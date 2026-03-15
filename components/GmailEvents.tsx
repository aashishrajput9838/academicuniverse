"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { apiRequest } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
    const { user } = useAuth();
    const { toast } = useToast();
    const [events, setEvents] = useState<DetectedEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [gmailConnected, setGmailConnected] = useState(false);
    // Check if we just returned from OAuth
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const success = urlParams.get('gmail_success');
        const error = urlParams.get('gmail_error');
        if (success) {
            toast({ title: 'Success', description: 'Gmail connected successfully!' });
            // clean url
            window.history.replaceState({}, document.title, window.location.pathname);
            setGmailConnected(true);
            fetchEvents();
        } else if (error) {
            toast({ title: 'Error', description: `Failed to connect Gmail: ${error}`, variant: 'destructive' });
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [toast]);

    useEffect(() => {
        if (user) {
            fetchEvents();
        }
    }, [user]);

    const fetchEvents = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const token = await user.getIdToken();
            // First, check profile to see if Gmail is connected (placeholder check or assume true if we have events)
            // Actually we'll just try to fetch events from Firestore directly since it's client-side using Firebase SDK:
            const eventsRef = collection(db, 'detected_events');
            const q = query(eventsRef, where('userId', '==', user.uid), orderBy('detectedAt', 'desc'));

            const querySnapshot = await getDocs(q);
            const fetchedEvents: DetectedEvent[] = [];
            querySnapshot.forEach((doc) => {
                fetchedEvents.push({ id: doc.id, ...doc.data() } as DetectedEvent);
            });

            setEvents(fetchedEvents);
            // If we got here without throwing index errors and we have events, gmail might be connected
            if (fetchedEvents.length > 0) setGmailConnected(true);
        } catch (error) {
            console.error('Error fetching events:', error);
            // Might need an index, check console for Firestore link
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        try {
            const token = await user?.getIdToken();
            const res = await apiRequest('/api/gmail/connect', {
                headers: { Authorization: `Bearer ${token}` }
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
        try {
            setSyncing(true);
            const token = await user?.getIdToken();
            const res = await apiRequest('/api/gmail/sync', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            toast({ title: 'Sync Completed', description: `Found ${res.data.newEventsCount} new events.` });
            setGmailConnected(true);
            fetchEvents();
        } catch (error: any) {
            toast({
                title: 'Sync Failed',
                description: error.message || 'Gmail not connected or sync failed.',
                variant: 'destructive'
            });
            if (error.message?.includes('not connected')) {
                setGmailConnected(false);
            }
        } finally {
            setSyncing(false);
        }
    };

    const handleDisconnect = async () => {
        try {
            const token = await user?.getIdToken();
            await apiRequest('/api/gmail/disconnect', {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            setGmailConnected(false);
            toast({ title: 'Disconnected', description: 'Gmail has been unlinked.' });
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to disconnect', variant: 'destructive' });
        }
    };

    return (
        <div id="gmail-events" className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    📧 Gmail Event Detector
                </h2>
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
                            <button onClick={handleDisconnect} className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-500 rounded-lg transition">
                                Disconnect
                            </button>
                        </>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="text-slate-400">Loading events...</div>
            ) : events.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                    {gmailConnected
                        ? "No events found yet. Try syncing!"
                        : "Connect your Gmail to automatically detect hackathons, workshops, and tech events."}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {events.map(event => (
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

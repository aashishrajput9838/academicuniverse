"use client";

import { GmailEvents } from '@/components/GmailEvents';

export default function GmailEventsPage() {
    return (
        <div className="space-y-8">
            <div className="mb-4">
                <h1 className="text-3xl font-bold text-white mb-2">Events & Opportunities</h1>
                <p className="text-slate-400">Discover hackathons, workshops, and tech events automatically detected from your Gmail.</p>
            </div>

            <GmailEvents />
        </div>
    );
}

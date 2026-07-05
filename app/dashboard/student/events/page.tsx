"use client";

import { GmailEvents } from '@/components/GmailEvents';
import Link from 'next/link';

export default function GmailEventsPage() {
    return (
        <div className="space-y-8">
            <div className="mb-4">
                <h1 className="text-3xl font-bold text-white mb-2">Events & Opportunities</h1>
                <p className="text-slate-400">Discover hackathons, workshops, and tech events automatically detected from your Gmail.</p>
            </div>

            <div className="flex items-center justify-between gap-4">
                <GmailEvents />
                <Link href="/dashboard/student/mail" className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500">
                    View All Mail
                </Link>
            </div>
        </div>
    );
}

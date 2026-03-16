import { google } from 'googleapis';
import User from '../models/User';
import { getOAuth2Client } from './gmailAuthService';
import { firebaseFirestore } from '../config/firebaseAdmin';

const TARGET_KEYWORDS = [
    'hackathon', 'coding competition', 'tech event', 'workshop',
    'bootcamp', 'seminar', 'developer meetup', 'tech fest',
    'exam', 'examination', 'mid-semester', 'end-semester', 'quiz', 'assessment'
];

const SPAM_KEYWORDS = [
    'sale', 'discount', 'amazon', 'bank', 'otp', 'shopping',
    'promotion', 'newsletter'
];

export const syncGmailEvents = async (userId: string) => {
    const user = await User.findById(userId);
    if (!user || !user.gmailTokens) {
        throw new Error('User not found or Gmail not connected');
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
        access_token: user.gmailTokens.accessToken,
        refresh_token: user.gmailTokens.refreshToken,
        expiry_date: user.gmailTokens.expiryDate,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Fetch latest 50 emails that might be related to events or exams
    const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 50,
        q: 'hackathon OR "coding competition" OR "tech event" OR workshop OR bootcamp OR seminar OR "developer meetup" OR "tech fest" OR exam OR examination OR "mid-semester" OR "end-semester" OR quiz',
    });

    const messages = response.data.messages || [];
    let newEventsCount = 0;

    for (const message of messages) {
        if (!message.id) continue;

        const msgData = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full',
        });

        const headers = msgData.data.payload?.headers || [];
        const subjectHeader = headers.find(h => h.name?.toLowerCase() === 'subject');
        const fromHeader = headers.find(h => h.name?.toLowerCase() === 'from');
        const dateHeader = headers.find(h => h.name?.toLowerCase() === 'date');

        const subject = subjectHeader?.value || '';
        const from = fromHeader?.value || 'Unknown Organizer';
        const emailDate = dateHeader?.value ? new Date(dateHeader.value) : new Date();

        const snippet = msgData.data.snippet || '';
        
        const payload = msgData.data.payload;
        const getEmailBody = (p: any): string => {
            let body = '';
            if (!p) return body;
            if (p.body && p.body.data) {
                const base64 = p.body.data.replace(/-/g, '+').replace(/_/g, '/');
                body += Buffer.from(base64, 'base64').toString('utf-8') + ' ';
            }
            if (p.parts && p.parts.length > 0) {
                for (const part of p.parts) {
                    body += getEmailBody(part);
                }
            }
            return body;
        };
        const bodyText = getEmailBody(payload);

        const searchText = `${subject} ${snippet} ${bodyText}`.toLowerCase();

        // Check spam first
        const isSpam = SPAM_KEYWORDS.some(keyword => searchText.includes(keyword.toLowerCase()));
        if (isSpam) continue;

        // Check target keywords
        // We do this despite the 'q' parameter in case the 'q' matched a non-target keyword or just to be safe
        const isEvent = TARGET_KEYWORDS.some(keyword => searchText.includes(keyword.toLowerCase()));

        if (isEvent) {
            // Check if already exists to prevent duplicates
            const existingRef = await firebaseFirestore
                .collection('detected_events')
                .where('emailId', '==', message.id)
                .where('userId', '==', user.firebaseUid) // Query by firebaseUid
                .get();

            if (existingRef && !existingRef.empty) continue;

            const eventData = {
                userId: user.firebaseUid, // Frontend queries using Firebase uid
                mongoUserId: userId,      // Keep mongo DB id for safety
                emailId: message.id,
                title: subject,
                date: emailDate.toISOString(),
                location: 'See Email',
                registrationLink: `https://mail.google.com/mail/u/0/#inbox/${message.id}`,
                organizer: from.replace(/<.*>/, '').trim(), // Clean up email brackets
                emailSource: 'Gmail',
                detectedAt: new Date().toISOString(),
            };

            if (firebaseFirestore?.collection) {
                await firebaseFirestore.collection('detected_events').add(eventData);
                newEventsCount++;
            }
        }
    }

    return { success: true, newEventsCount };
};

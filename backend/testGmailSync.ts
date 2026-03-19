import mongoose from 'mongoose';
import { google } from 'googleapis';

// The user's production DB URI
const MONGODB_URI = 'mongodb+srv://aashishrajput9838_db_user:BanEHhshbciDl2Hq@academicuniversecluster.mkkp87x.mongodb.net/?appName=academicuniversecluster1';
const GITHUB_CLIENT_ID = 'Ov23lim0k1uans8fwkZa';
const GITHUB_CLIENT_SECRET = '3e5f0b720fec6d9eca2394a67155cefa7db83fb5';
const GOOGLE_CLIENT_ID = '500719954463-v9sh5g43f3edgg5ausbjm5v2c81sem6o.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const GOOGLE_REDIRECT_URI = 'https://academicuniverse.onrender.com/api/gmail/callback';

const TARGET_KEYWORDS = [
    'hackathon', 'coding competition', 'tech event', 'workshop',
    'bootcamp', 'seminar', 'developer meetup', 'tech fest',
    'exam', 'examination', 'mid-semester', 'end-semester', 'quiz', 'assessment'
];

const SPAM_KEYWORDS = [
    'sale', 'discount', 'amazon', 'bank', 'otp', 'shopping',
    'promotion', 'newsletter'
];

async function runTest() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        // Find a user that has gmailTokens
        const User = mongoose.connection.collection('users');
        const user = await User.findOne({ gmailTokens: { $exists: true, $ne: null } });

        if (!user) {
            console.log('No users found with gmailTokens. Cannot test.');
            process.exit(0);
        }

        console.log(`Testing using user: ${user.email}`);

        const oauth2Client = new google.auth.OAuth2(
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET,
            GOOGLE_REDIRECT_URI
        );

        oauth2Client.setCredentials({
            access_token: user.gmailTokens.accessToken,
            refresh_token: user.gmailTokens.refreshToken,
            expiry_date: user.gmailTokens.expiryDate,
        });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        console.log('Fetching latest 20 emails with query...');
        const response = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 20,
            q: 'hackathon OR "coding competition" OR "tech event" OR workshop OR bootcamp OR seminar OR "developer meetup" OR "tech fest" OR exam OR examination OR "mid-semester" OR "end-semester" OR quiz',
        });

        const messages = response.data.messages || [];
        console.log(`Found ${messages.length} thread stubs matching query.`);

        for (const message of messages) {
            const msgData = await gmail.users.messages.get({
                userId: 'me',
                id: message.id!,
                format: 'full',
            });

            const headers = msgData.data.payload?.headers || [];
            const subjectHeader = headers.find(h => h.name?.toLowerCase() === 'subject');
            const subject = subjectHeader?.value || '';
            const snippet = msgData.data.snippet || '';

            let bodyText = '';
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
            bodyText = getEmailBody(payload);

            const searchText = `${subject} ${snippet} ${bodyText}`.toLowerCase();
            
            if (!searchText.includes('sharda informatics') && !searchText.includes('design pattern')) continue;

            console.log(`\n================================`);
            console.log(`SUBJECT: ${subject}`);
            console.log(`BODY PREVIEW: ${bodyText.substring(0, 300)}...`);
            
            const isSpam = SPAM_KEYWORDS.some(keyword => searchText.includes(keyword.toLowerCase()));
            const isEvent = TARGET_KEYWORDS.some(keyword => searchText.includes(keyword.toLowerCase()));
            
            if (isSpam) {
                console.log('-> SKIPPED (Spam Keyword Matched)');
                const matchedSpam = SPAM_KEYWORDS.filter(k => searchText.includes(k.toLowerCase()));
                console.log(`   Matched spam words: ${matchedSpam.join(', ')}`);
            } else if (isEvent) {
                console.log('-> DETECTED AS EVENT ✅');
                const matchedEvent = TARGET_KEYWORDS.filter(k => searchText.includes(k.toLowerCase()));
                console.log(`   Matched target words: ${matchedEvent.join(', ')}`);
            } else {
                console.log('-> SKIPPED (No Event Keywords Found in Payload)');
                console.log(`   Snippet: ${snippet.substring(0, 100)}...`);
            }
        }

        process.exit(0);
    } catch (e) {
        console.error('Test Failed:', e);
        process.exit(1);
    }
}

runTest();

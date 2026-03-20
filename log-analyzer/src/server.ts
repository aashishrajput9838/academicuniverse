import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import readline from 'readline';
import { analyzeLog } from './aiService';

const app = express();
app.use(express.json());
app.use(cors());

interface ActiveError {
    signature: string;
    route: string;
    method: string;
    message: string;
    analysis: any;
    lastSeen: number;
}

// Global state for the real-time CLI dashboard
const activeErrors = new Map<string, ActiveError>();

let isAnalyzing = false; // Prevent overlapping rendering glitches while Gemini is "thinking"

// Setup Interactive CLI
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
}

process.stdin.on('keypress', (str, key) => {
    // Handle manual system exit
    if (key.ctrl && key.name === 'c') {
        process.exit();
    }
    // Handle manual error resolution
    if (key.name === 'c' || key.name === 'r') {
        activeErrors.clear();
        console.clear();
        renderDashboard();
    }
});

const renderDashboard = () => {
    if (isAnalyzing) return; // Don't wipe the terminal if Gemini is busy fetching

    console.clear();
    console.log('\x1b[36m%s\x1b[0m', '============================================================');
    console.log('\x1b[1m\x1b[32m%s\x1b[0m', '      🚀 ACADEMIC UNIVERSE REAL-TIME LOG ANALYZER');
    console.log('\x1b[36m%s\x1b[0m', '============================================================');
    console.log(`\x1b[90mTracking live errors. Press \x1b[1m\x1b[35m[C]\x1b[90m to clear all resolved errors.\x1b[0m\n`);

    const now = Date.now();
    let displayCount = 0;

    for (const [signature, err] of activeErrors.entries()) {
        displayCount++;
        const secondsAgo = Math.floor((now - err.lastSeen) / 1000);
        
        const color = err.analysis?.severity === 'critical' || err.analysis?.severity === 'high' 
            ? '\x1b[31m' // Red
            : '\x1b[33m'; // Yellow

        console.log(`${color}[${(err.analysis?.severity || 'MEDIUM').toUpperCase()}]\x1b[0m \x1b[1m${err.route || 'Unknown Route'}\x1b[0m`);
        console.log(`\x1b[37mCause:\x1b[0m ${err.analysis?.cause || 'Analyzing...'}`);
        console.log(`\x1b[32mFix:\x1b[0m   ${err.analysis?.fix || 'Waiting for Gemini...'}`);
        console.log(`\x1b[90mLast Seen: ${secondsAgo}s ago \x1b[0m`);
        console.log('\x1b[90m------------------------------------------------------------\x1b[0m');
    }

    if (displayCount === 0) {
        console.log('\x1b[32m✨ All systems are healthy! Zero active errors detected.\x1b[0m\n');
    }
};

// Start the auto-refresh and vanish UI loop (Runs every 1 second for smooth rendering)
setInterval(renderDashboard, 1000);

app.post('/api/analyze-logs', async (req, res) => {
    try {
        const { timestamp, route, method, status, message, stack } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const signature = `${method}_${route}_${message.substring(0, 100)}`;
        const now = Date.now();
        
        if (activeErrors.has(signature)) {
            // Error is already on dashboard, just refresh its Last Seen timer!
            const existingError = activeErrors.get(signature)!;
            existingError.lastSeen = now;
            activeErrors.set(signature, existingError);
            renderDashboard(); // Force immediate redraw
            return res.status(200).json({ status: 'ignored', reason: 'duplicate, refreshed timer' });
        }

        // New Error Detected! Pause the UI to log the waking state.
        isAnalyzing = true;
        console.log(`\n\x1b[33m[Analyzer] 🤖 New crash detected on ${route}. Waking Gemini for analysis...\x1b[0m`);
        
        // Register immediately to prevent race conditions from concurrent identical requests
        activeErrors.set(signature, {
            signature, route, method, message,
            analysis: { cause: 'Analyzing...', fix: 'Drafting fix...', severity: 'medium' },
            lastSeen: now
        });

        const payload = { timestamp, route, method, status, message, stack };
        const analysis = await analyzeLog(payload);

        // Update the error mapping with full Gemini analysis
        const updatedError = activeErrors.get(signature)!;
        updatedError.analysis = analysis;
        activeErrors.set(signature, updatedError);
        
        isAnalyzing = false;
        renderDashboard(); // Resumes dashboard rendering loop with the new analysis block!

        return res.status(200).json({ status: 'success', data: analysis });
    } catch (err: any) {
        isAnalyzing = false;
        console.error('\x1b[31m[Analyzer] Internal Error:\x1b[0m', err.message);
        return res.status(500).json({ error: 'Failed to process log' });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Log Analyzer MCP is running.' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    renderDashboard(); // Paint the Initial Healthy Render
});

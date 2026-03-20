import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { analyzeLog } from './aiService';

const app = express();
app.use(express.json());
app.use(cors());

// In-memory cache to prevent spamming the AI with the same error multiple times
// Key: error signature, Value: timestamp
const errorCache = new Map<string, number>();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

app.post('/api/analyze-logs', async (req, res) => {
    try {
        const { timestamp, route, method, status, message, stack } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Create a simple error signature for deduplication
        const signature = `${method}_${route}_${message.substring(0, 100)}`;
        const now = Date.now();
        
        if (errorCache.has(signature)) {
            const lastSeen = errorCache.get(signature)!;
            if (now - lastSeen < CACHE_TTL) {
                console.log(`[Deduplicator] Ignoring duplicate error: ${signature}`);
                return res.status(200).json({ status: 'ignored', reason: 'duplicate' });
            }
        }

        console.log(`[Analyzer] Valid error received from ${route || 'Unknown Route'}`);
        // Register error in cache to immediately block further spam
        errorCache.set(signature, now);

        const payload = { timestamp, route, method, status, message, stack };
        const analysis = await analyzeLog(payload);

        console.log(`[Analyzer] Analysis complete:`, analysis);

        return res.status(200).json({ status: 'success', data: analysis });
    } catch (err: any) {
        console.error('[Analyzer] Internal Error:', err.message);
        return res.status(500).json({ error: 'Failed to process log' });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Log Analyzer MCP is running.' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`[System] Log Analyzer MCP Server running on port ${PORT}`);
});

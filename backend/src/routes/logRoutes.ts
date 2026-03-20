import { Router } from 'express';
import { forwardErrorToAI } from '../services/logForwarder';

const router = Router();

// Endpoint specifically to accept React frontend crash telemetry
router.post('/frontend', (req, res) => {
    try {
        const { route, message, stack } = req.body;
        
        if (!message) {
            return res.status(400).json({ status: 'ignored', reason: 'message missing' });
        }

        // We forward it immediately to the Log MCP using 'FRONTEND_CRASH' as the method identifier
        forwardErrorToAI(
            route || 'Unknown Frontend Page',
            'FRONTEND_CRASH',
            500, // Classify frontend crashes as highest severity
            message,
            stack
        );

        return res.status(200).json({ status: 'received' });
    } catch(err) {
        return res.status(500).json({ status: 'error' });
    }
});

export default router;

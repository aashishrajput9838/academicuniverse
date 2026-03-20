import { Router } from 'express';
import { forwardErrorToAI } from '../services/logForwarder';
import AILogAnalysis from '../models/AILogAnalysis';

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

// Endpoint specifically to accept Vercel Webhooks (Build Errors)
// Note: This operates independently of the Gemini AI to prevent spam during pipeline crashes.
router.post('/vercel-build', async (req, res) => {
    try {
        const payload = req.body;
        
        // Vercel Webhooks send a `type` field to identify the event
        if (payload?.type === 'deployment.error' || payload?.type === 'deployment.canceled') {
            const deploymentUrl = payload?.payload?.deployment?.url || 'Unknown Subdomain';
            const projectName = payload?.payload?.project?.name || 'Academic Universe Frontend';
            const inspectUrl = payload?.payload?.deployment?.inspectorUrl || 'Vercel Dashboard';
            const buildError = payload?.payload?.deployment?.meta?.error || 'Build compilation failed';

            const errorMessage = `🚨 [Vercel Build Error] Project: ${projectName} - ${buildError}`;
            console.error(errorMessage);

            // Forward the crash telemetry to the Log Analyzer MCP for intelligent Gemini diagnosis
            forwardErrorToAI(
                'VERCEL_CI/CD_PIPELINE',
                'BUILD_CRASH',
                500,
                errorMessage,
                `Vercel URL: ${deploymentUrl}\nInspector URL: ${inspectUrl}\nError details: ${buildError}`
            );
        }

        // Always return 200 OK so Vercel doesn't aggressively retry the webhook
        return res.status(200).json({ status: 'received' });
    } catch(err) {
        console.error('Failed to process Vercel webhook:', err);
        return res.status(500).json({ status: 'error' });
    }
});

export default router;

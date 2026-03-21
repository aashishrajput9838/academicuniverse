import AILogAnalysis from '../models/AILogAnalysis';

// The URL of our new log-analyzer MCP
// In production, you would point this to the deployed URL of the MCP server
const MCP_URL = process.env.LOG_ANALYZER_URL || 'http://localhost:5001/api/analyze-logs';

const saveFallbackLog = async (route: string, method: string, status: number, message: string, stack?: string) => {
    try {
        const signature = `${method}_${route}_${message.substring(0, 100)}`;
        await AILogAnalysis.create({
            errorSignature: signature,
            timestamp: new Date().toISOString(),
            route,
            method,
            status,
            message,
            stackTrace: stack,
            aiAnalysis: {
                cause: 'Log Analyzer Unreachable - Raw Log Saved',
                fix: 'Ensure Log Analyzer service is deployed and LOG_ANALYZER_URL is set.',
                severity: 'medium'
            }
        });
        console.warn(`[LogForwarder] Stored raw log in MongoDB for fallback.`);
    } catch(err) {
        console.error('[LogForwarder] Fatal: Failed to save fallback log', err);
    }
};

export const forwardErrorToAI = async (
    route: string,
    method: string,
    status: number,
    message: string,
    stack?: string
) => {
    // Fire and forget so we don't block the main thread or user request
    setImmediate(async () => {
        try {
            const payload = {
                timestamp: new Date().toISOString(),
                route,
                method,
                status,
                message,
                stack
            };

            const response = await fetch(MCP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json() as any;
                if (data.status === 'success' && data.data) {
                    const analysis = data.data;
                    const signature = `${method}_${route}_${message.substring(0, 100)}`;

                    await AILogAnalysis.create({
                        errorSignature: signature,
                        timestamp: payload.timestamp,
                        route,
                        method,
                        status,
                        message,
                        stackTrace: stack,
                        aiAnalysis: {
                            cause: analysis.cause || 'Unknown',
                            fix: analysis.fix || 'No fix provided',
                            severity: analysis.severity || 'medium'
                        }
                    });
                    
                    // Console log the instant alert
                    console.log(`\n🚨 [AI LOG ALERT] SEVERITY: ${analysis.severity.toUpperCase()}`);
                    console.log(`Route: ${method} ${route}`);
                    console.log(`Cause: ${analysis.cause}`);
                    console.log(`Fix: ${analysis.fix}\n`);
                }
            } else {
                console.warn(`[LogForwarder] MCP Server returned status: ${response.status}`);
                await saveFallbackLog(route, method, status, message, stack);
            }
        } catch (err: any) {
            // Silently fail if MCP is down, to avoid infinite error loops
            console.warn('[LogForwarder] Failed to connect to MCP or save analysis:', err.message);
            await saveFallbackLog(route, method, status, message, stack);
        }
    });
};

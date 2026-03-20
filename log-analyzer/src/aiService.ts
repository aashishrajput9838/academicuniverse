import { GoogleGenAI, Type, Schema } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const analyzeLog = async (logData: any) => {
    if (!process.env.GEMINI_API_KEY) {
        console.warn('[AI Service] GEMINI_API_KEY is not set in log-analyzer environment.');
        return { 
            cause: 'Skipped - API Key missing on Log Analyzer MCP', 
            fix: 'Add GEMINI_API_KEY to log-analyzer/.env', 
            severity: 'high' 
        };
    }

    const systemPrompt = `You are a Senior Systems Engineer and Site Reliability Expert (SRE).
Your task is to analyze application error logs efficiently, identify the root technical cause, and formulate a direct, actionable solution for the developer.`;

    const logString = JSON.stringify(logData, null, 2);
    const prompt = `Analyze this server error log and provide the exact cause and fix.\n\nLog Data:\n${logString}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.1, // Analytical
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        cause: { type: Type.STRING, description: "The underlying root technical cause of the error" },
                        fix: { type: Type.STRING, description: "Step-by-step actionable instruction to cleanly fix it" },
                        severity: { type: Type.STRING, description: "Must be 'low', 'medium', or 'high'" }
                    },
                    required: ["cause", "fix", "severity"]
                } as Schema
            }
        });

        if (!response.text) {
            throw new Error("No text returned by AI");
        }
        
        return JSON.parse(response.text);
    } catch (error: any) {
        console.error('[AI Service] Gemini API Error:', error.message);
        return { 
            cause: 'Failed to complete AI analysis due to Gemini API error', 
            fix: 'Check MCP server logs for specific API rejection details', 
            severity: 'low' 
        };
    }
};

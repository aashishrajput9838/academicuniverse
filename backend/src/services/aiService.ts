import { GoogleGenAI } from '@google/genai';
import { Logger } from '../utils/logger';

const logger = new Logger('aiService');

class AIService {
    private ai: GoogleGenAI | null = null;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'your_gemini_api_key_here') {
            logger.warn('GEMINI_API_KEY is not set or is using placeholder. AI features will be limited to mock responses.');
        } else {
            this.ai = new GoogleGenAI({ apiKey: apiKey });
            logger.info('Google Gemini client initialized successfully');
        }
    }

    async generateSupportResponse(
        message: string,
        mood: string,
        context: any,
        history: any[] = []
    ): Promise<string> {
        if (!this.ai) {
            return this.generateMockResponse(message, mood, context);
        }

        try {
            const systemPrompt = `You are an empathetic Emotional Intelligence Assistant for university students at Sharda University. 
Current Student Mood: ${mood}
Academic Context: ${JSON.stringify(context)}

Your goal is to provide supportive, non-judgmental, and practical advice. 
If the student is stressed, suggest study breaks or time management. 
If they have a busy timetable, acknowledge their workload. 
Always include a supportive tone and keep responses concise but warm.
Safety Disclaimer: Remind them you are an AI assistant and not a professional counselor if they express serious distress.`;

            // Format history into a single string to provide context since genai API expects text
            let conversationHistory = "";
            if (history && history.length > 0) {
                conversationHistory = "Previous Conversation History:\n" + history.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join("\n") + "\n\n";
            }

            const fullPrompt = `${conversationHistory}Student's current message: ${message}`;

            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: fullPrompt,
                config: {
                    systemInstruction: systemPrompt,
                    temperature: 0.7,
                    maxOutputTokens: 500,
                }
            });

            return response.text || 'I am here to support you, but I am currently having trouble processing your request.';
        } catch (error: any) {
            logger.error('Error calling Google Gemini API:', error);
            return 'I am currently experiencing some technical difficulties, but remember that your well-being is important. Take a deep breath.';
        }
    }

    private generateMockResponse(message: string, mood: string, context: any): string {
        const classCount = context?.todayClasses || 0;
        const freeSlots = context?.freeSlots || [];
        const day = context?.day || 'today';
        const weeklyTotal = context?.totalWeeklyClasses || 0;

        let contextTag = `[Context Verified: ${classCount} classes today, Total ${weeklyTotal} per week]`;

        // Weekend specific verification
        if (context?.mondayPreview) {
            contextTag = `[Weekend Mode: 0 classes today, but I see ${context.mondayPreview.classes} classes booked for Monday!]`;
        }

        const responses: Record<string, string[]> = {
            stressed: [
                `I see you have ${classCount} classes today. ${weeklyTotal > 0 ? `With ${weeklyTotal} total sessions this week, I understand why you might feel the pressure.` : ''} ${freeSlots.length > 0 ? `Try using your free slot at ${freeSlots[0]} for a quick break.` : ''}`,
                `Take a deep breath. ${context?.mondayPreview ? `I see you have ${context.mondayPreview.classes} classes starting Monday (${context.mondayPreview.subjects.join(', ')}). Spend this weekend resting so you're ready!` : `You have ${classCount} classes scheduled. How can I help you organize them?`}`
            ],
            overwhelmed: [
                `It sounds like a lot is on your plate. With ${weeklyTotal} total classes in your timetable, balance is key! What's one small thing we can focus on right now?`,
                `With ${classCount} classes today, remember to stay hydrated between your sessions.`
            ],
            happy: [
                `It's great to see you're in a good mood! ${classCount > 0 ? `Enjoy your ${classCount} classes today.` : `Since it's ${day}, enjoy your time off!`}`,
                `I love that positive vibe! What's been the highlight of your ${day} so far?`
            ],
            neutral: [
                `You have ${classCount} classes and ${freeSlots.length} free slots today. How is your day going? I'm here if you want to chat about your ${weeklyTotal} weekly subjects.`,
                `Consistency is key! You're doing a great job staying on track with your ${classCount} classes for ${day}.`
            ]
        };

        const moodResponses = responses[mood.toLowerCase()] || responses['neutral'];
        const selectedMessage = moodResponses[Math.floor(Math.random() * moodResponses.length)];

        return `${contextTag}\n\n${selectedMessage}`;
    }
}

export default new AIService();

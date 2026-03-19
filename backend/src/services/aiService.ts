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

    /**
     * Enhances resume fields (experience, projects, skills, education) using AI
     * Preserves raw layout tags to avoid breaking docxtemplater injection
     */
    async enhanceResumeFields(data: any, tone: string): Promise<any> {
        if (!this.ai) {
            logger.warn('Gemini API not configured. Bypassing resume enhancement.');
            return data;
        }

        try {
            logger.info(`Enhancing resume fields with tone: ${tone}`);
            const systemPrompt = `You are a senior professional resume writer and career coach. 
Your task is to rewrite a student's raw resume input to be highly professional, ATS-friendly, and impactful.
Apply the specific tone requested: ${tone.toUpperCase()}.
If the tone is PROFESSIONAL, use strong action verbs and metric-driven points. If CREATIVE, make the phrasing stand out. If CONCISE, keep it brief and direct.

CRITICAL RULES:
1. ONLY modify 'experience', 'projects', 'skills', and 'education'. Make them sound much better.
2. DO NOT change 'name', 'email', or 'phone'.
3. Maintain any bullet points or newlines if the user included them, but fix grammar and phrasing.
4. Output MUST be valid JSON matching the exact keys provided.`;

            const prompt = `Here is the user's raw resume data. Enhance education, skills, projects, and experience.
Return the complete JSON object:
${JSON.stringify(data, null, 2)}`;

            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    systemInstruction: systemPrompt,
                    temperature: 0.7,
                    responseMimeType: 'application/json',
                }
            });

            const responseText = response.text;
            if (!responseText) return data;
            
            const enhancedData = JSON.parse(responseText);
            
            // Merge safely: protect original core fields (name, email, phone) from AI hallucinations
            return {
                ...data,
                education: enhancedData.education || data.education,
                skills: enhancedData.skills || data.skills,
                projects: enhancedData.projects || data.projects,
                experience: enhancedData.experience || data.experience,
            };
        } catch (error: any) {
            logger.error('Error enhancing resume fields with Gemini API:', error);
            // Fallback to original data if AI fails
            return data;
        }
    }
}

export default new AIService();

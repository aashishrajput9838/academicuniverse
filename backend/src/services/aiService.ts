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
     * Enhances dynamically identified resume fields using AI
     * Preserves raw layout tags to avoid breaking docxtemplater injection
     */
    async enhanceResumeFields(data: any, tone: string, enhanceableTags: string[]): Promise<any> {
        if (!this.ai || !enhanceableTags || enhanceableTags.length === 0) {
            logger.warn('Gemini API not configured or no enhanceable tags provided. Bypassing enhancement.');
            return data;
        }

        try {
            logger.info(`Enhancing resume fields with tone: ${tone}`);
            const systemPrompt = `You are a senior professional resume writer and career coach. 
Your task is to rewrite a student's raw resume input to be highly professional, ATS-friendly, and impactful.
Apply the specific tone requested: ${tone.toUpperCase()}.
If the tone is PROFESSIONAL, use strong action verbs and metric-driven points. If CREATIVE, make the phrasing stand out. If CONCISE, keep it brief and direct.

CRITICAL RULES:
1. ONLY modify the following fields: ${enhanceableTags.join(', ')}. Make them sound much better.
2. DO NOT change ANY other fields.
3. Maintain any bullet points or newlines if the user included them, but fix grammar and phrasing.
4. Output MUST be valid JSON matching the exact keys provided.`;

            const prompt = `Here is the user's raw resume data. Enhance ONLY these fields: ${enhanceableTags.join(', ')}.
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
            
            // Merge safely: protect original core fields from AI hallucinations
            const safeData = { ...data };
            for (const tag of enhanceableTags) {
                if (enhancedData[tag]) {
                    safeData[tag] = enhancedData[tag];
                }
            }
            return safeData;
        } catch (error: any) {
            logger.error('Error enhancing resume fields with Gemini API:', error);
            // Fallback to original data if AI fails
            return data;
        }
    }

    /**
     * Analyzes raw docxtemplater tags and generates a structured questionnaire
     */
    async generateTemplateQuestions(tags: string[]): Promise<any[]> {
        if (!this.ai) {
            logger.warn('Gemini API not configured. Falling back to basic tag mapping.');
            return tags.map(tag => ({
                tag,
                question: `Please enter details for ${tag.replace(/_/g, ' ')}`,
                type: tag.toLowerCase().includes('desc') || tag.toLowerCase().includes('experience') ? 'textarea' : 'text',
                aiEnhanceable: false
            }));
        }

        try {
            logger.info(`Generating AI questions for ${tags.length} template tags`);
            const systemPrompt = `You are an intelligent form builder for a Resume Generation system.
I will give you an array of raw {{tags}} found extracted from a Microsoft Word resume template.
Your job is to generate a user-friendly questionnaire to collect this data from a student.
For each tag, return:
- "tag": The exact original tag name.
- "question": A human-readable, professional question asking the student for this information (e.g., "project1_desc" -> "Describe your first major project").
- "type": "text" for short inputs (names, phones, emails, job titles, dates, degrees) OR "textarea" for paragraph answers (descriptions, summaries, bullet points, skills list).
- "aiEnhanceable": true ONLY IF the field is a "textarea" where the student explains their experience, projects, or summary, so our AI can rewrite it later. Set false for names, dates, emails, links, short inputs, etc.

CRITICAL RULES:
1. Return ONLY a valid JSON array of objects.
2. Ensure every single tag from the input array is included in the output.`;

            const prompt = `Tags to process: ${JSON.stringify(tags)}`;

            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    systemInstruction: systemPrompt,
                    temperature: 0.2, // Low temperature for deterministic schema generation
                    responseMimeType: 'application/json',
                }
            });

            if (!response.text) throw new Error("Empty response from AI");
            return JSON.parse(response.text);
        } catch (error: any) {
            logger.error('Error generating template questions:', error);
            // Fallback
            return tags.map(tag => ({
                tag,
                question: `Please provide: ${tag}`,
                type: 'text',
                aiEnhanceable: false
            }));
        }
    }

    async analyzeImage(
        message: string,
        imageBase64: string,
        mimeType: string,
        context: any,
        history: any[] = []
    ): Promise<string> {
        if (!this.ai) {
            return "I run in mock mode because Gemini is not configured. I received your image but cannot see it. I assume it's wonderful!";
        }

        try {
            logger.info('Analyzing image using Gemini Vision');
            
            const systemPrompt = `You are a helpful and intelligent AI assistant inside 'Academic Universe'. 
Your task: Analyze the provided image and explain it clearly. If it contains a question, solve it step-by-step. If it contains notes, summarize them concisely.
Respond intelligently based on the image context and the user's message. Use formatting to make it readable.`;

            let conversationHistory = "";
            if (history && history.length > 0) {
                conversationHistory = "Previous Chat Context:\n" + history.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join("\n") + "\n\n";
            }

            const promptText = `${conversationHistory}User's message: ${message || 'Please analyze this image.'}`;

            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { inlineData: { data: imageBase64, mimeType } },
                            { text: promptText }
                        ]
                    }
                ],
                config: {
                    systemInstruction: systemPrompt,
                    temperature: 0.7,
                }
            });

            logger.info('Gemini raw response parts:', JSON.stringify(response.candidates?.[0]?.content?.parts || []));
            logger.info('Gemini finishReason:', response.candidates?.[0]?.finishReason);

            if (response.text) {
                return response.text;
            } else if (response.candidates?.[0]?.finishReason === 'SAFETY') {
                return "I'm sorry, I cannot analyze this image due to safety guidelines.";
            } else {
                return "I processed the image but could not generate a response. (No text returned by the model)";
            }
        } catch (error: any) {
            logger.error('Error analyzing image with Gemini:', error);
            return "I failed to analyze the image. The file might be too large or the image format is unsupported.";
        }
    }
}

export default new AIService();

import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { firebaseFirestore } from '../config/firebaseAdmin';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Helper to reliably parse Gemini JSON from markdown blocks
const parseGeminiJson = (rawText: string): any => {
    let cleanJson = rawText.trim();
    if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/```json/g, '').replace(/```/g, '').trim();
    } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/```/g, '').trim();
    }
    return JSON.parse(cleanJson);
};

export const generateTopics = async (req: Request, res: Response): Promise<void> => {
    try {
        const { domain } = req.body;
        if (!domain) {
            res.status(400).json({ message: 'Domain or interest is required' });
            return;
        }

        const prompt = `Generate 5 unique, high-quality, and highly specific academic research paper topics within the domain of: "${domain}".
        Return EXACTLY a valid JSON array of strings, where each string is a topic title.
        Do not return markdown formatting, only the raw JSON array. Example: ["Topic 1", "Topic 2"]`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { temperature: 0.7 }
        });

        const rawText = response.text;
        if (!rawText) throw new Error("Empty response from AI");
        
        const topics = parseGeminiJson(rawText);
        res.status(200).json({ topics });
    } catch (error: any) {
        console.error('Error generating topics:', error);
        res.status(500).json({ message: error.message || 'Failed to generate topics' });
    }
};

export const generateOutline = async (req: Request, res: Response): Promise<void> => {
    try {
        const { topic } = req.body;
        if (!topic) {
            res.status(400).json({ message: 'Topic is required' });
            return;
        }

        const prompt = `Create a detailed, highly structured academic research paper outline for the topic: "${topic}".
        Return EXACTLY a valid JSON array of objects. Each object should represent a major section (like Abstract, Introduction, Literature Review, Methodology, Results, Conclusion).
        Format: [{"title": "1. Introduction", "points": ["Background", "Problem Statement", "Objectives"]}]
        Do not use markdown formatting, only the JSON string.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { temperature: 0.5 }
        });

        const rawText = response.text;
        if (!rawText) throw new Error("Empty response from AI");
        
        const outline = parseGeminiJson(rawText);
        res.status(200).json({ outline });
    } catch (error: any) {
        console.error('Error generating outline:', error);
        res.status(500).json({ message: error.message || 'Failed to generate outline' });
    }
};

export const improveContent = async (req: Request, res: Response): Promise<void> => {
    try {
        const { text } = req.body;
        if (!text) {
            res.status(400).json({ message: 'Text content is required' });
            return;
        }

        const prompt = `Rewrite the following paragraph in a highly formal, academic, and professional tone. Correct any grammar mistakes and drastically improve clarity and flow.
        Return EXACTLY a valid JSON object with: "improvedText" (string).
        Original text: "${text}"`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { temperature: 0.2 }
        });

        const rawText = response.text;
        if (!rawText) throw new Error("Empty response from AI");
        
        const data = parseGeminiJson(rawText);
        res.status(200).json({ improvedText: data.improvedText });
    } catch (error: any) {
        console.error('Error improving content:', error);
        res.status(500).json({ message: error.message || 'Failed to improve content' });
    }
};

export const generateAbstract = async (req: Request, res: Response): Promise<void> => {
    try {
        const { content } = req.body;
        if (!content) {
            res.status(400).json({ message: 'Content is required' });
            return;
        }

        const prompt = `Generate a concise, highly professional, 250-word academic abstract for the following research content. It must summarize the background, methodology, and implicit conclusions of the provided text.
        Return EXACTLY a valid JSON object with: "abstract" (string).
        Content: "${content.substring(0, 10000)}"`; // Cap length to avoid token limits

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { temperature: 0.3 }
        });

        const rawText = response.text;
        if (!rawText) throw new Error("Empty response from AI");
        
        const data = parseGeminiJson(rawText);
        res.status(200).json({ abstract: data.abstract });
    } catch (error: any) {
        console.error('Error generating abstract:', error);
        res.status(500).json({ message: error.message || 'Failed to generate abstract' });
    }
};

export const generateCitations = async (req: Request, res: Response): Promise<void> => {
    try {
        const { details } = req.body;
        if (!details) {
            res.status(400).json({ message: 'Source details are required' });
            return;
        }

        const prompt = `Generate precisely formatted citations in APA, MLA, and IEEE formats given the following source details/metadata: "${details}".
        Return EXACTLY a valid JSON object with the keys "apa", "mla", and "ieee" containing the formatted string citations.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { temperature: 0.1 } // Very low temperature for strict formatting
        });

        const rawText = response.text;
        if (!rawText) throw new Error("Empty response from AI");
        
        const citations = parseGeminiJson(rawText);
        res.status(200).json({ citations });
    } catch (error: any) {
        console.error('Error generating citations:', error);
        res.status(500).json({ message: error.message || 'Failed to generate citations' });
    }
};

// FIRESTORE HISTORY CONTROLLERS
export const saveResearchProgress = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        const { id, topic, outline, content, abstract, citations } = req.body;

        const researchData = {
            userId: user.userId,
            topic: topic || '',
            outline: outline || [],
            content: content || {},
            abstract: abstract || '',
            citations: citations || [],
            updatedAt: new Date().toISOString()
        };

        let docId = id;
        
        if (id) {
            // Update existing
            await firebaseFirestore.collection('research').doc(id).update(researchData);
        } else {
            // Create new
            const docRef = await firebaseFirestore.collection('research').add({
                ...researchData,
                createdAt: new Date().toISOString()
            });
            docId = docRef.id;
        }

        res.status(200).json({ message: 'Research saved successfully', id: docId });
    } catch (error: any) {
        console.error('Error saving research:', error);
        res.status(500).json({ message: error.message || 'Failed to save research' });
    }
};

export const getResearchHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        
        const snapshot = await firebaseFirestore
            .collection('research')
            .where('userId', '==', user.userId)
            .limit(50)
            .get();

        const history = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        })).sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());

        res.status(200).json({ history });
    } catch (error: any) {
        console.error('Error fetching research history:', error);
        res.status(500).json({ message: error.message || 'Failed to fetch history' });
    }
};

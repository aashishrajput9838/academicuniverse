import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { firebaseFirestore } from '../config/firebaseAdmin';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const improveSentence = async (req: Request, res: Response): Promise<void> => {
    try {
        const { originalSentence } = req.body;
        const user = (req as any).user;

        if (!originalSentence) {
            res.status(400).json({ error: 'Sentence is required' });
            return;
        }

        const prompt = `Analyze the given sentence for grammar, fluency, and clarity.
Return EXACTLY a valid JSON object with the following keys:
1. "correctedSentence" (string: Grammatically correct version)
2. "improvedSentence" (string: More professional or eloquent version)
3. "fluencyScore" (number: score out of 10)
4. "shortTip" (string: One short tip for improvement)

Do not return Markdown code blocks. Just the raw JSON string.
Sentence: ${originalSentence}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.2
            }
        });

        const rawText = response.text;
        if (!rawText) throw new Error("Empty response from AI");
        
        let analysisData;
        try {
            // Strip out markdown if Gemini occasionally wraps it
            let cleanJson = rawText.trim();
            if (cleanJson.startsWith('```json')) {
                cleanJson = cleanJson.replace(/```json/g, '').replace(/```/g, '').trim();
            }
            analysisData = JSON.parse(cleanJson);
        } catch (parseError) {
            console.error('Failed to parse Gemini output:', rawText);
            res.status(500).json({ error: 'AI failed to construct a valid response. Try again.' });
            return;
        }

        // Fill out standard object
        const resultCard = {
            userId: user.userId,
            originalSentence,
            correctedSentence: analysisData.correctedSentence,
            improvedSentence: analysisData.improvedSentence,
            fluencyScore: analysisData.fluencyScore,
            shortTip: analysisData.shortTip,
            createdAt: new Date().toISOString()
        };

        // Save to Firestore
        const docRef = await firebaseFirestore.collection('softskills').add(resultCard);

        res.status(200).json({
            message: 'Analysis complete',
            analysis: {
                id: docRef.id,
                ...resultCard
            }
        });

    } catch (error) {
        console.error('Error analyzing sentence:', error);
        res.status(500).json({ error: 'Failed to analyze sentence' });
    }
};

export const getHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        
        const snapshot = await firebaseFirestore
            .collection('softskills')
            .where('userId', '==', user.userId)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        const history = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json({ history });
    } catch (error) {
        console.error('Error fetching soft skills history:', error);
        res.status(500).json({ error: 'Failed to fetch history.' });
    }
};

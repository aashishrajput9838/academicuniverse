import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { firebaseFirestore } from '../config/firebaseAdmin';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const improveSentence = async (req: Request, res: Response): Promise<void> => {
    try {
        const { originalSentence, practiceMode = 'General Practice', topic } = req.body;
        const user = (req as any).user;

        if (!originalSentence) {
            res.status(400).json({ message: 'Sentence or response text is required' });
            return;
        }

        const prompt = `You are a world-class AI Communication Coach specializing in placement preparation, interviews, public speaking, group discussions, and professional executive communication.

Analyze the given student response for grammar, vocabulary, fluency, confidence, professional tone, and clarity.
The selected practice mode is: "${practiceMode}". ${topic ? `The topic/prompt is: "${topic}".` : ''}

Return EXACTLY a valid JSON object with the following keys and schema:
{
  "overallScore": number (0-100 integer),
  "grammarScore": number (0-100 integer),
  "vocabularyScore": number (0-100 integer),
  "fluencyScore": number (1-10 scale integer, where 10 is native/flawless),
  "confidenceScore": number (0-100 integer),
  "professionalToneScore": number (0-100 integer),
  "clarityScore": number (0-100 integer),
  "correctedSentence": string (Grammatically correct version),
  "grammarMistakes": string[] (List of specific grammar errors found, or empty array if none),
  "improvedSentence": string (More eloquent and natural student version),
  "professionalVersion": string (High-impact executive placement-ready version),
  "vocabularySuggestions": Array of { "original": string, "suggested": string, "reason": string },
  "speakingTips": string[] (2-3 concrete tips for pace, articulation, or filler words),
  "confidenceTips": string[] (2-3 tips for body language, assertive tone, or eliminating hesitation),
  "practiceRecommendation": string (One recommended follow-up exercise for the student),
  "aiRecommendations": string[] (3 actionable dynamic suggestions to improve score next time),
  "shortTip": string (One punchy key takeaway)
}

Do not return Markdown code blocks. Return ONLY raw JSON string.
Student Response: ${originalSentence}`;

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
            let cleanJson = rawText.trim();
            if (cleanJson.startsWith('```json')) {
                cleanJson = cleanJson.replace(/```json/gi, '').replace(/```/g, '').trim();
            } else if (cleanJson.startsWith('```')) {
                cleanJson = cleanJson.replace(/```/g, '').trim();
            }
            analysisData = JSON.parse(cleanJson);
        } catch (parseError) {
            console.error('Failed to parse Gemini output:', rawText);
            res.status(500).json({ message: 'AI failed to construct a valid response. Try again.' });
            return;
        }

        // Fill out standard object with defaults if any field is missing
        const overallScore = analysisData.overallScore ?? Math.min(100, Math.round(((analysisData.fluencyScore || 7) * 10)));
        const fluencyScoreTen = analysisData.fluencyScore ?? Math.round(overallScore / 10);

        const resultCard = {
            userId: user.userId || user.uid,
            originalSentence,
            practiceMode: practiceMode || 'General Practice',
            topic: topic || null,
            overallScore,
            grammarScore: analysisData.grammarScore ?? 80,
            vocabularyScore: analysisData.vocabularyScore ?? 78,
            fluencyScore: fluencyScoreTen,
            confidenceScore: analysisData.confidenceScore ?? 82,
            professionalToneScore: analysisData.professionalToneScore ?? 80,
            clarityScore: analysisData.clarityScore ?? 85,
            correctedSentence: analysisData.correctedSentence || originalSentence,
            grammarMistakes: analysisData.grammarMistakes || [],
            improvedSentence: analysisData.improvedSentence || originalSentence,
            professionalVersion: analysisData.professionalVersion || analysisData.improvedSentence || originalSentence,
            vocabularySuggestions: analysisData.vocabularySuggestions || [],
            speakingTips: analysisData.speakingTips || [],
            confidenceTips: analysisData.confidenceTips || [],
            practiceRecommendation: analysisData.practiceRecommendation || "Practice speaking clearly at a steady pace.",
            aiRecommendations: analysisData.aiRecommendations || [
                "Practice speaking at 130-150 words per minute",
                "Use strong active verbs in your responses",
                "Structure your answers with the STAR method"
            ],
            shortTip: analysisData.shortTip || "Focus on assertive tone and clear articulation.",
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

    } catch (error: any) {
        console.error('Error analyzing sentence:', error);
        res.status(500).json({ message: error.message || 'Failed to analyze sentence' });
    }
};

export const getHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        const userId = user.userId || user.uid;
        
        const snapshot = await firebaseFirestore
            .collection('softskills')
            .where('userId', '==', userId)
            .limit(50)
            .get();

        const history = snapshot.docs.map((doc: any) => {
            const data = doc.data();
            const fluency = data.fluencyScore || 7;
            const normalizedOverall = data.overallScore ?? (fluency > 10 ? fluency : fluency * 10);
            
            return {
                id: doc.id,
                ...data,
                practiceMode: data.practiceMode || 'General Practice',
                overallScore: normalizedOverall,
                grammarScore: data.grammarScore ?? normalizedOverall,
                vocabularyScore: data.vocabularyScore ?? normalizedOverall,
                fluencyScore: fluency > 10 ? Math.round(fluency / 10) : fluency,
                confidenceScore: data.confidenceScore ?? normalizedOverall,
                professionalToneScore: data.professionalToneScore ?? normalizedOverall,
                clarityScore: data.clarityScore ?? normalizedOverall,
                grammarMistakes: data.grammarMistakes || [],
                vocabularySuggestions: data.vocabularySuggestions || [],
                speakingTips: data.speakingTips || [],
                confidenceTips: data.confidenceTips || [],
                aiRecommendations: data.aiRecommendations || [
                    "Speak at a measured, confident pace",
                    "Eliminate filler words ('um', 'uh')",
                    "Use active, impact-oriented language"
                ]
            };
        }).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        res.status(200).json({ history });
    } catch (error: any) {
        console.error('Error fetching soft skills history:', error);
        res.status(500).json({ message: error.message || 'Failed to fetch history' });
    }
};

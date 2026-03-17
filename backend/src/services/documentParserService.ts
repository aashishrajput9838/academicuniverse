import { GoogleGenAI } from '@google/genai';

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

/**
 * Reusable service to parse structured data out of messy PDFs or Images using Gemini 2.5 Flash.
 * 
 * @param mimeType The mime type of the file (e.g., 'image/png', 'application/pdf')
 * @param base64Data The raw base64 encoded string of the file
 * @param prompt Focuses the AI on what data to extract and structured format to return
 * @returns Parsed JSON Object
 */
export const parseDocumentData = async (mimeType: string, base64Data: string, prompt: string): Promise<any> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                prompt,
                {
                    inlineData: {
                        mimeType,
                        data: base64Data
                    }
                }
            ],
            config: {
                temperature: 0.1, // Keep it deterministic for JSON parsing
            }
        });

        const rawText = response.text;
        if (!rawText) throw new Error("Empty response from Vision model");
        
        return parseGeminiJson(rawText);
    } catch (error: any) {
        console.error("AI Parser Service Error:", error);
        throw new Error(`Failed to parse document: ${error.message}`);
    }
};

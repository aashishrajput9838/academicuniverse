import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '.env') });

async function test() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("GEMINI_API_KEY missing");
        return;
    }

    const ai = new GoogleGenAI({ apiKey });

    // Dummy small image 1x1 png base64
    const base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    const mimeType = "image/png";
    const promptText = "Explain this image clearly.";

    try {
        console.log("Sending to Gemini...");
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { inlineData: { data: base64Image, mimeType: mimeType } },
                        { text: promptText }
                    ]
                }
            ],
            config: {
                systemInstruction: "You are a helpful assistant.",
            }
        });

        console.log("Response text:", response.text);
        console.log("Raw object candidates:", JSON.stringify(response.candidates, null, 2));

    } catch (e: any) {
        console.error("Error thrown:", e.message);
        console.error("Full error:", e);
    }
}

test();

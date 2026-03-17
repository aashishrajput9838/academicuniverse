import { Request, Response } from 'express';
import { parseDocumentData } from '../services/documentParserService';
import { firebaseFirestore } from '../config/firebaseAdmin';

const PROMPT = `You are a strict data parser. Convert the provided image/PDF of a mess or cafeteria menu into exactly this structured JSON format.

Rules:
1. Extract days: monday to sunday
2. Extract meals: breakfast, lunch, snacks, dinner
3. Return the exact food items for each meal. If a meal or day is missing entirely, use "Not Available" for the missing string fields.
4. You must return EXACTLY and ONLY a valid JSON object matching this schema. Do not return markdown, do not include any other text.

Example Output Schema:
{
    "monday": {
        "breakfast": "Poha, Tea",
        "lunch": "Rajma Chawal",
        "snacks": "Samosa",
        "dinner": "Dal Makhani, Roti"
    },
    "tuesday": { ... }
}`;

export const extractMenu = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ message: "No file uploaded" });
            return;
        }

        const mimeType = req.file.mimetype;
        const fileBuffer = req.file.buffer;
        
        // Convert to base64 for Gemini multimodal API
        const base64Data = fileBuffer.toString('base64');

        // Note: For PDFs, Gemini handles application/pdf directly.
        // For images (image/jpeg, image/png), it handles them natively as well.
        if (!['application/pdf', 'image/jpeg', 'image/png'].includes(mimeType)) {
            res.status(400).json({ message: "Invalid file type. Only PDF, JPG, and PNG are supported." });
            return;
        }

        const parsedData = await parseDocumentData(mimeType, base64Data, PROMPT);

        // Pre-fill a week start date for the preview component
        const today = new Date();
        const monday = new Date(today.setDate(today.getDate() - today.getDay() + 1));
        const formattedMonday = monday.toISOString().split('T')[0];

        res.status(200).json({ 
            weekStartDate: formattedMonday,
            menuData: parsedData 
        });

    } catch (error: any) {
        console.error("Extraction error:", error);
        res.status(500).json({ message: error.message || "Failed to extract mess menu from document" });
    }
};

export const saveMenu = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        const { weekStartDate, menuData } = req.body;

        if (!weekStartDate || !menuData) {
            res.status(400).json({ message: "weekStartDate and menuData are required" });
            return;
        }

        // We use the weekStartDate and userId as a unique combination (or allow overrides)
        // Store in Firestore
        const docRef = await firebaseFirestore.collection('mess_menu').add({
            weekStartDate,
            ...menuData,
            uploadedBy: user.userId,
            createdAt: new Date().toISOString()
        });

        res.status(200).json({ message: "Menu published successfully", id: docRef.id });
    } catch (error: any) {
        console.error("Save menu error:", error);
        res.status(500).json({ message: error.message || "Failed to publish mess menu" });
    }
};

export const getCurrentMenu = async (req: Request, res: Response): Promise<void> => {
    try {
        // Find the most recently uploaded menu
        // In a real prod scale, you'd match the weekStartDate with the current week
        const snapshot = await firebaseFirestore
            .collection('mess_menu')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

        if (snapshot.empty) {
            res.status(404).json({ message: "No mess menu available currently" });
            return;
        }

        const latestMenu = snapshot.docs[0].data();
        res.status(200).json({ menu: latestMenu });
    } catch (error: any) {
        console.error("Get current menu error:", error);
        res.status(500).json({ message: error.message || "Failed to retrieve current mess menu" });
    }
};

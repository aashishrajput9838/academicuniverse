import { Response } from 'express';
import { sendResponse, sendError } from '../utils/response';
import { firebaseFirestore } from '../config/firebaseAdmin';
import aiService from '../services/aiService';
import { Logger } from '../utils/logger';
import Section from '../models/Section';
import Timetable from '../models/Timetable';

const logger = new Logger('aiController');

export const getStudentContext = async (userId: string) => {
    let context: any = {
        todayClasses: 0,
        freeSlots: [],
        todaySchedule: [],
        day: new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' }),
        currentTime: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' }),
        totalWeeklyClasses: 0
    };

    try {
        const section = await Section.findOne({
            $or: [
                { representativeId: userId },
            ]
        });

        if (section) {
            const timetable = await Timetable.findOne({ sectionId: section._id });
            if (timetable && timetable.parsedData) {
                const today = context.day;
                const todaySchedule = timetable.parsedData.filter(slot => slot.dayOfWeek === today);

                context.todayClasses = todaySchedule.filter(s => !s.isFreeSlot).length;
                context.totalWeeklyClasses = timetable.parsedData.filter(s => !s.isFreeSlot).length;
                context.freeSlots = todaySchedule.filter(s => s.isFreeSlot).map(s => `${s.startTime}-${s.endTime}`);
                context.todaySchedule = todaySchedule.map(s => ({
                    subject: s.subject,
                    startTime: s.startTime,
                    endTime: s.endTime,
                    isFreeSlot: s.isFreeSlot
                }));

                if (context.todayClasses === 0 && (today === 'Saturday' || today === 'Sunday')) {
                    const mondaySchedule = timetable.parsedData.filter(slot => slot.dayOfWeek === 'Monday');
                    context.mondayPreview = {
                        classes: mondaySchedule.filter(s => !s.isFreeSlot).length,
                        subjects: Array.from(new Set(mondaySchedule.filter(s => !s.isFreeSlot).map(s => s.subject)))
                    };
                }
            }
        }
    } catch (err) {
        logger.error('Error fetching student context for AI:', err);
    }
    return context;
};

export const processAIChat = async (req: any, res: Response) => {
    try {
        const { message, mood } = req.body;
        const userId = req.user.userId;
        const organizationId = req.organizationId;
        const firebaseUid = req.user.firebaseUid;

        if (!message || !mood) {
            return sendError(res, 400, 'Message and mood are required');
        }

        // 1. Fetch Academic Context
        const academicContext = await getStudentContext(userId);

        // 2. Log Mood in Firestore
        if (firebaseUid) {
            try {
                await firebaseFirestore.collection('moodLogs').add({
                    uid: firebaseUid,
                    mood: mood,
                    timestamp: new Date().toISOString()
                });
            } catch (err) {
                logger.error('Error logging mood to Firestore:', err);
            }
        }

        // 3. Generate AI Response
        // We fetch a bit of history from Firestore if available
        let history: any[] = [];
        try {
            const chatDoc = await firebaseFirestore.collection('aiChats').doc(firebaseUid).get();
            if (chatDoc.exists) {
                history = chatDoc.data()?.messages || [];
            }
        } catch (err) {
            logger.error('Error fetching chat history:', err);
        }

        const aiReply = await aiService.generateSupportResponse(message, mood, academicContext, history);

        // 4. Save Conversation in Firestore
        if (firebaseUid) {
            try {
                const chatRef = firebaseFirestore.collection('aiChats').doc(firebaseUid);
                const newMessagePair = [
                    { role: 'user', content: message, timestamp: new Date().toISOString() },
                    { role: 'assistant', content: aiReply, timestamp: new Date().toISOString() }
                ];

                if (history.length === 0) {
                    await chatRef.set({
                        uid: firebaseUid,
                        messages: newMessagePair,
                        lastUpdated: new Date().toISOString()
                    });
                } else {
                    // In a real app we might want to use arrayUnion, but for demo we limit size
                    const updatedMessages = [...history, ...newMessagePair].slice(-20); // Keep last 20
                    await chatRef.update({
                        messages: updatedMessages,
                        lastUpdated: new Date().toISOString()
                    });
                }
            } catch (err) {
                logger.error('Error saving chat to Firestore:', err);
            }
        }

        return sendResponse(res, 200, { reply: aiReply }, 'AI response generated successfully');
    } catch (error: any) {
        logger.error('AI Chat Error:', error);
        return sendError(res, 500, `Failed to process AI chat: ${error.message} \n ${error.stack}`);
    }
};

export const processImageChat = async (req: any, res: Response) => {
    try {
        const { message } = req.body;
        const file = req.file;
        const firebaseUid = req.user?.firebaseUid;
        const userId = req.user?.userId;

        if (!file) {
            return sendError(res, 400, 'Image file is required');
        }

        const fileBase64 = file.buffer.toString('base64');
        const mimeType = file.mimetype;

        let history: any[] = [];
        if (firebaseUid) {
            try {
                const chatDoc = await firebaseFirestore.collection('aiChats').doc(firebaseUid).get();
                if (chatDoc.exists) {
                    history = chatDoc.data()?.messages || [];
                }
            } catch (err) {
                logger.error('Error fetching chat history:', err);
            }
        }

        const academicContext = userId ? await getStudentContext(userId) : null;
        const aiReply = await aiService.analyzeImage(message || 'Analyze this image.', fileBase64, mimeType, academicContext, history);

        if (firebaseUid) {
            try {
                const chatRef = firebaseFirestore.collection('aiChats').doc(firebaseUid);
                const userText = message ? `[Sent Image]: ${message}` : '[Sent Image]';
                const newMessagePair = [
                    { role: 'user', content: userText, timestamp: new Date().toISOString() },
                    { role: 'assistant', content: aiReply, timestamp: new Date().toISOString() }
                ];

                if (history.length === 0) {
                    await chatRef.set({
                        uid: firebaseUid,
                        messages: newMessagePair,
                        lastUpdated: new Date().toISOString()
                    });
                } else {
                    const updatedMessages = [...history, ...newMessagePair].slice(-20);
                    await chatRef.update({
                        messages: updatedMessages,
                        lastUpdated: new Date().toISOString()
                    });
                }
            } catch (err) {
                logger.error('Error saving chat to Firestore:', err);
            }
        }

        return sendResponse(res, 200, { reply: aiReply }, 'Image processed successfully');
    } catch (error: any) {
        logger.error('AI Image Chat Error:', error);
        return sendError(res, 500, `Failed to process image: ${error.message} \n ${error.stack}`);
    }
};

export const getChatHistory = async (req: any, res: Response) => {
    try {
        const firebaseUid = req.user?.firebaseUid;
        if (!firebaseUid) {
            return sendResponse(res, 200, { history: [] }, 'No history available');
        }

        const chatDoc = await firebaseFirestore.collection('aiChats').doc(firebaseUid).get();
        if (!chatDoc.exists) {
            return sendResponse(res, 200, { history: [] }, 'No chat history found');
        }

        const history = chatDoc.data()?.messages || [];
        return sendResponse(res, 200, { history }, 'Chat history retrieved');
    } catch (error: any) {
        logger.error('Error fetching chat history:', error);
        return sendError(res, 500, 'Failed to fetch chat history');
    }
};

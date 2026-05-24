import admin from 'firebase-admin';
import { firebaseFirestore } from '../../../config/firebaseAdmin';
import { Logger } from '../../../shared/utils';

const logger = new Logger('EzoneLogger');

export type EzoneLogType = 'info' | 'success' | 'warning' | 'error';

export class EzoneLogger {
    private static instance: EzoneLogger;

    private constructor() {}

    public static getInstance(): EzoneLogger {
        if (!EzoneLogger.instance) {
            EzoneLogger.instance = new EzoneLogger();
        }
        return EzoneLogger.instance;
    }

    /**
     * Log a step in the Ezone sync process to Firestore for real-time frontend tracking
     */
    async logSyncStep(userId: string, type: EzoneLogType, message: string, data?: any): Promise<void> {
        try {
            // Log to standard winston/console logger first
            switch (type) {
                case 'success': logger.info(`[✓] ${message}`, data); break;
                case 'warning': logger.warn(`[!] ${message}`, data); break;
                case 'error': logger.error(`[✗] ${message}`, data); break;
                default: logger.info(`[-] ${message}`, data); break;
            }

            if (!firebaseFirestore) {
                return;
            }

            // Push to Firestore for real-time UI updates
            // We use a subcollection under user_logs/ezone_sync/[userId]/steps
            const logRef = firebaseFirestore
                .collection('ezone_sync_logs')
                .doc(userId);

            // We use arrayUnion to keep an ordered list of steps for the current session
            // or just update a status field. For a terminal feel, we'll append to an array.
            await logRef.set({
                lastUpdate: new Date(),
                steps: admin.firestore.FieldValue.arrayUnion({
                    type,
                    message,
                    timestamp: new Date().toISOString(),
                    id: Math.random().toString(36).substring(7)
                })
            }, { merge: true });

        } catch (error) {
            // Fail silently for logs to not interrupt main flow
            console.error('Failed to emit realtime ezone log:', error);
        }
    }

    /**
     * Clear logs for a new session
     */
    async clearLogs(userId: string): Promise<void> {
        if (!firebaseFirestore) return;
        try {
            await firebaseFirestore.collection('ezone_sync_logs').doc(userId).delete();
        } catch (error) {
            console.error('Failed to clear ezone logs:', error);
        }
    }
}

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
     * Uses structure: ezoneLogs/{sessionId}/entries/{logId}
     */
    async logSyncStep(
        userId: string, 
        organizationId: string, 
        sessionId: string, 
        type: EzoneLogType, 
        message: string, 
        data?: any,
        firebaseUid?: string
    ): Promise<void> {
        try {
            // Log to standard winston/console logger first
            const logMsg = `[${sessionId}] ${message}`;
            switch (type) {
                case 'success': logger.info(`[✓] ${logMsg}`, data); break;
                case 'warning': logger.warn(`[!] ${logMsg}`, data); break;
                case 'error': logger.error(`[✗] ${logMsg}`, data); break;
                default: logger.info(`[-] ${logMsg}`, data); break;
            }

            if (!firebaseFirestore) {
                return;
            }

            // Push to Firestore for real-time UI updates
            // Structured for security rules: ezoneLogs/{sessionId}/entries/{logId}
            await firebaseFirestore
                .collection('ezoneLogs')
                .doc(sessionId)
                .collection('entries')
                .add({
                    organizationId,
                    userId,
                    firebaseUid: firebaseUid || null,
                    sessionId,
                    type,
                    message,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    metadata: data || null
                });

        } catch (error) {
            // Fail silently for logs to not interrupt main flow
            console.error('Failed to emit realtime ezone log:', error);
        }
    }

    /**
     * Clear logs for a session
     */
    async clearLogs(sessionId: string): Promise<void> {
        if (!firebaseFirestore) return;
        try {
            const entries = await firebaseFirestore
                .collection('ezoneLogs')
                .doc(sessionId)
                .collection('entries')
                .get();
            
            const batch = firebaseFirestore.batch();
            entries.forEach((doc: admin.firestore.QueryDocumentSnapshot) => batch.delete(doc.ref));
            batch.delete(firebaseFirestore.collection('ezoneLogs').doc(sessionId));
            await batch.commit();
        } catch (error) {
            console.error('Failed to clear ezone logs:', error);
        }
    }
}

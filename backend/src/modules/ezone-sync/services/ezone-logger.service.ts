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
     * Uses session-scoped structure: ezoneSyncSessions/{sessionId}/logs/{logId}
     * This collection is publicly readable (read: if true) to avoid dual-auth complexity.
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

            // Calculate expiration (1 hour from now)
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 1);

            // Push to Firestore for real-time UI updates
            // Structured for public read by sessionId: ezoneSyncSessions/{sessionId}/logs/{logId}
            await firebaseFirestore
                .collection('ezoneSyncSessions')
                .doc(sessionId)
                .collection('logs')
                .add({
                    organizationId,
                    userId,
                    firebaseUid: firebaseUid || null,
                    sessionId,
                    type,
                    message,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
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
            const logs = await firebaseFirestore
                .collection('ezoneSyncSessions')
                .doc(sessionId)
                .collection('logs')
                .get();
            
            const batch = firebaseFirestore.batch();
            logs.forEach((doc: admin.firestore.QueryDocumentSnapshot) => batch.delete(doc.ref));
            batch.delete(firebaseFirestore.collection('ezoneSyncSessions').doc(sessionId));
            await batch.commit();
        } catch (error) {
            console.error('Failed to clear ezone logs:', error);
        }
    }
}

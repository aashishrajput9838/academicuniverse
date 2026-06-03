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
            const logMsg = `[${sessionId}] ${message}`;
            switch (type) {
                case 'success': logger.info(`[✓] ${logMsg}`, data); break;
                case 'warning': logger.warn(`[!] ${logMsg}`, data); break;
                case 'error': logger.error(`[✗] ${logMsg}`, data); break;
                default: logger.info(`[-] ${logMsg}`, data); break;
            }

            if (!firebaseFirestore) return;

            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 1);

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
            console.error('Failed to emit realtime ezone log:', error);
        }
    }

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

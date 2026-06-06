import admin from 'firebase-admin';
import { firebaseFirestore } from '../../../config/firebaseAdmin';
import { Logger } from '../../../shared/utils';

const logger = new Logger('EzoneLogger');

export type EzoneLogType = 'info' | 'success' | 'warning' | 'error' | 'action';
export type EzoneLogCategory = 'AUTHENTICATION' | 'DISCOVERY' | 'EXTRACTION' | 'DATABASE' | 'GENERAL' | 'AUTH' | 'VALIDATION' | 'SHEETS';

export interface EzoneLogMetadata {
    category?: EzoneLogCategory;
    step?: number;
    progress?: number;
    routesDiscovered?: number;
    apisFound?: number;
    actionType?: string;
    status?: 'pending' | 'completed' | 'failed';
    [key: string]: any;
}

export class EzoneLogger {
    private static instance: EzoneLogger;
    private stepCounters: Map<string, number> = new Map();

    private constructor() {}

    public static getInstance(): EzoneLogger {
        if (!EzoneLogger.instance) {
            EzoneLogger.instance = new EzoneLogger();
        }
        return EzoneLogger.instance;
    }

    private getNextStep(sessionId: string): number {
        const current = this.stepCounters.get(sessionId) || 0;
        const next = current + 1;
        this.stepCounters.set(sessionId, next);
        return next;
    }

    async logSyncStep(
        userId: string, 
        organizationId: string, 
        sessionId: string, 
        type: EzoneLogType, 
        message: string, 
        metadata?: EzoneLogMetadata,
        firebaseUid?: string
    ): Promise<void> {
        try {
            const step = metadata?.step || this.getNextStep(sessionId);
            const category = metadata?.category || 'GENERAL';
            
            const logMsg = `[${sessionId}] [${category}] [STEP ${step}] ${message}`;
            
            switch (type) {
                case 'success': logger.info(`[✓] ${logMsg}`, metadata); break;
                case 'warning': logger.warn(`[!] ${logMsg}`, metadata); break;
                case 'error': logger.error(`[✗] ${logMsg}`, metadata); break;
                case 'action': logger.info(`[▶] ${logMsg}`, metadata); break;
                default: logger.info(`[-] ${logMsg}`, metadata); break;
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
                    category,
                    step,
                    message,
                    metadata: metadata || null,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
                    timestamp: new Date().toISOString()
                });

            // Update session-level summary for progress tracking
            if (metadata?.progress || metadata?.routesDiscovered || metadata?.apisFound) {
                await firebaseFirestore
                    .collection('ezoneSyncSessions')
                    .doc(sessionId)
                    .set({
                        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                        currentCategory: category,
                        currentProgress: metadata.progress || 0,
                        routesDiscovered: metadata.routesDiscovered || 0,
                        apisFound: metadata.apisFound || 0
                    }, { merge: true });
            }

        } catch (error) {
            console.error('Failed to emit realtime ezone log:', error);
        }
    }

    async clearLogs(sessionId: string): Promise<void> {
        this.stepCounters.delete(sessionId);
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

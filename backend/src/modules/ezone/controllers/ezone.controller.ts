import { Request, Response } from 'express';
import { EzoneSyncService } from '../services/ezoneSyncService';
import { Logger } from '../../../shared/utils';

const logger = new Logger('EzoneController');

export class EzoneController {
    constructor(private ezoneService: EzoneSyncService) {}

    /**
     * POST /api/ezone/send-otp
     */
    sendOtp = async (req: Request, res: Response): Promise<void> => {
        try {
            let { systemId } = req.body;
            const { userId, organizationId, firebaseUid } = (req as any).user;

            if (!systemId) {
                res.status(400).json({ success: false, message: 'System ID is required' });
                return;
            }

            systemId = String(systemId).trim();
            const sessionId = await this.ezoneService.requestOtp(systemId, userId, organizationId, firebaseUid);

            res.status(200).json({ 
                success: true, 
                sessionId,
                message: 'OTP request initiated. Please check your student email.' 
            });
        } catch (error: any) {
            logger.error('Controller error in sendOtp:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    };

    /**
     * POST /api/ezone/verify-otp
     */
    verifyOtp = async (req: Request, res: Response): Promise<void> => {
        try {
            let { systemId, otp, sessionId } = req.body;
            const { userId, organizationId, firebaseUid, email, name } = (req as any).user;

            if (!systemId || !otp || !sessionId) {
                res.status(400).json({ success: false, message: 'System ID, OTP, and Session ID are required' });
                return;
            }

            systemId = String(systemId).trim();
            const profile = await this.ezoneService.verifyAndSync(sessionId, systemId, otp, userId, organizationId, firebaseUid, email, name);
            
            res.status(200).json({ success: true, data: profile });
        } catch (error: any) {
            logger.error('Controller error in verifyOtp:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    };

    /**
     * GET /api/ezone/profile
     */
    getProfile = async (req: Request, res: Response): Promise<void> => {
        try {
            const authHeader = req.headers.authorization;
            const user = (req as any).user;
            const { userId, organizationId, email } = user || {};

            logger.info(`[TRACE-GET-PROFILE] Authorization Header: ${authHeader ? 'RECEIVED (Bearer Token)' : 'NONE'}`);
            logger.info(`[TRACE-GET-PROFILE] Authenticated req.user: ${JSON.stringify(user)}`);
            logger.info(`[TRACE-GET-PROFILE] Target userId: ${userId} | organizationId: ${organizationId} | email: ${email}`);

            const profile = await this.ezoneService.getProfile(userId, organizationId);

            if (!profile) {
                logger.warn(`[TRACE-GET-PROFILE] No profile found for userId: ${userId}`);
                res.status(404).json({ 
                    success: false, 
                    message: 'Connect your Ezone account to load academic data.' 
                });
                return;
            }

            logger.info(`[TRACE-GET-PROFILE] Successfully retrieved profile for userId: ${userId} | Student Name: ${profile.studentName}`);
            res.status(200).json({ success: true, data: profile });
        } catch (error: any) {
            logger.error('Controller error in getProfile:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    };
}

import { Request, Response } from 'express';
import { EzoneService } from '../services/ezone.service';
import { Logger } from '../../../shared/utils';

const logger = new Logger('EzoneController');

export class EzoneController {
    constructor(private ezoneService: EzoneService) {}

    sendOtp = async (req: Request, res: Response): Promise<void> => {
        try {
            let { systemId } = req.body;
            const { userId, organizationId, firebaseUid } = (req as any).user;

            if (!systemId) {
                res.status(400).json({ success: false, message: 'System ID is required' });
                return;
            }

            // Standardize systemId
            systemId = String(systemId).trim();

            // Execute OTP trigger
            const sessionId = await this.ezoneService.requestOtp(systemId, userId, organizationId, firebaseUid);

            // Return immediately to the frontend with the sessionId
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

    verifyOtp = async (req: Request, res: Response): Promise<void> => {
        try {
            let { systemId, otp, sessionId } = req.body;
            const { userId, organizationId, firebaseUid } = (req as any).user;

            if (!systemId || !otp || !sessionId) {
                res.status(400).json({ success: false, message: 'System ID, OTP, and Session ID are required' });
                return;
            }

            // Standardize systemId
            systemId = String(systemId).trim();

            const profile = await this.ezoneService.verifyAndSync(sessionId, systemId, otp, userId, organizationId, firebaseUid);
            res.status(200).json({ success: true, data: profile });
        } catch (error: any) {
            logger.error('Controller error in verifyOtp:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    };

    getProfile = async (req: Request, res: Response): Promise<void> => {
        try {
            const { userId, organizationId } = (req as any).user;
            const profile = await this.ezoneService.getProfile(userId, organizationId);

            if (!profile) {
                res.status(200).json({ 
                    success: false, 
                    requiresConnection: true, 
                    message: 'Ezone account not connected' 
                });
                return;
            }

            res.status(200).json({ success: true, data: profile });
        } catch (error: any) {
            logger.error('Controller error in getProfile:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    };
}

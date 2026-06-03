import { Request, Response } from 'express';
import { EzoneService } from '../services/ezone.service';
import { Logger } from '../../../shared/utils';

const logger = new Logger('EzoneController');

export class EzoneController {
    constructor(private ezoneService: EzoneService) {}

    sendOtp = async (req: Request, res: Response): Promise<void> => {
        try {
            const { systemId } = req.body;
            const { userId, organizationId, firebaseUid } = (req as any).user;

            if (!systemId) {
                res.status(400).json({ success: false, message: 'System ID is required' });
                return;
            }

            // Start the OTP request in the background to avoid timeouts on platforms like Render
            // We don't await this call
            this.ezoneService.requestOtp(systemId, userId, organizationId, firebaseUid).catch(error => {
                logger.error('Background error in sendOtp:', error);
            });

            // Return immediately to the frontend
            res.status(202).json({ 
                success: true, 
                message: 'OTP request initiated. Please follow the progress in the logs below.' 
            });
        } catch (error: any) {
            logger.error('Controller error in sendOtp:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    };

    verifyOtp = async (req: Request, res: Response): Promise<void> => {
        try {
            const { systemId, otp } = req.body;
            const { userId, organizationId, firebaseUid } = (req as any).user;

            if (!systemId || !otp) {
                res.status(400).json({ success: false, message: 'System ID and OTP are required' });
                return;
            }

            const profile = await this.ezoneService.verifyAndSync(systemId, otp, userId, organizationId, firebaseUid);
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

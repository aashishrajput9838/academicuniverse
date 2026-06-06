import { Router } from 'express';
import { EzoneController } from '../controllers/ezone.controller';
import { EzoneSyncService } from '../services/ezoneSyncService';
import { EzoneRepository } from '../repositories/ezone.repository';
import { EzoneScraper } from '../scrapers/ezone.scraper';
import { EzoneSessionProvider } from '../providers/ezone-session.provider';
import { authenticateUser } from '../../../shared/middleware';

const router = Router();

// Dependency Injection
const sessionProvider = EzoneSessionProvider.getInstance();
const repository = new EzoneRepository();
const scraper = new EzoneScraper();
const service = new EzoneSyncService(sessionProvider, repository, scraper);
const controller = new EzoneController(service);

/**
 * @route POST /api/ezone/send-otp
 */
router.post('/send-otp', authenticateUser, controller.sendOtp);

/**
 * @route POST /api/ezone/verify-otp
 */
router.post('/verify-otp', authenticateUser, controller.verifyOtp);

/**
 * @route GET /api/ezone/profile
 */
router.get('/profile', authenticateUser, controller.getProfile);

export default router;
export { service as ezoneService };

import { Router } from 'express';
import { EzoneController } from '../controllers/ezone.controller';
import { EzoneService } from '../services/ezone.service';
import { EzoneRepository } from '../repositories/ezone.repository';
import { EzoneSessionProvider } from '../providers/ezone-session.provider';
import { ProfileScraper } from '../scrapers/profile.scraper';
import { AttendanceScraper } from '../scrapers/attendance.scraper';
import { authenticateUser } from '../../../shared/middleware';

const router = Router();

// Dependency Injection
const sessionProvider = EzoneSessionProvider.getInstance();
const repository = new EzoneRepository();
const profileScraper = new ProfileScraper();
const attendanceScraper = new AttendanceScraper();
const service = new EzoneService(sessionProvider, repository, profileScraper, attendanceScraper);
const controller = new EzoneController(service);

// Routes
router.post('/send-otp', authenticateUser, controller.sendOtp);
router.post('/verify-otp', authenticateUser, controller.verifyOtp);
router.get('/profile', authenticateUser, controller.getProfile);

export default router;

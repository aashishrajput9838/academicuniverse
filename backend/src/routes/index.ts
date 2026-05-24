import express from 'express';
import authRoutes from './authRoutes';
import marksRoutes from './marksRoutes';
import githubRoutes from './githubRoutes';
import profileRoutes from './profileRoutes';
import overlapRoutes from './overlapRoutes';
import resumeRoutes from './resumeRoutes';

import timetableRoutes from './timetableRoutes';
import sectionRoutes from './sectionRoutes';
import usersRoutes from './usersRoutes';
import dashboardRoutes from './dashboardRoutes';
import aiRoutes from './aiRoutes';
import logRoutes from './logRoutes';
import gmailRoutes from './gmailRoutes';
import softSkillsRoutes from './softSkillsRoutes';
// import researchRoutes from './researchRoutes'; // Old - using modular version
import messRoutes from './messRoutes';
import exportRoutes from './exportRoutes';

// Import modular routes (new architecture)
import { researchRoutes } from '../modules/research';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/marks', marksRoutes);
router.use('/github', githubRoutes);
router.use('/profile', profileRoutes);
router.use('/overlap-engine', overlapRoutes);
router.use('/resume', resumeRoutes);
router.use('/timetable', timetableRoutes);
router.use('/sections', sectionRoutes);
router.use('/users', usersRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/ai', aiRoutes);
router.use('/logs', logRoutes);
router.use('/gmail', gmailRoutes);
router.use('/softskills', softSkillsRoutes);
router.use('/research', researchRoutes); // New modular route
router.use('/export', exportRoutes);

export default router;

import express from 'express';
import authRoutes from './authRoutes';
import marksRoutes from './marksRoutes';
import githubRoutes from './githubRoutes';
import profileRoutes from './profileRoutes';
import overlapRoutes from './overlapRoutes';
import timetableRoutes from './timetableRoutes';
import sectionRoutes from './sectionRoutes';
import usersRoutes from './usersRoutes';
import dashboardRoutes from './dashboardRoutes';
import aiRoutes from './aiRoutes';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/marks', marksRoutes);
router.use('/github', githubRoutes);
router.use('/profile', profileRoutes);
router.use('/overlap-engine', overlapRoutes);
router.use('/timetable', timetableRoutes);
router.use('/sections', sectionRoutes);
router.use('/users', usersRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/ai', aiRoutes);

export default router;

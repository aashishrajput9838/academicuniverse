import express from 'express';
import authRoutes from './authRoutes';
import marksRoutes from './marksRoutes';
import githubRoutes from './githubRoutes';
import profileRoutes from './profileRoutes';
import overlapRoutes from './overlapRoutes';
import timetableRoutes from './timetableRoutes';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/marks', marksRoutes);
router.use('/github', githubRoutes);
router.use('/profile', profileRoutes);
router.use('/overlap-engine', overlapRoutes);
router.use('/timetable', timetableRoutes);

export default router;

import express from 'express';
import authRoutes from './authRoutes';
import marksRoutes from './marksRoutes';
import debugRoutes from './debugRoutes';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/marks', marksRoutes);
router.use('/debug', debugRoutes);

export default router;

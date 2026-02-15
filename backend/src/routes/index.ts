import express from 'express';
import authRoutes from './authRoutes';
import marksRoutes from './marksRoutes';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/marks', marksRoutes);

export default router;

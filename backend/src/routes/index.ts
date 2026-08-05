import express from 'express';
import authRoutes from './authRoutes';
import marksRoutes from './marksRoutes';
import githubRoutes from './githubRoutes';
import profileRoutes from './profileRoutes';
import overlapRoutes from './overlapRoutes';
import resumeRoutes from './resumeRoutes';
import resumeParserRoutes from './resumeParserRoutes';

import timetableRoutes from './timetableRoutes';
import sectionRoutes from './sectionRoutes';
import usersRoutes from './usersRoutes';
import academicRecordRoutes from './academicRecordRoutes';
import academicScheduleRoutes from './academicScheduleRoutes';
import dashboardRoutes from './dashboardRoutes';
import aiRoutes from './aiRoutes';
import logRoutes from './logRoutes';
import gmailRoutes from './gmailRoutes';
import softSkillsRoutes from './softSkillsRoutes';
import documentRegistryRoutes from './documentRegistryRoutes';
import exportRoutes from './exportRoutes';
import growthRoutes from './growthRoutes';
import reviewRoutes from './reviewRoutes';
import documentIntelligenceRoutes from './documentIntelligenceRoutes';
import skillsRoutes from './skillsRoutes';
import codeArenaRoutes from './codeArenaRoutes';
import syntheticRoutes from './syntheticRoutes';
import uaipRoutes from './uaipRoutes';

import { researchRoutes } from '../modules/research';
import { ezoneRoutes } from '../modules/ezone';
import moduleHealthRoutes from './moduleHealthRoutes';
import resumeHealthRoutes from './resumeHealthRoutes';
import moduleVisibilityRoutes from './moduleVisibilityRoutes';
import { moduleGuard } from '../middleware/moduleVisibility.middleware';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/marks', marksRoutes);
router.use('/github', githubRoutes);
router.use('/profile', profileRoutes);
router.use('/resume', resumeRoutes);
router.use('/resume', resumeParserRoutes);
router.use('/timetable', timetableRoutes);
router.use('/academic-records', academicRecordRoutes);
router.use('/academic-schedule', academicScheduleRoutes);
router.use('/sections', sectionRoutes);
router.use('/users', usersRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/ai', aiRoutes);
router.use('/logs', logRoutes);
router.use('/gmail', gmailRoutes);
router.use('/softskills', softSkillsRoutes);
router.use('/research', researchRoutes);
router.use('/ezone', ezoneRoutes);
router.use('/growth', growthRoutes);
router.use('/document-registry', documentRegistryRoutes);
router.use('/skills', skillsRoutes);
router.use('/export', exportRoutes);
router.use('/review', reviewRoutes);
router.use('/document-intelligence', documentIntelligenceRoutes);
router.use('/module-health', moduleHealthRoutes);
router.use('/resume-health', resumeHealthRoutes);
router.use('/module-visibility', moduleVisibilityRoutes);
router.use('/synthetic', syntheticRoutes);
router.use('/uaip', uaipRoutes);

// Module-specific route guards (student-facing modules)
router.use('/overlap-engine', moduleGuard('overlap-engine'), overlapRoutes);
router.use('/growth', moduleGuard('growth-hub'), growthRoutes);
router.use('/softskills', moduleGuard('soft-skills-lab'), softSkillsRoutes);
router.use('/skills', moduleGuard('skills-tracker'), skillsRoutes);
router.use('/document-intelligence', moduleGuard('document-intelligence'), documentIntelligenceRoutes);
router.use('/code-arena', moduleGuard('code-arena'), codeArenaRoutes);

// Note: /resume routes serve both faculty (template management) and students (resume generation).
// Student endpoints should be guarded individually within resumeRoutes.ts using moduleGuard('resume-builder').

export default router;

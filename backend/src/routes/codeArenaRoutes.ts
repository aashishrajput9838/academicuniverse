import express from 'express';
import multer from 'multer';
import { authenticateUser, enforceOrgIsolation } from '../middleware/auth';
import { CodeArenaController } from '../modules/codeArena/codeArena.controller';

const router = express.Router();
const controller = new CodeArenaController();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
});

// Protected by JWT Auth & Organization isolation
router.use(authenticateUser);
router.use(enforceOrgIsolation);

// Dashboard & Stats
router.get('/dashboard/stats', controller.getDashboardStats);

// Arena Points & Economy APIs
router.get('/points/me', controller.getMyPointsProfile);
router.post('/points/claim-daily', controller.claimDailyReward);
router.get('/points/transactions', controller.getTransactions);
router.get('/leaderboard', controller.getLeaderboard);

// Issues Workflow
router.post('/issues', controller.createIssue);
router.get('/issues', controller.getIssues);
router.get('/issues/:id', controller.getIssueById);
router.put('/issues/:id', controller.updateIssue);
router.delete('/issues/:id', controller.cancelIssue);
router.post('/issues/:id/save', controller.toggleSaveIssue);

// Solutions Workflow
router.post('/solutions/:issueId', controller.submitSolution);
router.get('/solutions/:issueId', controller.getSolutionsForIssue);
router.put('/solutions/:solutionId/accept', controller.acceptSolution);

// GridFS Attachments
router.post('/attachments/upload', upload.single('file'), controller.uploadAttachment);
router.get('/attachments/:storageId', controller.streamAttachment);

export default router;

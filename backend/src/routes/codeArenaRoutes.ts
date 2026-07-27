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

// All routes require authentication & organization isolation
router.use(authenticateUser);
router.use(enforceOrgIsolation);

// Dashboard
router.get('/dashboard/stats', controller.getDashboardStats);

// Issues CRUD & Workflow
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

// Wallet & Transactions
router.get('/wallet/me', controller.getMyWallet);
router.get('/wallet/transactions', controller.getTransactions);
router.post('/wallet/deposit', controller.depositCredits);

// Developer Reputation Profile
router.get('/profile/me', controller.getMyReputation);
router.get('/profile/:userId', controller.getUserReputation);

// Attachments
router.post('/attachments/upload', upload.single('file'), controller.uploadAttachment);
router.get('/attachments/:storageId', controller.streamAttachment);

export default router;

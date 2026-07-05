import { Router } from 'express';
import { connectGmail, gmailCallback, disconnectGmailAccount, triggerGmailSync, getGmailStatus, getGmailStatsController, listGmailMessagesController, getGmailMessageController, markGmailMessageReadController } from '../controllers/gmailController';
import { authenticateUser } from '../middleware/auth';

const gmailRouter = Router();

// OAuth flow routes
gmailRouter.get('/connect', authenticateUser, connectGmail);

// The callback does NOT use authenticateFirebaseUser because it is a redirect from Google directly,
// carrying the userId via the `state` parameter
gmailRouter.get('/callback', gmailCallback);

// Management routes
gmailRouter.get('/status', authenticateUser, getGmailStatus);
gmailRouter.get('/stats', authenticateUser, getGmailStatsController);
gmailRouter.get('/messages', authenticateUser, listGmailMessagesController);
gmailRouter.get('/messages/:messageId', authenticateUser, getGmailMessageController);
gmailRouter.post('/messages/:messageId/read', authenticateUser, markGmailMessageReadController);
gmailRouter.delete('/disconnect', authenticateUser, disconnectGmailAccount);
gmailRouter.post('/sync', authenticateUser, triggerGmailSync);

export default gmailRouter;

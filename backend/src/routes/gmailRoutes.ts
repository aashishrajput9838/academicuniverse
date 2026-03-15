import { Router } from 'express';
import { connectGmail, gmailCallback, disconnectGmailAccount, triggerGmailSync } from '../controllers/gmailController';
import { authenticateFirebaseUser } from '../middleware/auth';

const gmailRouter = Router();

// OAuth flow routes
gmailRouter.get('/connect', authenticateFirebaseUser, connectGmail);

// The callback does NOT use authenticateFirebaseUser because it is a redirect from Google directly,
// carrying the userId via the `state` parameter
gmailRouter.get('/callback', gmailCallback);

// Management routes
gmailRouter.delete('/disconnect', authenticateFirebaseUser, disconnectGmailAccount);
gmailRouter.post('/sync', authenticateFirebaseUser, triggerGmailSync);

export default gmailRouter;

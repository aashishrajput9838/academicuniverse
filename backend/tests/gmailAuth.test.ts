import { connectGmail, gmailCallback } from '../src/controllers/gmailController';
import { getGmailAuthUrl, handleGmailCallback } from '../src/services/gmailAuthService';
import { syncGmailEvents } from '../src/services/gmailSyncService';

jest.mock('../src/services/gmailAuthService', () => ({
  getGmailAuthUrl: jest.fn(),
  handleGmailCallback: jest.fn(),
  disconnectGmail: jest.fn(),
  getGmailStats: jest.fn(),
}));

jest.mock('../src/services/gmailSyncService', () => ({
  syncGmailEvents: jest.fn(),
}));

describe('Gmail OAuth state validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores a server-side session-bound state during connect instead of trusting the raw userId', async () => {
    const req: any = {
      user: { userId: 'user-123' },
      session: {},
    };
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    (getGmailAuthUrl as jest.Mock).mockReturnValue('https://accounts.google.com/oauth/authorize?state=session-state');

    await connectGmail(req, res);

    expect(getGmailAuthUrl).toHaveBeenCalledWith('user-123', expect.any(String));
    expect(req.session.gmail_oauth_state).toEqual(expect.any(String));
    expect(req.session.gmail_oauth_user_id).toBe('user-123');
  });

  it('rejects callback requests when the incoming state does not match the session-bound nonce', async () => {
    const req: any = {
      query: {
        code: 'auth-code',
        state: 'tampered-state',
      },
      session: {
        gmail_oauth_state: 'session-state',
        gmail_oauth_user_id: 'user-123',
      },
    };
    const res: any = {
      redirect: jest.fn(),
    };

    await gmailCallback(req, res);

    expect(handleGmailCallback).not.toHaveBeenCalled();
    expect(syncGmailEvents).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('gmail_error=invalid_state'));
  });
});

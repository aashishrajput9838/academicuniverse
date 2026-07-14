const mockUserFindById = jest.fn();
const mockOAuth2Instance = {
  getToken: jest.fn(),
  refreshAccessToken: jest.fn(),
  setCredentials: jest.fn(),
};

jest.mock('../src/models/User', () => ({
  __esModule: true,
  default: {
    findById: mockUserFindById,
  },
}));

jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn(() => mockOAuth2Instance),
    },
    gmail: jest.fn(),
  },
}));

import { handleGmailCallback, refreshAccessToken } from '../src/services/gmailAuthService';
import { EncryptionUtil } from '../src/utils/encryption';
import User from '../src/models/User';

describe('Gmail token encryption compatibility', () => {
  const userDoc: any = {
    _id: 'user-123',
    gmailTokens: undefined,
    save: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = 'client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'client-secret';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:5000/api/gmail/callback';
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef';

    mockOAuth2Instance.getToken.mockResolvedValue({
      tokens: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expiry_date: 1234567890,
      },
    });

    mockOAuth2Instance.refreshAccessToken.mockResolvedValue({
      credentials: {
        access_token: 'fresh-access-token',
        expiry_date: 9876543210,
      },
    });

    mockUserFindById.mockResolvedValue(userDoc);
  });

  it('stores Gmail tokens in an encrypted payload instead of plaintext fields', async () => {
    await handleGmailCallback('auth-code', 'user-123');

    expect(userDoc.gmailTokens).toEqual(
      expect.objectContaining({
        encryptedToken: expect.any(String),
        iv: expect.any(String),
        expiryDate: 1234567890,
      })
    );
    expect(userDoc.gmailTokens).not.toHaveProperty('accessToken');
    expect(userDoc.gmailTokens).not.toHaveProperty('refreshToken');

    const decrypted = JSON.parse(
      EncryptionUtil.decrypt(userDoc.gmailTokens.encryptedToken, userDoc.gmailTokens.iv)
    );

    expect(decrypted.accessToken).toBe('access-token');
    expect(decrypted.refreshToken).toBe('refresh-token');
  });

  it('reads a legacy plaintext Gmail token payload without breaking current authentication flows', async () => {
    userDoc.gmailTokens = {
      accessToken: 'legacy-access-token',
      refreshToken: 'legacy-refresh-token',
      expiryDate: 5000,
    };

    const result = await refreshAccessToken('user-123');

    expect(result.accessToken).toBe('fresh-access-token');
    expect(result.refreshToken).toBe('legacy-refresh-token');
    expect(userDoc.gmailTokens).toEqual(
      expect.objectContaining({
        encryptedToken: expect.any(String),
        iv: expect.any(String),
      })
    );
  });
});

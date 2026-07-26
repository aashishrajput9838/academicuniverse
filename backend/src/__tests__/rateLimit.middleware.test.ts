import { Request, Response } from 'express';
import { rateLimit } from '../middleware/rateLimit';
import { RateLimitAttempt } from '../models/RateLimitAttempt';

jest.mock('../models/RateLimitAttempt');
jest.mock('../utils/response');

const mockSendResponse = jest.fn();
const mockSendError = jest.fn();
const mockNext = jest.fn();

describe('RateLimit Middleware', () => {
  const mockReq = {
    organizationId: '507f1f77bcf86cd799439014',
  } as any;
  const mockRes = {} as Response;

  beforeEach(() => {
    jest.clearAllMocks();
    (require('../utils/response').sendError as jest.Mock) = mockSendError;
    (RateLimitAttempt.findOne as jest.Mock) = jest.fn();
    (RateLimitAttempt.findOneAndUpdate as jest.Mock) = jest.fn();
    (RateLimitAttempt.create as jest.Mock) = jest.fn();
  });

  it('should allow request when under limit', async () => {
    const { rateLimit: rl } = await import('../middleware/rateLimit');
    const middleware = rl({ maxAttempts: 10, windowMinutes: 15, endpoint: '/api/resume/parse-upload' });

    (RateLimitAttempt.findOne as jest.Mock).mockResolvedValue(null);
    (RateLimitAttempt.create as jest.Mock).mockResolvedValue({});

    await middleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockSendError).not.toHaveBeenCalled();
    expect(RateLimitAttempt.create).toHaveBeenCalledWith({
      organizationId: mockReq.organizationId,
      endpoint: '/api/resume/parse-upload',
      attempts: 1,
      windowStart: expect.any(Date),
      lastAttemptAt: expect.any(Date),
    });
  });

  it('should reject request when limit exceeded', async () => {
    const { rateLimit: rl } = await import('../middleware/rateLimit');
    const middleware = rl({ maxAttempts: 2, windowMinutes: 15, endpoint: '/api/resume/parse-upload' });

    const windowStart = new Date(Date.now() - 5 * 60 * 1000);
    (RateLimitAttempt.findOne as jest.Mock).mockResolvedValue({
      attempts: 2,
      windowStart,
    });

    await middleware(mockReq, mockRes, mockNext);

    expect(mockSendError).toHaveBeenCalledWith(
      mockRes,
      429,
      'Rate limit exceeded',
      expect.objectContaining({ retryAfter: expect.any(Number) })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 403 when organizationId is missing', async () => {
    const { rateLimit: rl } = await import('../middleware/rateLimit');
    const middleware = rl({ maxAttempts: 10, windowMinutes: 15, endpoint: '/api/resume/parse-upload' });

    const reqWithoutOrg = { organizationId: undefined } as any;

    await middleware(reqWithoutOrg, mockRes, mockNext);

    expect(mockSendError).toHaveBeenCalledWith(mockRes, 403, 'Organization context required');
    expect(mockNext).not.toHaveBeenCalled();
  });
});

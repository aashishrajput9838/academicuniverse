import { Request, Response } from 'express';
import { rateLimit } from '../middleware/rateLimit';
import { RateLimitAttempt } from '../models/RateLimitAttempt';

jest.mock('../models/RateLimitAttempt');

const mockNext = jest.fn();

describe('RateLimit Middleware', () => {
  const mockReq = {
    organizationId: '507f1f77bcf86cd799439014',
  } as any;

  const createMockRes = (): any => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (RateLimitAttempt.findOneAndUpdate as jest.Mock) = jest.fn();
  });

  it('should allow request when under limit', async () => {
    const { rateLimit: rl } = await import('../middleware/rateLimit');
    const middleware = rl({ maxAttempts: 10, windowMinutes: 15, endpoint: '/api/resume/parse-upload' });

    (RateLimitAttempt.findOneAndUpdate as jest.Mock).mockResolvedValue({
      attempts: 1,
      windowCreatedAt: new Date(),
      lastAttemptAt: new Date(),
    });

    const res = createMockRes();
    await middleware(mockReq, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should allow request when no existing record exists (upsert path)', async () => {
    const { rateLimit: rl } = await import('../middleware/rateLimit');
    const middleware = rl({ maxAttempts: 10, windowMinutes: 15, endpoint: '/api/resume/parse-upload' });

    (RateLimitAttempt.findOneAndUpdate as jest.Mock).mockResolvedValue({
      attempts: 1,
      windowCreatedAt: new Date(),
      lastAttemptAt: new Date(),
    });

    const res = createMockRes();
    await middleware(mockReq, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should reject request when limit exceeded', async () => {
    const { rateLimit: rl } = await import('../middleware/rateLimit');
    const middleware = rl({ maxAttempts: 2, windowMinutes: 15, endpoint: '/api/resume/parse-upload' });

    const windowCreatedAt = new Date(Date.now() - 5 * 60 * 1000);
    (RateLimitAttempt.findOneAndUpdate as jest.Mock).mockResolvedValue({
      attempts: 3,
      windowCreatedAt,
      lastAttemptAt: new Date(),
    });

    const res = createMockRes();
    await middleware(mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Rate limit exceeded',
        retryAfter: expect.any(Number),
      })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 403 when organizationId is missing', async () => {
    const { rateLimit: rl } = await import('../middleware/rateLimit');
    const middleware = rl({ maxAttempts: 10, windowMinutes: 15, endpoint: '/api/resume/parse-upload' });

    const reqWithoutOrg = { organizationId: undefined } as any;
    const res = createMockRes();

    await middleware(reqWithoutOrg, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Organization context required',
      })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should allow request when existing record is outside window (TTL expiration)', async () => {
    const { rateLimit: rl } = await import('../middleware/rateLimit');
    const middleware = rl({ maxAttempts: 10, windowMinutes: 15, endpoint: '/api/resume/parse-upload' });

    (RateLimitAttempt.findOneAndUpdate as jest.Mock).mockResolvedValue({
      attempts: 1,
      windowCreatedAt: new Date(),
      lastAttemptAt: new Date(),
    });

    const res = createMockRes();
    await middleware(mockReq, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should enforce limit under concurrent requests from same org', async () => {
    const { rateLimit: rl } = await import('../middleware/rateLimit');
    const middleware = rl({ maxAttempts: 3, windowMinutes: 15, endpoint: '/api/resume/parse-upload' });

    let callCount = 0;
    (RateLimitAttempt.findOneAndUpdate as jest.Mock).mockImplementation(async () => {
      callCount++;
      if (callCount <= 3) {
        return { attempts: callCount, windowCreatedAt: new Date(), lastAttemptAt: new Date() };
      }
      return { attempts: callCount, windowCreatedAt: new Date(), lastAttemptAt: new Date() };
    });

    const responses = Array.from({ length: 5 }, () => createMockRes());
    const promises = responses.map((res) => middleware({ ...mockReq }, res, mockNext));
    await Promise.all(promises);

    const rejected = responses.filter((r: any) => r.status.mock.calls.some((c: any) => c[0] === 429)).length;
    expect(rejected).toBeGreaterThanOrEqual(2);
  });
});

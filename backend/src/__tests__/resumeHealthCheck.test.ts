import { checkResumeSubsystemHealth } from '../utils/resumeHealthCheck';
import { ResumeJob } from '../models/ResumeJob';
import { eventBus } from '../events/EventBus';

jest.mock('../models/ResumeJob');
jest.mock('../events/EventBus');

describe('resumeHealthCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkResumeSubsystemHealth', () => {
    test('returns healthy when queue and eventBus are operational', async () => {
      (ResumeJob.findOne as jest.Mock).mockReturnValue({
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({}),
      });
      
      (eventBus as any).listeners = new Map([['test', []]]);

      const health = await checkResumeSubsystemHealth();

      expect(health.healthy).toBe(true);
      expect(health.dependencies.queue).toBe(true);
      expect(health.dependencies.dispatcher).toBe(true);
      expect(health.dependencies.eventBus).toBe(true);
      expect(health.checkedAt).toBeInstanceOf(Date);
    });

    test('returns unhealthy when queue is down', async () => {
      (ResumeJob.findOne as jest.Mock).mockReturnValue({
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('MongoDB connection failed')),
      });
      
      (eventBus as any).listeners = new Map([['test', []]]);

      const health = await checkResumeSubsystemHealth();

      expect(health.healthy).toBe(false);
      expect(health.dependencies.queue).toBe(false);
      expect(health.dependencies.eventBus).toBe(true);
    });

    test('returns unhealthy when eventBus has no subscribers', async () => {
      (ResumeJob.findOne as jest.Mock).mockReturnValue({
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({}),
      });
      
      (eventBus as any).listeners = new Map();

      const health = await checkResumeSubsystemHealth();

      expect(health.healthy).toBe(false);
      expect(health.dependencies.queue).toBe(true);
      expect(health.dependencies.eventBus).toBe(false);
    });

    test('returns unhealthy when both dependencies are down', async () => {
      (ResumeJob.findOne as jest.Mock).mockReturnValue({
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('DB down')),
      });
      
      (eventBus as any).listeners = new Map();

      const health = await checkResumeSubsystemHealth();

      expect(health.healthy).toBe(false);
      expect(health.dependencies.queue).toBe(false);
      expect(health.dependencies.eventBus).toBe(false);
      expect(health.dependencies.dispatcher).toBe(true);
    });
  });
});

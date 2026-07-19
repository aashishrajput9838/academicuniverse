import axios from 'axios';
import { User } from '../../models';
import { Logger } from '../../utils/logger';
import getGithubOAuthService from '../githubOAuthService';
import { eventBus } from '../../events/EventBus';
import { UaipEvent } from '../../events/UaipEvents';
import { GithubRecord } from '../../models/GithubRecord';
import { PersonResolver } from '../../shared/services/personResolver.service';
import { toObjectId } from '../../utils/mongooseHelpers';

jest.mock('../githubOAuthService');
jest.mock('../../events/EventBus');
jest.mock('../../models/GithubRecord');
jest.mock('../../models/User');
jest.mock('../../shared/services/personResolver.service');

const mockedGetGithubOAuthService = getGithubOAuthService as jest.MockedFunction<any>;
const mockedEventBus = eventBus as jest.Mocked<typeof eventBus>;
const mockedGithubRecord = GithubRecord as jest.MockedFunction<any>;
const mockedUser = User as jest.MockedFunction<any>;
const mockedPersonResolver = PersonResolver as jest.MockedClass<typeof PersonResolver>;

describe('AnalyticsService - syncGithubData', () => {
  const mockFirebaseUid = 'test-firebase-uid';
  const mockOrgId = '507f1f77bcf86cd799439011';
  const mockUserId = '507f1f77bcf86cd799439012';
  const mockPersonId = '507f1f77bcf86cd799439099';

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetGithubOAuthService.mockReturnValue({
      getAccessToken: jest.fn().mockResolvedValue('mock-token'),
    } as any);
    mockedEventBus.publish.mockResolvedValue(undefined);
    mockedPersonResolver.mockImplementation(() => ({
      resolve: jest.fn().mockResolvedValue(mockPersonId),
    } as any));
  });

  const mockRepos = [
    { id: 1, name: 'repo1', language: 'TypeScript', topics: ['web'], fork: false, private: false, updated_at: '2024-01-01', created_at: '2024-01-01', size: 100, stargazers_count: 10, forks_count: 2, watchers_count: 5 },
    { id: 2, name: 'repo2', language: 'Python', topics: ['ai'], fork: false, private: false, updated_at: '2024-01-02', created_at: '2024-01-02', size: 200, stargazers_count: 20, forks_count: 5, watchers_count: 10 },
  ];

  const mockUserLean = {
    _id: mockUserId,
    organizationId: mockOrgId,
    githubUsername: 'testuser',
    name: 'Test User',
    email: 'test@example.com',
  };

  beforeEach(() => {
    jest.spyOn(axios, 'get').mockResolvedValue({
      data: mockRepos,
      headers: { link: null },
    } as any);

    mockedUser.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUserLean),
      }),
    } as any);

    mockedGithubRecord.findOneAndUpdate.mockResolvedValue({
      _id: 'github-record-1',
      organizationId: mockOrgId,
      personId: mockUserId,
    } as any);
  });

  it('should fetch repos, persist GithubRecord, and publish GithubUpdated event', async () => {
    const { AnalyticsService } = require('../analyticsService');
    const service = new AnalyticsService();

    const result = await service.syncGithubData(mockFirebaseUid);

    expect(mockedGithubRecord.findOneAndUpdate).toHaveBeenCalledWith(
      { organizationId: expect.any(Object), personId: expect.any(Object) },
      expect.objectContaining({
        $set: expect.objectContaining({
          languages: { TypeScript: 1, Python: 1 },
          rawConfidence: 0.9,
        }),
      }),
      { upsert: true, new: true }
    );

    expect(mockedEventBus.publish).toHaveBeenCalledWith(
      UaipEvent.GithubUpdated,
      expect.objectContaining({
        source: 'github',
        organizationId: mockOrgId,
        personId: mockPersonId,
      })
    );

    expect(result.repositoriesFetched).toBe(2);
    expect(result.languagesExtracted).toBe(2);
    expect(result.skillsCreated).toBe(2);
  });

  it('should handle idempotent sync - duplicate runs do not duplicate data', async () => {
    const { AnalyticsService } = require('../analyticsService');
    const service = new AnalyticsService();

    await service.syncGithubData(mockFirebaseUid);
    await service.syncGithubData(mockFirebaseUid);

    expect(mockedGithubRecord.findOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(mockedEventBus.publish).toHaveBeenCalledTimes(2);
  });

  it('should throw error when user not found', async () => {
    mockedUser.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    } as any);

    const { AnalyticsService } = require('../analyticsService');
    const service = new AnalyticsService();

    await expect(service.syncGithubData(mockFirebaseUid)).rejects.toThrow('User not found');
  });
});

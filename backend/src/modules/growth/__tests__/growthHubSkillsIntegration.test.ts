import { eventBus } from '../../../events/EventBus';
import { UaipEvent } from '../../../events/UaipEvents';
import { GrowthHubSkillsIntegration } from '../growthHubSkillsIntegration';
import { GrowthProjectionService } from '../growthProjection.service';
import { Person } from '../../../models/Person';
import { toObjectId } from '../../../utils/mongooseHelpers';

jest.mock('../growthProjection.service');
jest.mock('../../../models/Person');
jest.mock('../../../utils/mongooseHelpers', () => ({
  toObjectId: (value: any) => value,
}));

const mockedProjectionService = GrowthProjectionService as jest.MockedClass<typeof GrowthProjectionService>;
const mockedPerson = Person as jest.MockedFunction<any>;

const ORG_ID = '507f1f77bcf86cd799439011';
const USER_ID = '507f1f77bcf86cd799439012';
const PERSON_ID = '507f1f77bcf86cd799439013';

describe('GrowthHubSkillsIntegration', () => {
  let integration: GrowthHubSkillsIntegration;
  let mockBuildProjection: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    eventBus.reset();
    mockBuildProjection = jest.fn().mockResolvedValue({} as any);
    mockedProjectionService.mockImplementation(() => ({
      buildProjection: mockBuildProjection,
    } as any));
    mockedPerson.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ userIds: [USER_ID] }),
      }),
    } as any);
    integration = new GrowthHubSkillsIntegration();
    integration.start();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('SkillUpdated event', () => {
    it('should invalidate user projection on SkillUpdated', async () => {
      await eventBus.publish(UaipEvent.SkillUpdated, {
        organizationId: ORG_ID,
        personId: USER_ID,
        skillId: 'ESCO-1234',
        skillName: 'Python',
      } as any);

      expect(integration.isInvalidated(ORG_ID, USER_ID)).toBe(true);
      expect(integration.getInvalidatedCount()).toBe(1);
    });

    it('should not invalidate if organizationId or personId is missing', async () => {
      await eventBus.publish(UaipEvent.SkillUpdated, {
        skillId: 'ESCO-1234',
      } as any);

      expect(integration.isInvalidated(ORG_ID, USER_ID)).toBe(false);
      expect(integration.getInvalidatedCount()).toBe(0);
    });

    it('should track multiple invalidated users', async () => {
      const otherOrgId = '507f1f77bcf86cd799439099';
      const otherUserId = '507f1f77bcf86cd799439100';

      await eventBus.publish(UaipEvent.SkillUpdated, {
        organizationId: ORG_ID,
        personId: USER_ID,
        skillId: 'ESCO-1234',
      } as any);

      await eventBus.publish(UaipEvent.SkillUpdated, {
        organizationId: otherOrgId,
        personId: otherUserId,
        skillId: 'ESCO-5678',
      } as any);

      expect(integration.isInvalidated(ORG_ID, USER_ID)).toBe(true);
      expect(integration.isInvalidated(otherOrgId, otherUserId)).toBe(true);
      expect(integration.getInvalidatedCount()).toBe(2);
    });
  });

  describe('SkillProfileRebuilt event', () => {
    it('should schedule a Growth projection rebuild on SkillProfileRebuilt', async () => {
      await eventBus.publish(UaipEvent.SkillProfileRebuilt, {
        organizationId: ORG_ID,
        personId: PERSON_ID,
        skillsRebuilt: 5,
      } as any);

      expect(mockBuildProjection).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(5000);

      expect(mockedPerson.findOne).toHaveBeenCalledWith({
        _id: PERSON_ID,
        organizationId: ORG_ID,
      });
      expect(mockBuildProjection).toHaveBeenCalledWith(USER_ID, ORG_ID);
      expect(integration.isInvalidated(ORG_ID, PERSON_ID)).toBe(false);
    });

    it('should not rebuild if organizationId or personId is missing', async () => {
      await eventBus.publish(UaipEvent.SkillProfileRebuilt, {
        skillsRebuilt: 5,
      } as any);

      jest.advanceTimersByTime(5000);

      expect(mockBuildProjection).not.toHaveBeenCalled();
    });

    it('should debounce multiple SkillProfileRebuilt events for the same user', async () => {
      await eventBus.publish(UaipEvent.SkillProfileRebuilt, {
        organizationId: ORG_ID,
        personId: PERSON_ID,
        skillsRebuilt: 3,
      } as any);

      await eventBus.publish(UaipEvent.SkillProfileRebuilt, {
        organizationId: ORG_ID,
        personId: PERSON_ID,
        skillsRebuilt: 5,
      } as any);

      await jest.advanceTimersByTimeAsync(3000);
      expect(mockBuildProjection).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(2000);
      expect(mockBuildProjection).toHaveBeenCalledTimes(1);
      expect(mockBuildProjection).toHaveBeenCalledWith(USER_ID, ORG_ID);
    });

    it('should rebuild for different users independently', async () => {
      const otherOrgId = '507f1f77bcf86cd799439099';
      const otherUserId = '507f1f77bcf86cd799439100';
      const otherPersonId = '507f1f77bcf86cd799439101';

      mockedPerson.findOne.mockImplementation((query: any) => {
        const personId = query._id;
        const userIds = personId === otherPersonId ? [otherUserId] : [USER_ID];
        return {
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue({ userIds }),
          }),
        } as any;
      });

      await eventBus.publish(UaipEvent.SkillProfileRebuilt, {
        organizationId: ORG_ID,
        personId: PERSON_ID,
        skillsRebuilt: 3,
      } as any);

      await eventBus.publish(UaipEvent.SkillProfileRebuilt, {
        organizationId: otherOrgId,
        personId: otherPersonId,
        skillsRebuilt: 4,
      } as any);

      await jest.advanceTimersByTimeAsync(5000);

      expect(mockBuildProjection).toHaveBeenCalledTimes(2);
      expect(mockBuildProjection).toHaveBeenCalledWith(USER_ID, ORG_ID);
      expect(mockBuildProjection).toHaveBeenCalledWith(otherUserId, otherOrgId);
    });

    it('should handle projection rebuild errors gracefully', async () => {
      mockBuildProjection.mockRejectedValue(new Error('DB error'));

      await eventBus.publish(UaipEvent.SkillProfileRebuilt, {
        organizationId: ORG_ID,
        personId: PERSON_ID,
        skillsRebuilt: 5,
      } as any);

      await jest.advanceTimersByTimeAsync(5000);

      expect(mockedPerson.findOne).toHaveBeenCalledWith({
        _id: PERSON_ID,
        organizationId: ORG_ID,
      });
      expect(mockBuildProjection).toHaveBeenCalledWith(USER_ID, ORG_ID);
      expect(integration.isInvalidated(ORG_ID, PERSON_ID)).toBe(false);
    });

    it('should skip rebuild when Person document is not found', async () => {
      mockedPerson.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      } as any);

      await eventBus.publish(UaipEvent.SkillProfileRebuilt, {
        organizationId: ORG_ID,
        personId: PERSON_ID,
        skillsRebuilt: 5,
      } as any);

      await jest.advanceTimersByTimeAsync(5000);

      expect(mockedPerson.findOne).toHaveBeenCalledWith({
        _id: PERSON_ID,
        organizationId: ORG_ID,
      });
      expect(mockBuildProjection).not.toHaveBeenCalled();
      expect(integration.isInvalidated(ORG_ID, PERSON_ID)).toBe(false);
    });

    it('should skip rebuild when Person has no userIds', async () => {
      mockedPerson.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ userIds: [] }),
        }),
      } as any);

      await eventBus.publish(UaipEvent.SkillProfileRebuilt, {
        organizationId: ORG_ID,
        personId: PERSON_ID,
        skillsRebuilt: 5,
      } as any);

      await jest.advanceTimersByTimeAsync(5000);

      expect(mockedPerson.findOne).toHaveBeenCalledWith({
        _id: PERSON_ID,
        organizationId: ORG_ID,
      });
      expect(mockBuildProjection).not.toHaveBeenCalled();
      expect(integration.isInvalidated(ORG_ID, PERSON_ID)).toBe(false);
    });

    it('should skip rebuild when Person has multiple userIds', async () => {
      mockedPerson.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            userIds: [USER_ID, '507f1f77bcf86cd799439014'],
          }),
        }),
      } as any);

      await eventBus.publish(UaipEvent.SkillProfileRebuilt, {
        organizationId: ORG_ID,
        personId: PERSON_ID,
        skillsRebuilt: 5,
      } as any);

      await jest.advanceTimersByTimeAsync(5000);

      expect(mockedPerson.findOne).toHaveBeenCalledWith({
        _id: PERSON_ID,
        organizationId: ORG_ID,
      });
      expect(mockBuildProjection).not.toHaveBeenCalled();
      expect(integration.isInvalidated(ORG_ID, PERSON_ID)).toBe(false);
    });
  });

  describe('combined event flow', () => {
    it('should invalidate on SkillUpdated and rebuild on SkillProfileRebuilt', async () => {
      await eventBus.publish(UaipEvent.SkillUpdated, {
        organizationId: ORG_ID,
        personId: PERSON_ID,
        skillId: 'ESCO-1234',
      } as any);

      expect(integration.isInvalidated(ORG_ID, PERSON_ID)).toBe(true);

      await eventBus.publish(UaipEvent.SkillProfileRebuilt, {
        organizationId: ORG_ID,
        personId: PERSON_ID,
        skillsRebuilt: 1,
      } as any);

      await jest.advanceTimersByTimeAsync(5000);

      expect(mockBuildProjection).toHaveBeenCalledWith(USER_ID, ORG_ID);
      expect(integration.isInvalidated(ORG_ID, PERSON_ID)).toBe(false);
    });
  });
});

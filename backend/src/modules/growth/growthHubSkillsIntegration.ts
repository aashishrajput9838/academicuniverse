import { eventBus } from '../../events/EventBus';
import { UaipEvent } from '../../events/UaipEvents';
import { GrowthProjectionService } from './growthProjection.service';
import { Person } from '../../models/Person';
import { toObjectId } from '../../utils/mongooseHelpers';
import { Logger } from '../../utils/logger';

const logger = new Logger('GrowthHubSkillsIntegration');

export class GrowthHubSkillsIntegration {
  private readonly projectionService: GrowthProjectionService;
  private readonly invalidatedUsers: Set<string> = new Set();
  private rebuildTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly REBUILD_DEBOUNCE_MS = 5000;
  private started = false;

  constructor(projectionService?: GrowthProjectionService) {
    this.projectionService = projectionService || new GrowthProjectionService();
  }

  public start(): void {
    if (this.started) {
      return;
    }
    this.initializeSubscriptions();
    this.started = true;
    logger.info('Growth Hub Skills Integration started');
  }

  public stop(): void {
    for (const timer of this.rebuildTimers.values()) {
      clearTimeout(timer);
    }
    this.rebuildTimers.clear();
    this.invalidatedUsers.clear();
    this.started = false;
    logger.info('Growth Hub Skills Integration stopped');
  }

  private initializeSubscriptions(): void {
    eventBus.subscribe(UaipEvent.SkillUpdated, async (payload: any) => {
      await this.handleSkillUpdated(payload);
    });

    eventBus.subscribe(UaipEvent.SkillProfileRebuilt, async (payload: any) => {
      await this.handleSkillProfileRebuilt(payload);
    });

    logger.info('Growth Hub Skills Integration subscribed to SkillUpdated and SkillProfileRebuilt events');
  }

  private async handleSkillUpdated(payload: any): Promise<void> {
    const { organizationId, personId, skillId } = payload;

    if (!organizationId || !personId) {
      logger.warn('SkillUpdated event missing organizationId or personId', { skillId });
      return;
    }

    const userKey = `${organizationId}:${personId}`;
    this.invalidatedUsers.add(userKey);

    logger.debug('Skill projection invalidated for user', {
      organizationId,
      personId,
      skillId,
      invalidatedCount: this.invalidatedUsers.size,
    });
  }

  private async handleSkillProfileRebuilt(payload: any): Promise<void> {
    const { organizationId, personId, skillsRebuilt } = payload;

    if (!organizationId || !personId) {
      logger.warn('SkillProfileRebuilt event missing organizationId or personId');
      return;
    }

    const userKey = `${organizationId}:${personId}`;

    if (this.rebuildTimers.has(userKey)) {
      clearTimeout(this.rebuildTimers.get(userKey)!);
    }

    const timer = setTimeout(async () => {
      this.rebuildTimers.delete(userKey);
      await this.rebuildGrowthProjection(organizationId, personId);
      this.invalidatedUsers.delete(userKey);
    }, this.REBUILD_DEBOUNCE_MS);

    this.rebuildTimers.set(userKey, timer);

    logger.debug('Skill profile rebuild scheduled for Growth Hub projection', {
      organizationId,
      personId,
      skillsRebuilt,
      debounceMs: this.REBUILD_DEBOUNCE_MS,
    });
  }

  private async rebuildGrowthProjection(organizationId: string, personId: string): Promise<void> {
    try {
      const person = await Person.findOne({
        _id: toObjectId(personId),
        organizationId: toObjectId(organizationId),
      }).select('userIds').lean();

      if (!person) {
        logger.warn('Growth Hub projection skipped: Person document not found', {
          organizationId,
          personId,
        });
        return;
      }

      const userIds = (person as any).userIds || [];

      if (userIds.length !== 1) {
        logger.warn('Growth Hub projection skipped: Person has zero or multiple userIds', {
          organizationId,
          personId,
          userIdCount: userIds.length,
          userIds: userIds.map((id: any) => id.toString()),
        });
        return;
      }

      const userId = userIds[0].toString();

      const startTime = Date.now();
      await this.projectionService.buildProjection(userId, organizationId);
      const duration = Date.now() - startTime;

      logger.info('Growth Hub projection rebuilt after Skills Tracker update', {
        organizationId,
        personId,
        userId,
        durationMs: duration,
      });
    } catch (err: any) {
      logger.error('Failed to rebuild Growth Hub projection after Skills Tracker update', {
        organizationId,
        personId,
        error: err.message,
      });
    }
  }

  isInvalidated(organizationId: string, personId: string): boolean {
    return this.invalidatedUsers.has(`${organizationId}:${personId}`);
  }

  getInvalidatedCount(): number {
    return this.invalidatedUsers.size;
  }
}

export const growthHubSkillsIntegration = new GrowthHubSkillsIntegration();
growthHubSkillsIntegration.start();

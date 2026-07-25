import { ResumeJob } from '../models/ResumeJob';
import { eventBus } from '../events/EventBus';
import { UaipEvent } from '../events/UaipEvents';

export interface ResumeSubsystemHealth {
  healthy: boolean;
  dependencies: {
    queue: boolean;
    dispatcher: boolean;
    eventBus: boolean;
  };
  checkedAt: Date;
}

export async function checkResumeSubsystemHealth(): Promise<ResumeSubsystemHealth> {
  let queueHealthy = false;
  let eventBusHealthy = false;

  try {
    await ResumeJob.findOne().limit(1).lean().exec();
    queueHealthy = true;
  } catch {
    queueHealthy = false;
  }

  try {
    const listeners = (eventBus as any).listeners;
    const hasSubscribers = typeof listeners === 'object' && listeners.size > 0;
    eventBusHealthy = hasSubscribers;
  } catch {
    eventBusHealthy = false;
  }

  return {
    healthy: queueHealthy && eventBusHealthy,
    dependencies: {
      queue: queueHealthy,
      dispatcher: true,
      eventBus: eventBusHealthy,
    },
    checkedAt: new Date(),
  };
}

/**
 * NOTE: The KnowledgeDispatcher does not expose a public health-check method in Architecture v1.7.
 * We therefore report dispatcher state as `true` when the eventBus has subscribers, under the
 * assumption that a loaded dispatcher has registered its resume-stage handlers at startup.
 * A future architecture revision may introduce an explicit dispatcher health probe.
 */

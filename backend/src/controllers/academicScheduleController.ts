import { Request, Response } from 'express';
import { sendResponse, sendError } from '../utils/response';
import { PersonResolver } from '../shared/services/personResolver.service';
import { AcademicSchedule } from '../models/AcademicSchedule';
import { toObjectId } from '../utils/mongooseHelpers';

/**
 * GET /api/academic-schedule/me
 * Returns the academic schedule for the authenticated user.
 */
export const getMyAcademicSchedule = async (req: any, res: Response) => {
  const { organizationId, user } = req;
  const authUserId = user?.userId;
  if (!organizationId || !authUserId) {
    return sendError(res, 401, 'Authentication required');
  }
  try {
    const personResolver = new PersonResolver();
    const personId = await personResolver.resolve(authUserId, organizationId);

    const schedule = await AcademicSchedule.findOne({
      organizationId: toObjectId(organizationId),
      personId: toObjectId(personId),
    }).lean();

    if (!schedule) {
      return sendResponse(res, 200, null, 'No schedule found');
    }

    return sendResponse(res, 200, schedule, 'Schedule retrieved');
  } catch (err: any) {
    console.error('Get academic schedule error:', err);
    return sendError(res, 500, 'Failed to fetch academic schedule');
  }
};

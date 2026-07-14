import { Request, Response } from 'express';
import { sendResponse, sendError } from '../utils/response';
import { AcademicRecordRepository } from '../shared/repositories/academicRecord.repository';
import { PersonResolver } from '../shared/services/personResolver.service';

/**
 * GET /api/academic-records/me
 * Returns academic records for the authenticated user.
 * The PersonResolver resolves the canonical Person ID from the auth identity.
 */
export const getMyAcademicRecords = async (req: any, res: Response) => {
  const { organizationId, user } = req;
  const authUserId = user?.userId;
  if (!organizationId || !authUserId) {
    return sendError(res, 401, 'Authentication required');
  }
  try {
    const personResolver = new PersonResolver();
    const personId = await personResolver.resolve(authUserId, organizationId);
    const repo = new AcademicRecordRepository();
    const records = await repo.findByPerson(personId);
    return sendResponse(res, 200, records, 'Academic records retrieved');
  } catch (err: any) {
    console.error('Get academic records error:', err);
    return sendError(res, 500, 'Failed to fetch academic records');
  }
};

import { Response } from 'express';

import { sendResponse, sendError } from '../utils/response';
import { buildGrowthHubResponse } from '../services/growthService';

export const getMyGrowthHub = async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    const organizationId = req.organizationId;

    if (!userId) {
      return sendError(res, 401, 'Authentication required');
    }

    if (!organizationId) {
      return sendError(res, 403, 'Organization context is required');
    }

    const growthData = await buildGrowthHubResponse(userId, organizationId);
    return sendResponse(res, 200, growthData, 'Growth Hub metrics retrieved successfully');
  } catch (error: any) {
    console.error('Get growth hub error:', error);
    return sendError(res, 500, 'Failed to fetch growth hub metrics');
  }
};

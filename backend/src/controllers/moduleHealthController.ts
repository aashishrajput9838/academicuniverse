import { Response, NextFunction } from 'express';
import { sendResponse, sendError } from '../utils/response';
import { RoutingExecutor } from '../shared/application/routingEngine';

export const getModuleHealth = async (req: any, res: Response, next: NextFunction) => {
  try {
    const health = await RoutingExecutor.healthCheck();
    const healthyCount = Object.values(health).filter((h: any) => h.healthy).length;
    const totalCount = Object.keys(health).length;

    return sendResponse(res, 200, {
      healthyCount,
      totalCount,
      modules: health,
    }, 'Module health check completed');
  } catch (err: any) {
    next(err);
  }
};

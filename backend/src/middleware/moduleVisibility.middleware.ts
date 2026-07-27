import { NextFunction, Response } from 'express';
import { moduleVisibilityService } from '../services/moduleVisibility.service';
import { sendError } from '../utils/response';
import { Logger } from '../utils/logger';

const logger = new Logger('ModuleVisibilityMiddleware');

export const moduleGuard = (moduleKey: string) => {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      if (req.user?.isSuperAdmin) {
        return next();
      }

      const isEnabled = await moduleVisibilityService.isModuleEnabled(moduleKey);

      if (!isEnabled) {
        return sendError(res, 404, 'Module not found');
      }

      next();
    } catch (error: any) {
      logger.error(`Module guard error for ${moduleKey}:`, error);
      return sendError(res, 500, 'Internal server error');
    }
  };
};

export const optionalModuleGuard = (moduleKey: string) => {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      if (req.user?.isSuperAdmin) {
        return next();
      }

      const isEnabled = await moduleVisibilityService.isModuleEnabled(moduleKey);

      if (!isEnabled) {
        req.moduleDisabled = true;
      }

      next();
    } catch (error: any) {
      logger.error(`Optional module guard error for ${moduleKey}:`, error);
      next();
    }
  };
};

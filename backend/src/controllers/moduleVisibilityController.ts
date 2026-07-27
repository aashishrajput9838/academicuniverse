import { Response } from 'express';
import { sendResponse, sendError } from '../utils/response';
import { moduleVisibilityService } from '../services/moduleVisibility.service';
import { Logger } from '../utils/logger';

const logger = new Logger('ModuleVisibilityController');

export const getAllModulesController = async (req: any, res: Response) => {
  try {
    const modules = await moduleVisibilityService.getAllModules();
    sendResponse(res, 200, { modules }, 'Modules retrieved successfully');
  } catch (error: any) {
    logger.error('Failed to fetch modules:', error);
    sendError(res, 500, 'Failed to fetch modules');
  }
};

export const getModuleController = async (req: any, res: Response) => {
  try {
    const { key } = req.params;
    const module = await moduleVisibilityService.getModule(key);
    if (!module) {
      return sendError(res, 404, 'Module not found');
    }
    sendResponse(res, 200, { module }, 'Module retrieved successfully');
  } catch (error: any) {
    logger.error('Failed to fetch module:', error);
    sendError(res, 500, 'Failed to fetch module');
  }
};

export const updateModuleController = async (req: any, res: Response) => {
  try {
    const { key } = req.params;
    const { isEnabled, isVisible, name, description, category, sortOrder } = req.body;

    const updated = await moduleVisibilityService.updateModule(key, {
      isEnabled,
      isVisible,
      name,
      description,
      category,
      sortOrder,
    });

    if (!updated) {
      return sendError(res, 404, 'Module not found');
    }

    sendResponse(res, 200, { module: updated }, 'Module updated successfully');
  } catch (error: any) {
    logger.error('Failed to update module:', error);
    sendError(res, 500, 'Failed to update module');
  }
};

export const batchUpdateModulesController = async (req: any, res: Response) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates)) {
      return sendError(res, 400, 'Invalid update payload');
    }

    const results = [];
    for (const update of updates) {
      const updated = await moduleVisibilityService.updateModule(update.key, {
        isEnabled: update.isEnabled,
        isVisible: update.isVisible,
        name: update.name,
        description: update.description,
        category: update.category,
        sortOrder: update.sortOrder,
      });
      results.push(updated);
    }

    sendResponse(res, 200, { modules: results }, 'Modules updated successfully');
  } catch (error: any) {
    logger.error('Failed to batch update modules:', error);
    sendError(res, 500, 'Failed to batch update modules');
  }
};

export const toggleModuleController = async (req: any, res: Response) => {
  try {
    const { key } = req.params;
    const { isEnabled } = req.body;

    await moduleVisibilityService.setModuleEnabled(key, isEnabled);
    const module = await moduleVisibilityService.getModule(key);

    sendResponse(res, 200, { module }, `Module ${isEnabled ? 'enabled' : 'disabled'} successfully`);
  } catch (error: any) {
    logger.error('Failed to toggle module:', error);
    sendError(res, 500, 'Failed to toggle module');
  }
};

export const registerModuleController = async (req: any, res: Response) => {
  try {
    const module = await moduleVisibilityService.registerModule(req.body);
    sendResponse(res, 201, { module }, 'Module registered successfully');
  } catch (error: any) {
    logger.error('Failed to register module:', error);
    sendError(res, 500, 'Failed to register module');
  }
};

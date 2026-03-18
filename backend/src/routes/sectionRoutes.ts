import { Router } from 'express';
import { authenticateUser, authorize } from '../middleware/auth';
import { getAllSectionsController, updateRepresentativeController, createSectionController, updateSectionController, deleteSectionController } from '../controllers/sectionController';

const sectionRouter = Router();

// Only authenticated users can view sections
// For more granular control, you could optionally require a specific permission
sectionRouter.get(
    '/',
    authenticateUser,
    getAllSectionsController
);

// Only admins with MANAGE_USERS or equivalent permission should assign representatives
sectionRouter.patch(
    '/:sectionId/representative',
    authenticateUser,
    authorize('MANAGE_USERS'),
    updateRepresentativeController
);

// Admin only routes for managing sections
sectionRouter.post(
    '/',
    authenticateUser,
    authorize('MANAGE_USERS'),
    createSectionController
);

sectionRouter.put(
    '/:sectionId',
    authenticateUser,
    authorize('MANAGE_USERS'),
    updateSectionController
);

sectionRouter.delete(
    '/:sectionId',
    authenticateUser,
    authorize('MANAGE_USERS'),
    deleteSectionController
);

export default sectionRouter;

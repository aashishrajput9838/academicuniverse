import { Router } from 'express';
import { authenticateUser, authorize } from '../middleware/auth';
import { getAllSectionsController, updateRepresentativeController } from '../controllers/sectionController';

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

export default sectionRouter;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const auth_2 = require("../middleware/auth");
const sectionController_1 = require("../controllers/sectionController");
const sectionRouter = (0, express_1.Router)();
// Only authenticated users can view sections
// For more granular control, you could optionally require a specific permission
sectionRouter.get('/', auth_1.authenticateFirebaseUser, sectionController_1.getAllSectionsController);
// Only admins with MANAGE_USERS or equivalent permission should assign representatives
sectionRouter.patch('/:sectionId/representative', auth_1.authenticateFirebaseUser, (0, auth_2.authorize)('MANAGE_USERS'), sectionController_1.updateRepresentativeController);
exports.default = sectionRouter;

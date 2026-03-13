"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const overlapController_1 = require("../controllers/overlapController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/overlap-engine/sections
 * @desc    Get available sections for organization
 * @access  Private (Firebase authenticated users)
 * @query   organizationId - Organization ID
 */
router.get('/sections', auth_1.authenticateFirebaseUser, overlapController_1.getAvailableSections);
/**
 * @route   POST /api/overlap-engine/sections
 * @desc    Calculate overlap slots for selected sections
 * @access  Private (Firebase authenticated users)
 * @body    { sections: string[], organizationId: string }
 */
router.post('/sections', auth_1.authenticateFirebaseUser, overlapController_1.calculateOverlapSlots);
exports.default = router;

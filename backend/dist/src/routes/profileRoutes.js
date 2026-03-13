"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const profileController_1 = require("../controllers/profileController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/', auth_1.authenticateUser, profileController_1.getProfileController);
/**
 * @route   PUT /api/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/', auth_1.authenticateUser, profileController_1.updateProfileController);
exports.default = router;

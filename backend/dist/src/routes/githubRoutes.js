"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const githubController_1 = require("../controllers/githubController");
const auth_1 = require("../middleware/auth");
const githubOAuthController_1 = require("../controllers/githubOAuthController");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/github/connect
 * @desc    Initiate GitHub OAuth flow
 * @access  Private (Student role only)
 */
router.get('/connect', auth_1.authenticateFirebaseUser, githubOAuthController_1.connectGithub);
/**
 * @route   GET /api/github/callback
 * @desc    GitHub OAuth callback handler
 * @access  Public (GitHub redirects here)
 */
router.get('/callback', githubOAuthController_1.githubOAuthCallback);
/**
 * @route   DELETE /api/github/disconnect
 * @desc    Disconnect GitHub account
 * @access  Private (Student role only)
 */
router.delete('/disconnect', auth_1.authenticateFirebaseUser, githubOAuthController_1.disconnectGithub);
/**
 * @route   GET /api/github/stats
 * @desc    Get processed developer statistics
 * @access  Private (Student role only)
 */
router.get('/stats', auth_1.authenticateFirebaseUser, githubOAuthController_1.getDeveloperStats);
/**
 * @route   GET /api/github/projects
 * @desc    Get student's GitHub project statistics
 * @access  Private (Student role only)
 */
router.get('/projects', auth_1.authenticateFirebaseUser, githubController_1.getProjectStats);
/**
 * @route   POST /api/github/projects/refresh
 * @desc    Refresh cached GitHub project statistics
 * @access  Private (Student role only)
 */
router.post('/projects/refresh', auth_1.authenticateFirebaseUser, githubController_1.refreshProjectStats);
exports.default = router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableSections = exports.calculateOverlapSlots = void 0;
const logger_1 = require("../utils/logger");
const overlapService_1 = __importDefault(require("../services/overlapService"));
const logger = new logger_1.Logger('overlapController');
/**
 * Controller: Calculate overlap slots for selected sections
 * @route POST /api/overlap-engine/sections
 * @access Private (authenticated users only)
 */
const calculateOverlapSlots = async (req, res) => {
    try {
        // Verify Firebase authentication (user info is already attached by middleware)
        if (!req.firebaseUser?.firebaseUid) {
            logger.warn('Unauthenticated overlap request attempted');
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        logger.info('Calculating overlap slots request', {
            userFirebaseUid: req.firebaseUser.firebaseUid,
            email: req.firebaseUser?.email || 'Unknown'
        });
        // Extract organization from request body or query parameters
        const { organizationId } = req.body;
        const queryOrgId = req.query.organizationId;
        if (!organizationId && !queryOrgId) {
            logger.warn('Organization ID not provided in request');
            return res.status(400).json({
                success: false,
                message: 'Organization ID is required'
            });
        }
        const orgId = organizationId || queryOrgId;
        // Validate request body
        const { sections } = req.body;
        if (!sections || !Array.isArray(sections)) {
            logger.warn('Invalid sections array in request body', { sections });
            return res.status(400).json({
                success: false,
                message: 'Sections must be provided as an array'
            });
        }
        // Validate sections array
        if (sections.length === 0) {
            logger.warn('Empty sections array provided');
            return res.status(400).json({
                success: false,
                message: 'At least one section must be selected'
            });
        }
        if (sections.length > 5) {
            logger.warn('Too many sections selected', { count: sections.length });
            return res.status(400).json({
                success: false,
                message: 'Maximum 5 sections allowed per request'
            });
        }
        // Validate section IDs
        for (const sectionId of sections) {
            if (typeof sectionId !== 'string' || sectionId.trim() === '') {
                logger.warn('Invalid section ID provided', { sectionId });
                return res.status(400).json({
                    success: false,
                    message: `Invalid section ID: ${sectionId}`
                });
            }
        }
        // Remove duplicates and trim whitespace
        const uniqueSections = [...new Set(sections.map(id => id.trim()))];
        logger.info('Processing overlap request', {
            organizationId: orgId,
            sectionCount: uniqueSections.length,
            sections: uniqueSections
        });
        // Calculate overlap using the service
        const overlapResult = await overlapService_1.default.findOverlapSlots(uniqueSections, orgId);
        logger.info('Overlap calculation completed successfully', {
            organizationId: orgId,
            sectionCount: uniqueSections.length,
            result: overlapResult
        });
        return res.status(200).json({
            success: true,
            message: 'Overlap slots calculated successfully',
            data: {
                sections: uniqueSections,
                organizationId: orgId,
                overlapSlots: overlapResult,
                totalDays: Object.keys(overlapResult).length,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        logger.error('Error in calculateOverlapSlots:', error);
        // Handle specific error types
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        if (error.name === 'NotFoundError') {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        // Handle generic errors
        return res.status(500).json({
            success: false,
            message: 'Failed to calculate overlap slots',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};
exports.calculateOverlapSlots = calculateOverlapSlots;
/**
 * Controller: Get available sections for organization
 * @route GET /api/overlap-engine/sections
 * @access Private (authenticated users only)
 */
const getAvailableSections = async (req, res) => {
    try {
        // Verify Firebase authentication
        if (!req.firebaseUser?.firebaseUid) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        // Get organizationId from query parameters
        const organizationId = req.query.organizationId;
        if (!organizationId) {
            return res.status(400).json({
                success: false,
                message: 'Organization ID is required as query parameter'
            });
        }
        logger.info('Fetching available sections', { organizationId, user: req.firebaseUser.firebaseUid });
        // Get available sections from service
        const sections = await overlapService_1.default.getAvailableSections(organizationId);
        return res.status(200).json({
            success: true,
            message: 'Available sections retrieved successfully',
            data: {
                sections,
                organizationId,
                count: sections.length
            }
        });
    }
    catch (error) {
        logger.error('Error fetching available sections:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch available sections',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};
exports.getAvailableSections = getAvailableSections;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const logger_1 = require("../utils/logger");
const Timetable_1 = __importDefault(require("../models/Timetable"));
const timetableRouter = (0, express_1.Router)();
const logger = new logger_1.Logger('timetableRoutes');
/**
 * Upload timetable for a section
 * POST /api/timetable/upload
 */
timetableRouter.post('/upload', auth_1.authenticateFirebaseUser, async (req, res) => {
    try {
        const { sectionId } = req.body;
        const file = req.file;
        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }
        // Validate file type
        if (file.mimetype !== 'application/pdf') {
            return res.status(400).json({
                success: false,
                message: 'Only PDF files are allowed'
            });
        }
        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            return res.status(400).json({
                success: false,
                message: 'File size exceeds 10MB limit'
            });
        }
        // Find existing timetable or create new
        let timetableInfo = await Timetable_1.default.findOne({ sectionId, organizationId: req.organizationId });
        if (timetableInfo) {
            // Update existing
            timetableInfo.fileName = file.originalname;
            timetableInfo.uploadTime = new Date();
            timetableInfo.uploadedBy = req.user?.userId;
            await timetableInfo.save();
        }
        else {
            timetableInfo = await Timetable_1.default.create({
                sectionId,
                fileName: file.originalname,
                organizationId: req.organizationId,
                uploadedBy: req.user?.userId
            });
        }
        logger.info(`Timetable uploaded for section ${sectionId}`, {
            fileName: file.originalname,
            fileSize: file.size,
            userId: req.user?.userId
        });
        return res.status(200).json({
            success: true,
            message: 'Timetable uploaded successfully',
            data: {
                sectionId,
                fileName: timetableInfo.fileName,
                uploadTime: timetableInfo.uploadTime
            }
        });
    }
    catch (error) {
        logger.error('Error uploading timetable:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to upload timetable',
            error: error.message
        });
    }
});
/**
 * Get timetable status for a section
 * GET /api/timetable/status/:sectionId
 */
timetableRouter.get('/status/:sectionId', auth_1.authenticateFirebaseUser, async (req, res) => {
    try {
        const { sectionId } = req.params;
        const timetableInfo = await Timetable_1.default.findOne({ sectionId, organizationId: req.organizationId });
        if (!timetableInfo) {
            return res.status(404).json({
                success: false,
                message: 'No timetable found for this section'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Timetable status retrieved',
            data: {
                sectionId,
                fileName: timetableInfo.fileName,
                uploadTime: timetableInfo.uploadTime,
                hasTimetable: true
            }
        });
    }
    catch (error) {
        logger.error('Error fetching timetable status:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch timetable status',
            error: error.message
        });
    }
});
exports.default = timetableRouter;

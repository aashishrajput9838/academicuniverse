"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllMarksController = exports.deleteMarksController = exports.updateMarksController = exports.getStudentMarksController = exports.addMarksController = void 0;
const response_1 = require("../utils/response");
const Mark_1 = __importDefault(require("../models/Mark"));
/**
 * Add marks for a student
 * POST /api/marks
 * Requires: ADD_MARKS permission
 */
const addMarksController = async (req, res) => {
    try {
        const { studentId, subjectId, marks } = req.body;
        // Validate required fields
        if (!studentId || !subjectId || marks === undefined) {
            return (0, response_1.sendError)(res, 400, 'studentId, subjectId, and marks are required');
        }
        // Validate marks range
        if (typeof marks !== 'number' || marks < 0 || marks > 100) {
            return (0, response_1.sendError)(res, 400, 'Marks must be a number between 0 and 100');
        }
        // Create mark record
        const mark = await Mark_1.default.create({
            studentId,
            subjectId,
            marks,
            organizationId: req.organizationId,
            createdBy: req.user.userId,
        });
        return (0, response_1.sendResponse)(res, 201, mark, 'Marks added successfully');
    }
    catch (error) {
        console.error('Add marks error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to add marks');
    }
};
exports.addMarksController = addMarksController;
/**
 * View marks for a student
 * GET /api/marks/:studentId
 * Requires: VIEW_MARKS permission
 */
const getStudentMarksController = async (req, res) => {
    try {
        const { studentId } = req.params;
        // Fetch marks for this student in this organization
        const studentMarks = await Mark_1.default.find({ studentId, organizationId: req.organizationId })
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });
        return (0, response_1.sendResponse)(res, 200, studentMarks, 'Marks retrieved successfully');
    }
    catch (error) {
        console.error('Get marks error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to fetch marks');
    }
};
exports.getStudentMarksController = getStudentMarksController;
/**
 * Update marks
 * PUT /api/marks/:markId
 * Requires: EDIT_MARKS permission
 */
const updateMarksController = async (req, res) => {
    try {
        const { markId } = req.params;
        const { marks } = req.body;
        if (marks === undefined || typeof marks !== 'number' || marks < 0 || marks > 100) {
            return (0, response_1.sendError)(res, 400, 'Marks must be a number between 0 and 100');
        }
        const mark = await Mark_1.default.findOneAndUpdate({ _id: markId, organizationId: req.organizationId }, { marks }, { new: true });
        if (!mark) {
            return (0, response_1.sendError)(res, 404, 'Mark record not found');
        }
        return (0, response_1.sendResponse)(res, 200, mark, 'Marks updated successfully');
    }
    catch (error) {
        console.error('Update marks error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to update marks');
    }
};
exports.updateMarksController = updateMarksController;
/**
 * Delete marks
 * DELETE /api/marks/:markId
 * Requires: DELETE_MARKS permission
 */
const deleteMarksController = async (req, res) => {
    try {
        const { markId } = req.params;
        const deletedMark = await Mark_1.default.findOneAndDelete({ _id: markId, organizationId: req.organizationId });
        if (!deletedMark) {
            return (0, response_1.sendError)(res, 404, 'Mark record not found');
        }
        return (0, response_1.sendResponse)(res, 200, deletedMark, 'Marks deleted successfully');
    }
    catch (error) {
        console.error('Delete marks error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to delete marks');
    }
};
exports.deleteMarksController = deleteMarksController;
/**
 * Get all marks for organization (admin only)
 * GET /api/marks
 * Requires: VIEW_ALL_MARKS permission
 */
const getAllMarksController = async (req, res) => {
    try {
        // Fetch all marks for this organization
        const allMarks = await Mark_1.default.find({ organizationId: req.organizationId })
            .populate('studentId', 'name email')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });
        return (0, response_1.sendResponse)(res, 200, allMarks, 'All marks retrieved successfully');
    }
    catch (error) {
        console.error('Get all marks error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to fetch marks');
    }
};
exports.getAllMarksController = getAllMarksController;

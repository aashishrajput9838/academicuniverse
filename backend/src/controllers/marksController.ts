import { Request, Response } from 'express';
import { sendResponse, sendError } from '../utils/response';
import Mark from '../models/Mark';

/**
 * Add marks for a student
 * POST /api/marks
 * Requires: ADD_MARKS permission
 */
export const addMarksController = async (req: any, res: Response) => {
  try {
    const { studentId, subjectId, marks } = req.body;

    // Validate required fields
    if (!studentId || !subjectId || marks === undefined) {
      return sendError(res, 400, 'studentId, subjectId, and marks are required');
    }

    // Validate marks range
    if (typeof marks !== 'number' || marks < 0 || marks > 100) {
      return sendError(res, 400, 'Marks must be a number between 0 and 100');
    }

    // Create mark record
    const mark = await Mark.create({
      studentId,
      subjectId,
      marks,
      organizationId: req.organizationId!,
      createdBy: req.user!.userId,
    });

    return sendResponse(res, 201, mark, 'Marks added successfully');
  } catch (error: any) {
    console.error('Add marks error:', error);
    return sendError(res, 500, 'Failed to add marks');
  }
};

/**
 * View marks for a student
 * GET /api/marks/:studentId
 * Requires: VIEW_MARKS permission
 */
export const getStudentMarksController = async (req: any, res: Response) => {
  try {
    const { studentId } = req.params;

    // Fetch marks for this student in this organization
    const studentMarks = await Mark.find({ studentId, organizationId: req.organizationId })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    return sendResponse(res, 200, studentMarks, 'Marks retrieved successfully');
  } catch (error: any) {
    console.error('Get marks error:', error);
    return sendError(res, 500, 'Failed to fetch marks');
  }
};

/**
 * Update marks
 * PUT /api/marks/:markId
 * Requires: EDIT_MARKS permission
 */
export const updateMarksController = async (req: any, res: Response) => {
  try {
    const { markId } = req.params;
    const { marks } = req.body;

    if (marks === undefined || typeof marks !== 'number' || marks < 0 || marks > 100) {
      return sendError(res, 400, 'Marks must be a number between 0 and 100');
    }

    const mark = await Mark.findOneAndUpdate(
      { _id: markId, organizationId: req.organizationId },
      { marks },
      { new: true }
    );

    if (!mark) {
      return sendError(res, 404, 'Mark record not found');
    }

    return sendResponse(res, 200, mark, 'Marks updated successfully');
  } catch (error: any) {
    console.error('Update marks error:', error);
    return sendError(res, 500, 'Failed to update marks');
  }
};

/**
 * Delete marks
 * DELETE /api/marks/:markId
 * Requires: DELETE_MARKS permission
 */
export const deleteMarksController = async (req: any, res: Response) => {
  try {
    const { markId } = req.params;

    const deletedMark = await Mark.findOneAndDelete({ _id: markId, organizationId: req.organizationId });

    if (!deletedMark) {
      return sendError(res, 404, 'Mark record not found');
    }

    return sendResponse(res, 200, deletedMark, 'Marks deleted successfully');
  } catch (error: any) {
    console.error('Delete marks error:', error);
    return sendError(res, 500, 'Failed to delete marks');
  }
};

/**
 * Get all marks for organization (admin only)
 * GET /api/marks
 * Requires: VIEW_ALL_MARKS permission
 */
export const getAllMarksController = async (req: any, res: Response) => {
  try {
    // Fetch all marks for this organization
    const allMarks = await Mark.find({ organizationId: req.organizationId })
      .populate('studentId', 'name email')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    return sendResponse(res, 200, allMarks, 'All marks retrieved successfully');
  } catch (error: any) {
    console.error('Get all marks error:', error);
    return sendError(res, 500, 'Failed to fetch marks');
  }
};

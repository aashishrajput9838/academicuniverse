import { Request, Response } from 'express';
import { sendResponse, sendError } from '../utils/response';
import { AuthenticatedRequest } from '../utils/jwt';

// In-memory marks storage (replace with MongoDB model in production)
interface Mark {
  id: string;
  studentId: string;
  subjectId: string;
  marks: number;
  organizationId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

let marksDB: Mark[] = [];
let markIdCounter = 1;

/**
 * Add marks for a student
 * POST /api/marks
 * Requires: ADD_MARKS permission
 */
export const addMarksController = async (req: AuthenticatedRequest, res: Response) => {
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
    const mark: Mark = {
      id: `mark_${markIdCounter++}`,
      studentId,
      subjectId,
      marks,
      organizationId: req.organizationId!,
      createdBy: req.user!.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    marksDB.push(mark);

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
export const getStudentMarksController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { studentId } = req.params;

    // Fetch marks for this student in this organization
    const studentMarks = marksDB.filter(
      m => m.studentId === studentId && m.organizationId === req.organizationId
    );

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
export const updateMarksController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { markId } = req.params;
    const { marks } = req.body;

    if (marks === undefined || typeof marks !== 'number' || marks < 0 || marks > 100) {
      return sendError(res, 400, 'Marks must be a number between 0 and 100');
    }

    const mark = marksDB.find(m => m.id === markId && m.organizationId === req.organizationId);

    if (!mark) {
      return sendError(res, 404, 'Mark record not found');
    }

    mark.marks = marks;
    mark.updatedAt = new Date();

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
export const deleteMarksController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { markId } = req.params;

    const index = marksDB.findIndex(m => m.id === markId && m.organizationId === req.organizationId);

    if (index === -1) {
      return sendError(res, 404, 'Mark record not found');
    }

    const deletedMark = marksDB.splice(index, 1)[0];

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
export const getAllMarksController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Fetch all marks for this organization
    const allMarks = marksDB.filter(m => m.organizationId === req.organizationId);

    return sendResponse(res, 200, allMarks, 'All marks retrieved successfully');
  } catch (error: any) {
    console.error('Get all marks error:', error);
    return sendError(res, 500, 'Failed to fetch marks');
  }
};

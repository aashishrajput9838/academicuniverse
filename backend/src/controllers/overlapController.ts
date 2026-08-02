import { Request, Response } from 'express';
import { Logger } from '../utils/logger';
import overlapService from '../services/overlapService';

const logger = new Logger('overlapController');

interface FirebaseUserRequest extends Request {
  firebaseUser?: {
    firebaseUid: string;
    email: string;
    [key: string]: any;
  };
}

/**
 * Controller: Search students in the same organization
 * @route GET /api/overlap-engine/search-students
 * @access Private (authenticated users only)
 */
export const searchStudents = async (req: FirebaseUserRequest, res: Response) => {
  try {
    if (!req.firebaseUser?.firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const query = (req.query.q as string) || '';
    const results = await overlapService.searchStudents(query, req.firebaseUser.firebaseUid);

    return res.status(200).json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error: any) {
    logger.error('Error in searchStudents controller:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to search students'
    });
  }
};

/**
 * Controller: Calculate AI meeting recommendations for selected students
 * @route POST /api/overlap-engine/find
 * @access Private (authenticated users only)
 */
export const findStudentOverlap = async (req: FirebaseUserRequest, res: Response) => {
  try {
    if (!req.firebaseUser?.firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { studentIds } = req.body;
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'studentIds array is required'
      });
    }

    const overlapResult = await overlapService.calculateStudentOverlap(studentIds, req.firebaseUser.firebaseUid);

    return res.status(200).json({
      success: true,
      message: 'Student meeting overlap computed successfully',
      data: overlapResult
    });
  } catch (error: any) {
    logger.error('Error in findStudentOverlap controller:', error);
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Failed to compute meeting recommendations'
    });
  }
};

/**
 * Legacy Controller: Calculate overlap slots for selected sections (Legacy compatibility)
 */
export const calculateOverlapSlots = async (req: FirebaseUserRequest, res: Response) => {
  try {
    if (!req.firebaseUser?.firebaseUid) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    return res.status(200).json({
      success: true,
      message: 'Legacy section overlap endpoint replaced by student meeting planner',
      data: { overlapSlots: {} }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error processing legacy request' });
  }
};

/**
 * Legacy Controller: Get available sections (Legacy compatibility)
 */
export const getAvailableSections = async (req: FirebaseUserRequest, res: Response) => {
  try {
    return res.status(200).json({
      success: true,
      data: { sections: [], count: 0 }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch sections' });
  }
};
import { Router } from 'express';
import { Request, Response } from 'express';
import { authenticateFirebaseUser } from '../middleware/auth';
import { Logger } from '../utils/logger';

const timetableRouter = Router();
const logger = new Logger('timetableRoutes');

// Mock storage for timetable uploads (in production, this would be stored in Firebase Storage or similar)
const timetableStorage: Map<string, { fileName: string; uploadTime: string; data: Buffer }> = new Map();

/**
 * Upload timetable for a section
 * POST /api/timetable/upload
 */
timetableRouter.post(
  '/upload',
  authenticateFirebaseUser,
  async (req: Request, res: Response) => {
    try {
      const { sectionId } = req.body;
      const file = (req as any).file;

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

      // In a real implementation, you would:
      // 1. Verify user has permission to upload for this section
      // 2. Store the file in Firebase Storage or similar
      // 3. Save metadata to Firestore
      // 4. Process the timetable to extract time slots

      // For this demo, we'll just store basic info
      const uploadTime = new Date().toISOString();
      timetableStorage.set(sectionId, {
        fileName: file.originalname,
        uploadTime,
        data: file.buffer
      });

      logger.info(`Timetable uploaded for section ${sectionId}`, {
        fileName: file.originalname,
        fileSize: file.size,
        userId: (req as any).user.uid
      });

      return res.status(200).json({
        success: true,
        message: 'Timetable uploaded successfully',
        data: {
          sectionId,
          fileName: file.originalname,
          uploadTime
        }
      });

    } catch (error: any) {
      logger.error('Error uploading timetable:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload timetable',
        error: error.message
      });
    }
  }
);

/**
 * Get timetable status for a section
 * GET /api/timetable/status/:sectionId
 */
timetableRouter.get(
  '/status/:sectionId',
  authenticateFirebaseUser,
  async (req: Request, res: Response) => {
    try {
      const { sectionId } = req.params;
      
      const timetableInfo = timetableStorage.get(sectionId);
      
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

    } catch (error: any) {
      logger.error('Error fetching timetable status:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch timetable status',
        error: error.message
      });
    }
  }
);

export default timetableRouter;
import { Router } from 'express';
import { Request, Response } from 'express';
import { authenticateFirebaseUser } from '../middleware/auth';
import { Logger } from '../utils/logger';
import Timetable from '../models/Timetable';

const timetableRouter = Router();
const logger = new Logger('timetableRoutes');

/**
 * Upload timetable for a section
 * POST /api/timetable/upload
 */
timetableRouter.post(
  '/upload',
  authenticateFirebaseUser,
  async (req: any, res: Response) => {
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
      const allowedMimeTypes = [
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];

      // Also check filename as a fallback in case mimetype is octet-stream
      const isAllowedExt = file.originalname.endsWith('.pdf') ||
        file.originalname.endsWith('.xls') ||
        file.originalname.endsWith('.xlsx');

      if (!allowedMimeTypes.includes(file.mimetype) && !isAllowedExt) {
        return res.status(400).json({
          success: false,
          message: 'Only PDF and Excel files are allowed'
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
      let timetableInfo = await Timetable.findOne({ sectionId, organizationId: req.organizationId });

      if (timetableInfo) {
        // Update existing
        timetableInfo.fileName = file.originalname;
        timetableInfo.uploadTime = new Date();
        timetableInfo.uploadedBy = req.user?.userId;
        await timetableInfo.save();
      } else {
        timetableInfo = await Timetable.create({
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
  async (req: any, res: Response) => {
    try {
      const { sectionId } = req.params;

      const timetableInfo = await Timetable.findOne({ sectionId, organizationId: req.organizationId });

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
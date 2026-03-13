import { Router } from 'express';
import { Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { Logger } from '../utils/logger';
import Timetable, { IParsedSlot } from '../models/Timetable';
import multer from 'multer';
import storageService from '../services/storageService';
import { TimetableParser } from '../utils/timetableParser';

const timetableRouter = Router();
const logger = new Logger('timetableRoutes');

// Configure multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  }
});

/**
 * Upload timetable for a section
 * POST /api/timetable/upload
 */
timetableRouter.post(
  '/upload',
  authenticateUser,
  upload.single('timetable'),
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

      // Parse timetable based on file type
      let parsedData: IParsedSlot[] = [];
      try {
        if (file.originalname.endsWith('.pdf') || file.mimetype === 'application/pdf') {
          parsedData = await TimetableParser.parsePdf(file.buffer);
        } else if (file.originalname.endsWith('.xls') || file.originalname.endsWith('.xlsx') || file.mimetype.includes('excel') || file.mimetype.includes('spreadsheetml')) {
          parsedData = TimetableParser.parseExcel(file.buffer);
        }
      } catch (parseError) {
        logger.warn('Failed to parse timetable data:', parseError);
        // Continue proceeding, we will just have empty parsedData
      }

      // Upload file to Firebase Cloud Storage
      let fileUrl = '';
      try {
        fileUrl = await storageService.uploadTimetable(
          file.buffer,
          file.originalname,
          req.organizationId,
          sectionId
        );
      } catch (storageError) {
        logger.error('Resilient upload: Storage failed, continuing with metadata saving', storageError);
        // We continue even if storage fails so the parsed data is still saved
      }

      // Find existing timetable or create new
      let timetableInfo = await Timetable.findOne({ sectionId, organizationId: req.organizationId });

      if (timetableInfo) {
        // Update existing
        timetableInfo.fileName = file.originalname;
        timetableInfo.fileUrl = fileUrl;
        timetableInfo.parsedData = parsedData;
        timetableInfo.uploadTime = new Date();
        timetableInfo.uploadedBy = req.user?.userId;
        await timetableInfo.save();
      } else {
        timetableInfo = await Timetable.create({
          sectionId,
          fileName: file.originalname,
          fileUrl,
          parsedData,
          organizationId: req.organizationId,
          uploadedBy: req.user?.userId
        });
      }

      logger.info(`Timetable uploaded for section ${sectionId}`, {
        fileName: file.originalname,
        fileSize: file.size,
        parsedSlotsCount: parsedData.length,
        userId: req.user?.userId
      });

      return res.status(200).json({
        success: true,
        message: 'Timetable uploaded and processed successfully',
        data: {
          sectionId,
          fileName: timetableInfo.fileName,
          fileUrl: timetableInfo.fileUrl,
          parsedData: timetableInfo.parsedData,
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
  authenticateUser,
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
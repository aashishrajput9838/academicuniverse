import { Request, Response } from 'express';
import { UploadService } from '../services/upload-service';

const uploadService = new UploadService();

/**
 * POST /api/uaip/upload
 * Express handler for Universal Academic Intelligence Pipeline file upload
 */
export const handleUaipUpload = async (req: Request, res: Response) => {
  try {
    const authUserId = (req as any).user?.userId;
    const organizationId = (req as any).organizationId || (req as any).user?.organizationId;

    if (!authUserId || !organizationId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload: missing userId or organizationId',
      });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided',
      });
    }

    const processingId = await uploadService.uploadFile({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      userId: authUserId,
      organizationId,
    });

    return res.status(201).json({
      success: true,
      processingId,
    });
  } catch (error: any) {
    console.error('UAIP Upload Error:', error);
    const message = error.message || 'Upload failed';
    let status = 500;

    if (message.includes('File size exceeds')) {
      status = 413;
    } else if (message.includes('Unsupported file type')) {
      status = 415;
    } else if (message.includes('context is required') || message.includes('userId is required')) {
      status = 401;
    }

    return res.status(status).json({
      success: false,
      message,
    });
  }
};

import { firebaseStorage } from '../config/firebaseAdmin';
import { Logger } from '../utils/logger';
import path from 'path';

const logger = new Logger('storageService');

export class StorageService {
    /**
     * Uploads a timetable file to Firebase Cloud Storage.
     *
     * @param buffer The file buffer (from multer memoryStorage)
     * @param originalName The original file name
     * @param organizationId The organization ID
     * @param sectionId The section ID this timetable belongs to
     * @returns The public URL of the uploaded file
     */
    async uploadTimetable(
        buffer: Buffer,
        originalName: string,
        organizationId: string,
        sectionId: string
    ): Promise<string> {
        try {
            const ext = path.extname(originalName);
            // Construct a unique and organized path in the storage bucket
            const destinationPath = `organizations/${organizationId}/sections/${sectionId}/timetable_${Date.now()}${ext}`;

            const bucket = firebaseStorage.bucket();
            const file = bucket.file(destinationPath);

            logger.info(`Uploading file to ${destinationPath}`);

            await file.save(buffer, {
                metadata: {
                    contentType: this.getContentType(ext),
                    metadata: {
                        originalName,
                        organizationId,
                        sectionId,
                        uploadedAt: new Date().toISOString()
                    }
                }
            });

            // Make the file public so the frontend can display/download it
            await file.makePublic();

            return file.publicUrl();
        } catch (error) {
            logger.error('Failed to upload timetable to Storage', error);
            throw new Error('Failed to upload file to Cloud Storage');
        }
    }

    private getContentType(ext: string): string {
        switch (ext.toLowerCase()) {
            case '.pdf':
                return 'application/pdf';
            case '.xls':
                return 'application/vnd.ms-excel';
            case '.xlsx':
                return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            default:
                return 'application/octet-stream';
        }
    }
}

export default new StorageService();

import mongoose from 'mongoose';
import { StorageProvider } from './StorageProvider';
import { randomUUID as uuidv4 } from 'crypto';

let clientPromise: Promise<any> | null = null;

export async function getMongoClient(): Promise<any> {
  if (mongoose.connection.readyState === 1 && mongoose.connection.getClient()) {
    return mongoose.connection.getClient();
  }

  if (!clientPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    const { MongoClient } = require('mongodb');
    clientPromise = MongoClient.connect(uri).catch((err: any) => {
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}

export class GridFSProvider implements StorageProvider {
  private async getBucket(): Promise<any> {
    const client = await getMongoClient();
    const db = client.db();
    const mongoDriver = mongoose.mongo;
    return new mongoDriver.GridFSBucket(db as any, { bucketName: 'uaipFiles' });
  }

  async store(
    file: Buffer,
    filename: string,
    mimeType: string,
    userId: string,
    organizationId: string
  ): Promise<{ fileId: string }> {
    const { logMemoryCheckpoint } = await import('../utils/memoryLogger');
    logMemoryCheckpoint('GRIDFS_WRITE_START', { filename, mimeType, sizeBytes: file.length });

    const bucket = await this.getBucket();

    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        userId,
        organizationId,
        mimeType,
        originalName: filename,
        size: file.length,
        processingId: uuidv4(),
      },
    });

    await new Promise<void>((resolve, reject) => {
      uploadStream.on('error', (err: any) => reject(err));
      uploadStream.on('finish', () => resolve());
      uploadStream.end(file);
    });

    // The file's ObjectId is available via uploadStream.id
    const fileId = uploadStream.id.toString();
    logMemoryCheckpoint('GRIDFS_WRITE_COMPLETED', { fileId, filename });
    return { fileId };
  }

  async delete(fileId: string): Promise<void> {
    const bucket = await this.getBucket();
    const ObjectId = mongoose.mongo.ObjectId;
    const _id = new ObjectId(fileId);
    await bucket.delete(_id);
  }

  async getFile(fileId: string): Promise<Buffer> {
    const bucket = await this.getBucket();
    const ObjectId = mongoose.mongo.ObjectId;
    const _id = new ObjectId(fileId);
    const downloadStream = bucket.openDownloadStream(_id);
    const chunks: Buffer[] = [];
    return new Promise<Buffer>((resolve, reject) => {
      downloadStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      downloadStream.on('error', (err: any) => reject(err));
      downloadStream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}

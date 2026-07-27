import mongoose from 'mongoose';
import http from 'http';
import { UaipUpload } from '../backend/src/models/UaipUpload';
import { GridFSProvider } from '../backend/src/storage/GridFSProvider';

async function debugEndpoint() {
  await mongoose.connect('mongodb://localhost:27017/academic_universe');
  console.log('Connected to MongoDB');

  const upload = await UaipUpload.findOne({ status: 'SUCCESS', storageId: { $ne: null } }).sort({ createdAt: -1 });
  if (!upload) {
    console.log('No valid upload found');
    process.exit(1);
  }

  console.log('Found upload:', {
    _id: upload._id.toString(),
    processingId: upload.processingId,
    fileName: upload.fileName,
    mimeType: upload.mimeType,
    storageId: upload.storageId?.toString(),
    size: upload.size,
  });

  // Verify GridFS has the file
  const gridFs = new GridFSProvider();
  const buffer = await gridFs.getFile(upload.storageId!);
  console.log('GridFS buffer retrieved successfully. Length:', buffer.length);
  console.log('First 16 bytes (hex):', buffer.slice(0, 16).toString('hex'));

  // Test HTTP request to ports 5000, 10000, 5003
  for (const port of [5000, 10000, 5003]) {
    console.log(`\nTesting HTTP GET http://localhost:${port}/api/growth/documents/${upload.processingId}/file`);
    try {
      const res = await new Promise<{ statusCode: number; headers: any; body: Buffer }>((resolve, reject) => {
        const req = http.get(`http://localhost:${port}/api/growth/documents/${upload.processingId}/file`, (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => resolve({ statusCode: res.statusCode || 0, headers: res.headers, body: Buffer.concat(chunks) }));
        });
        req.on('error', reject);
        req.setTimeout(2000, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });

      console.log(`Port ${port} Status Code:`, res.statusCode);
      console.log(`Port ${port} Content-Type:`, res.headers['content-type']);
      console.log(`Port ${port} Content-Length:`, res.headers['content-length']);
      console.log(`Port ${port} Body Length:`, res.body.length);
      if (res.statusCode !== 200) {
        console.log(`Port ${port} Response Body:`, res.body.toString('utf-8'));
      }
    } catch (err: any) {
      console.log(`Port ${port} failed:`, err.message);
    }
  }

  await mongoose.disconnect();
  process.exit(0);
}

debugEndpoint();

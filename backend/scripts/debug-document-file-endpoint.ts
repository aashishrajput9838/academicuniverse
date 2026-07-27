import dotenv from 'dotenv';
dotenv.config({ path: '.env.development' });
import mongoose from 'mongoose';
import http from 'http';
import jwt from 'jsonwebtoken';
import { UaipUpload } from '../src/models/UaipUpload';
import { GridFSProvider } from '../src/storage/GridFSProvider';

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
    organizationId: upload.organizationId?.toString(),
  });

  // Generate valid test JWT token
  const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';
  const token = jwt.sign(
    { userId: '6a58b65d816b680ebffb8b89', role: 'STUDENT', organizationId: upload.organizationId?.toString() || '6a58b59aa8c379340d290b31' },
    secret,
    { expiresIn: '1h' }
  );

  // Test HTTP request with Auth Header to port 5003 and 10000
  for (const port of [5003, 10000, 5000]) {
    console.log(`\nTesting Authenticated HTTP GET http://localhost:${port}/api/growth/documents/${upload.processingId}/file`);
    try {
      const res = await new Promise<{ statusCode: number; headers: any; body: Buffer }>((resolve, reject) => {
        const options = {
          hostname: 'localhost',
          port: port,
          path: `/api/growth/documents/${upload.processingId}/file`,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        };
        const req = http.request(options, (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => resolve({ statusCode: res.statusCode || 0, headers: res.headers, body: Buffer.concat(chunks) }));
        });
        req.on('error', reject);
        req.setTimeout(3000, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
        req.end();
      });

      console.log(`Port ${port} Status Code:`, res.statusCode);
      console.log(`Port ${port} Content-Type:`, res.headers['content-type']);
      console.log(`Port ${port} Content-Length:`, res.headers['content-length']);
      console.log(`Port ${port} Body Length:`, res.body.length);
      console.log(`Port ${port} First 16 Bytes (hex):`, res.body.slice(0, 16).toString('hex'));
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

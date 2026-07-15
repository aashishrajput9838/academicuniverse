// verifyRuntime.ts - runtime verification for Module-2 parsers and Module-3 OCR
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables before importing services.
const envPath = process.env.NODE_ENV === 'production' ? '.env' : '.env.development';
dotenv.config({ path: path.resolve(__dirname, envPath) });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
}

import { connectDB } from './src/config/database';
import { ParserFactory } from './src/services/parsing/ParserFactory';
import { eventBus } from './src/events/EventBus';
import { UaipEvent, UaipEventPayload } from './src/events/UaipEvents';
import { GridFSProvider } from './src/storage/GridFSProvider';
import { OCRFactory } from './src/services/ocr/OCRFactory';
import { MongoOcrIdempotencyRepository } from './src/services/ocr/repositories/MongoOcrIdempotencyRepository';
import './src/services/ocr';

type RuntimeCase = {
  label: string;
  processingId: string;
  strategy: string;
  filePath: string;
  mimeType: string;
  isScanned: boolean;
  storageId?: string;
  expectOcrExecution: boolean;
  expectedOutcome: 'OCRCompleted' | 'OCR skipped';
};

const runId = `runtime-${Date.now()}`;
const tempDir = path.resolve('tmp', `runtime-verification-${runId}`);
const tempFiles: string[] = [];
const gridFsFiles: string[] = [];
const ocrExecutionCounts = new Map<string, number>();
const ocrCompletedCounts = new Map<string, number>();
const ocrFailedCounts = new Map<string, number>();
let activeProcessingId = '';

const originalProvider = OCRFactory.getProvider('TESSERACT');
OCRFactory.registerProvider('TESSERACT', {
  async process(storageId: string, mimeType: string): Promise<string> {
    const processingId = activeProcessingId || `storage:${storageId}`;
    const nextCount = (ocrExecutionCounts.get(processingId) ?? 0) + 1;
    ocrExecutionCounts.set(processingId, nextCount);
    console.log(
      `[Verifier][OCRExecution] processingId=${processingId} storageId=${storageId} mimeType=${mimeType} executionCount=${nextCount}`
    );
    return originalProvider.process(storageId, mimeType);
  },
});

function ensureTempDir(): void {
  fs.mkdirSync(tempDir, { recursive: true });
}

function writeTempFile(fileName: string, buffer: Buffer | string): string {
  ensureTempDir();
  const filePath = path.join(tempDir, fileName);
  fs.writeFileSync(filePath, buffer);
  tempFiles.push(filePath);
  console.log(`[Verifier][Temp] CREATED ${filePath}`);
  return filePath;
}

async function runParserCase(testCase: RuntimeCase, idempotencyRepo: MongoOcrIdempotencyRepository): Promise<UaipEventPayload> {
  const buffer = fs.readFileSync(testCase.filePath);
  const parser = ParserFactory.getParser(testCase.strategy);
  const rawContent = await parser.parse(buffer);
  const idempotencyBefore = await idempotencyRepo.has(testCase.processingId);
  const payload: UaipEventPayload = {
    processingId: testCase.processingId,
    parserStrategy: testCase.strategy,
    rawContent,
    mimeType: testCase.mimeType,
    fileName: path.basename(testCase.filePath),
    fileSize: buffer.length,
    timestamp: new Date(),
    storageId: testCase.storageId,
    isScanned: testCase.isScanned,
  };

  console.log(
    `[Verifier][MongoIdempotency] before processingId=${testCase.processingId} exists=${idempotencyBefore}`
  );

  activeProcessingId = testCase.processingId;
  try {
    await eventBus.publish(UaipEvent.Parsed, payload);
  } finally {
    activeProcessingId = '';
  }

  const executionCount = ocrExecutionCounts.get(testCase.processingId) ?? 0;
  const completedCount = ocrCompletedCounts.get(testCase.processingId) ?? 0;
  const failedCount = ocrFailedCounts.get(testCase.processingId) ?? 0;
  const expectedCompletedCount = testCase.expectOcrExecution ? 1 : 0;
  const idempotencyAfter = await idempotencyRepo.has(testCase.processingId);
  const parserPreview = rawContent.slice(0, 100).replace(/\s+/g, ' ');

  console.log(
    `[Verifier][MongoIdempotency] after processingId=${testCase.processingId} exists=${idempotencyAfter}`
  );
  console.log(
    `[Verifier][Case] ${testCase.label} -> ${testCase.expectedOutcome}; processingId=${testCase.processingId}; ocrExecutions=${executionCount}; OCRCompletedEvents=${completedCount}; OCRFailedEvents=${failedCount}; rawPreview="${parserPreview}"`
  );

  if (testCase.expectOcrExecution && executionCount !== 1) {
    throw new Error(`${testCase.label} expected exactly one OCR execution, got ${executionCount}`);
  }
  if (!testCase.expectOcrExecution && executionCount !== 0) {
    throw new Error(`${testCase.label} expected OCR to be skipped, got ${executionCount} executions`);
  }
  if (completedCount !== expectedCompletedCount) {
    throw new Error(
      `${testCase.label} expected ${expectedCompletedCount} OCRCompleted event(s), got ${completedCount}`
    );
  }
  if (failedCount !== 0) {
    throw new Error(`${testCase.label} expected zero OCRFailed events, got ${failedCount}`);
  }

  return payload;
}

async function verifyDuplicateEvent(
  payload: UaipEventPayload,
  idempotencyRepo: MongoOcrIdempotencyRepository
): Promise<void> {
  const processingId = payload.processingId;
  const beforeExecutions = ocrExecutionCounts.get(processingId) ?? 0;
  const beforeCompleted = ocrCompletedCounts.get(processingId) ?? 0;
  const beforeMongo = await idempotencyRepo.has(processingId);

  activeProcessingId = processingId;
  try {
    await eventBus.publish(UaipEvent.Parsed, { ...payload, timestamp: new Date() });
  } finally {
    activeProcessingId = '';
  }

  const afterExecutions = ocrExecutionCounts.get(processingId) ?? 0;
  const afterCompleted = ocrCompletedCounts.get(processingId) ?? 0;
  const afterMongo = await idempotencyRepo.has(processingId);

  console.log(
    `[Verifier][Duplicate] processingId=${processingId}; ocrExecutionsBefore=${beforeExecutions}; ocrExecutionsAfter=${afterExecutions}; OCRCompletedBefore=${beforeCompleted}; OCRCompletedAfter=${afterCompleted}; mongoBefore=${beforeMongo}; mongoAfter=${afterMongo}`
  );

  if (beforeExecutions !== 1 || afterExecutions !== 1) {
    throw new Error(`Duplicate verification failed for ${processingId}: OCR execution count changed`);
  }
  if (beforeCompleted !== 1 || afterCompleted !== 1) {
    throw new Error(`Duplicate verification failed for ${processingId}: OCRCompleted event count changed`);
  }
  if (!beforeMongo || !afterMongo) {
    throw new Error(`Duplicate verification failed for ${processingId}: MongoDB idempotency record missing`);
  }
}

async function cleanup(
  storageProvider: GridFSProvider | undefined,
  idempotencyRepo: MongoOcrIdempotencyRepository,
  processingIds: string[]
): Promise<void> {
  if (storageProvider) {
    for (const fileId of gridFsFiles) {
      try {
        await storageProvider.delete(fileId);
        console.log(`[Verifier][GridFS] REMOVED fileId=${fileId}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`[Verifier][GridFS] REMOVE_FAILED fileId=${fileId} error=${message}`);
      }
    }
  }

  for (const processingId of processingIds) {
    try {
      await idempotencyRepo.delete(processingId);
      const existsAfterDelete = await idempotencyRepo.has(processingId);
      console.log(
        `[Verifier][MongoIdempotency] cleanup processingId=${processingId} exists=${existsAfterDelete}`
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[Verifier][MongoIdempotency] cleanup_failed processingId=${processingId} error=${message}`);
    }
  }

  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  for (const filePath of tempFiles) {
    console.log(`[Verifier][Temp] REMOVED ${filePath} removed=${!fs.existsSync(filePath)}`);
  }
}

async function main(): Promise<void> {
  console.log(`[Verifier] runId=${runId}`);
  console.log('Connecting to MongoDB database...');
  await connectDB();
  console.log('MongoDB database connected successfully.');

  eventBus.subscribe(UaipEvent.OCR_COMPLETED, (payload) => {
    const nextCount = (ocrCompletedCounts.get(payload.processingId) ?? 0) + 1;
    ocrCompletedCounts.set(payload.processingId, nextCount);
    console.log(
      `[EventBus] OCR_COMPLETED event received for: ${payload.processingId}, text length: ${(payload.ocrText ?? '').length}`
    );
  });

  eventBus.subscribe(UaipEvent.OCR_FAILED, (payload) => {
    const nextCount = (ocrFailedCounts.get(payload.processingId) ?? 0) + 1;
    ocrFailedCounts.set(payload.processingId, nextCount);
    console.error(`[EventBus] OCR_FAILED event received for: ${payload.processingId}: ${payload.ocrErrorMessage}`);
  });

  const idempotencyRepo = new MongoOcrIdempotencyRepository();
  let storageProvider: GridFSProvider | undefined;
  const processingIds: string[] = [];

  try {
    storageProvider = new GridFSProvider();
    const dummyPng = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
      0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0xda, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x4d, 0xae, 0x42, 0x60, 0x82,
    ]);
    const scannedPdf = Buffer.from('%PDF-1.4\n% scanned runtime verification stub\n%%EOF\n');
    const digitalPdf = Buffer.from('%PDF-1.4\n% digital runtime verification stub\n%%EOF\n');

    const imagePath = writeTempFile('image-runtime.png', dummyPng);
    const scannedPdfPath = writeTempFile('scanned-runtime.pdf', scannedPdf);
    const digitalPdfPath = writeTempFile('digital-runtime.pdf', digitalPdf);
    const csvPath = writeTempFile('sample-runtime.csv', 'col1,col2\nval1,val2');
    const txtPath = writeTempFile('sample-runtime.txt', 'Hello, this is a text file');
    const xlsxPath = path.join(tempDir, 'sample-runtime.xlsx');
    const xlsx = require('xlsx');
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.aoa_to_sheet([
      ['A1', 'B1'],
      ['A2', 'B2'],
    ]);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    xlsx.writeFile(workbook, xlsxPath);
    tempFiles.push(xlsxPath);
    console.log(`[Verifier][Temp] CREATED ${xlsxPath}`);

    const imageStore = await storageProvider.store(
      dummyPng,
      'image-runtime.png',
      'image/png',
      'verify-user-id',
      'verify-org-id'
    );
    gridFsFiles.push(imageStore.fileId);
    console.log(`[Verifier][GridFS] STORED label=Image fileId=${imageStore.fileId}`);

    const scannedPdfStore = await storageProvider.store(
      scannedPdf,
      'scanned-runtime.pdf',
      'application/pdf',
      'verify-user-id',
      'verify-org-id'
    );
    gridFsFiles.push(scannedPdfStore.fileId);
    console.log(`[Verifier][GridFS] STORED label=Scanned PDF fileId=${scannedPdfStore.fileId}`);

    const cases: RuntimeCase[] = [
      {
        label: 'Image',
        processingId: `${runId}-image`,
        strategy: 'IMAGE_PARSER',
        filePath: imagePath,
        mimeType: 'image/png',
        isScanned: true,
        storageId: imageStore.fileId,
        expectOcrExecution: true,
        expectedOutcome: 'OCRCompleted',
      },
      {
        label: 'Scanned PDF',
        processingId: `${runId}-scanned-pdf`,
        strategy: 'PDF_PARSER',
        filePath: scannedPdfPath,
        mimeType: 'application/pdf',
        isScanned: true,
        storageId: scannedPdfStore.fileId,
        expectOcrExecution: true,
        expectedOutcome: 'OCRCompleted',
      },
      {
        label: 'Digital PDF',
        processingId: `${runId}-digital-pdf`,
        strategy: 'PDF_PARSER',
        filePath: digitalPdfPath,
        mimeType: 'application/pdf',
        isScanned: false,
        expectOcrExecution: false,
        expectedOutcome: 'OCR skipped',
      },
      {
        label: 'CSV',
        processingId: `${runId}-csv`,
        strategy: 'CSV_PARSER',
        filePath: csvPath,
        mimeType: 'text/csv',
        isScanned: false,
        expectOcrExecution: false,
        expectedOutcome: 'OCR skipped',
      },
      {
        label: 'TXT',
        processingId: `${runId}-txt`,
        strategy: 'TXT_PARSER',
        filePath: txtPath,
        mimeType: 'text/plain',
        isScanned: false,
        expectOcrExecution: false,
        expectedOutcome: 'OCR skipped',
      },
      {
        label: 'XLSX',
        processingId: `${runId}-xlsx`,
        strategy: 'EXCEL_PARSER',
        filePath: xlsxPath,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        isScanned: false,
        expectOcrExecution: false,
        expectedOutcome: 'OCR skipped',
      },
    ];

    processingIds.push(...cases.map((testCase) => testCase.processingId));

    const payloads = new Map<string, UaipEventPayload>();
    for (const testCase of cases) {
      const payload = await runParserCase(testCase, idempotencyRepo);
      payloads.set(testCase.label, payload);
    }

    for (const label of ['Image', 'Scanned PDF']) {
      const payload = payloads.get(label);
      if (!payload) {
        throw new Error(`${label} payload missing for duplicate verification`);
      }
      await verifyDuplicateEvent(payload, idempotencyRepo);
    }

    console.log('\n=============================================');
    console.log('ALL RUNTIME VERIFICATION CHECKS PASSED');
    console.log('=============================================');
  } finally {
    await cleanup(storageProvider, idempotencyRepo, processingIds);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('Runtime verification failed:', error);
    process.exit(1);
  });

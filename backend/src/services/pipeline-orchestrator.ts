import { eventBus } from '../events/EventBus';
import { UaipEvent, UaipEventPayload } from '../events/UaipEvents';
import { UaipUpload } from '../models/UaipUpload';
import { KnowledgeRecordModel } from '../models/KnowledgeRecord';
import { GridFSProvider } from '../storage/GridFSProvider';
import { documentClassifier } from './classification/DocumentClassifier';
import { ParserService } from './parsing/ParserService';
import { UaipDocumentAiService } from '../shared/application/UaipDocumentAi.service';
import { CONFIDENCE_THRESHOLD, SEMANTIC_DOCUMENT_TYPES } from '../shared/application/uaipConfig';
import { OCRService } from './ocr/OCRService';
import './ocr';

type UploadedPayload = UaipEventPayload & {
  processingId: string;
  storageId: string;
  mimeType: string;
  fileName: string;
  fileSize: number;
};

type Classifier = typeof documentClassifier;
type ParserRunner = Pick<typeof ParserService, 'parseDocument'>;

export class PipelineOrchestrator {
  private static subscriptionInitialized = false;

  constructor(
    private readonly storageProvider = new GridFSProvider(),
    private readonly classifier: Classifier = documentClassifier,
    private readonly parserRunner: ParserRunner = ParserService,
    private readonly aiService = new UaipDocumentAiService()
  ) {
    this.initializeSubscriptions();
  }

  private initializeSubscriptions(): void {
    if (PipelineOrchestrator.subscriptionInitialized) {
      return;
    }

    eventBus.subscribe(UaipEvent.Uploaded, async (payload: UaipEventPayload) => {
      await this.processUpload(payload);
    });
    PipelineOrchestrator.subscriptionInitialized = true;
  }

  public async processUpload(payload: UaipEventPayload): Promise<void> {
    const uploaded = this.assertUploadedPayload(payload);
    const { processingId, storageId, mimeType, fileName, fileSize } = uploaded;

    try {
      const uploadDoc = await UaipUpload.findOneAndUpdate(
        { processingId, status: 'PENDING' },
        { status: 'PROCESSING', errorMessage: undefined },
        { new: true }
      );

      if (!uploadDoc) {
        console.log(`PipelineOrchestrator: Upload ${processingId} is not pending. Skipping duplicate or stale event.`);
        return;
      }

      console.log(`[Pipeline] Started processing document ${processingId}`);

      const buffer = await this.storageProvider.getFile(storageId);
      const classification = await this.classifier.classify({
        processingId,
        mime: mimeType,
        originalName: fileName,
        buffer,
      });

      await this.parserRunner.parseDocument({
        processingId,
        buffer,
        parserStrategy: classification.parserStrategy,
        mimeType,
        fileName,
        fileSize,
        storageId,
        isScanned: classification.isScanned,
      });

      const isImage = mimeType?.startsWith('image/');
      const needsOcr = isImage || classification.isScanned === true;

      if (needsOcr) {
        console.log(`[Pipeline] Waiting for OCR to complete before AI processing for ${processingId}`);
        try {
          const ocrText = await OCRService.waitForOcr(processingId);
          console.log(`[Pipeline] OCR completed for ${processingId}. Text length: ${ocrText.length} chars`);
          if (ocrText.length > 0) {
            console.log(`[Pipeline] First 1000 chars of OCR output for ${processingId}:\n${ocrText.slice(0, 1000)}`);
          }
        } catch (err: any) {
          console.warn(`[Pipeline] OCR failed or timed out for ${processingId}:`, err.message);
        }
      }

      // Determine if Stage 2 Gemini AI classification is required
      const isUnknownCategory = classification.documentCategory === 'UNKNOWN';
      const isLowConfidence = classification.confidenceScore < CONFIDENCE_THRESHOLD;
      const isSemanticDoc =
        SEMANTIC_DOCUMENT_TYPES.includes(classification.parserStrategy) ||
        SEMANTIC_DOCUMENT_TYPES.includes(mimeType);

      if (isUnknownCategory || isLowConfidence || isSemanticDoc) {
        console.log(`[Pipeline] Stage 2 AI processing required for ${processingId}`);
        await this.aiService.processDocument({
          processingId,
          fileName,
          mimeType,
          fileSize,
        });

        const updatedRecord = await KnowledgeRecordModel.findOne({ processingId });
        if (updatedRecord && (updatedRecord.documentCategory === 'MARKSHEET' || updatedRecord.documentCategory === 'TRANSCRIPT')) {
          const subjects = (updatedRecord.candidateFields as any)?.subjects;
          if (!Array.isArray(subjects) || subjects.length === 0) {
            throw new Error(`Extraction failure: ${updatedRecord.documentCategory} document has no subjects extracted`);
          }
        }
      }

      await UaipUpload.findOneAndUpdate(
        { processingId },
        { status: 'SUCCESS', completedAt: new Date(), errorMessage: undefined }
      );

      console.log(`[Pipeline] Completed processing document ${processingId}`);
    } catch (error: any) {
      console.error(`[Pipeline] Error processing document ${processingId}:`, error);

      await UaipUpload.findOneAndUpdate(
        { processingId },
        {
          status: 'FAILED',
          errorMessage: error.message || 'Unknown pipeline error',
          completedAt: new Date(),
        }
      );
    }
  }

  private assertUploadedPayload(payload: UaipEventPayload): UploadedPayload {
    if (!payload.processingId) {
      throw new Error('PipelineOrchestrator: Uploaded event missing processingId');
    }
    if (!payload.storageId) {
      throw new Error(`PipelineOrchestrator: Uploaded event missing storageId for ${payload.processingId}`);
    }
    if (!payload.mimeType) {
      throw new Error(`PipelineOrchestrator: Uploaded event missing mimeType for ${payload.processingId}`);
    }
    if (!payload.fileName) {
      throw new Error(`PipelineOrchestrator: Uploaded event missing fileName for ${payload.processingId}`);
    }
    if (typeof payload.fileSize !== 'number') {
      throw new Error(`PipelineOrchestrator: Uploaded event missing fileSize for ${payload.processingId}`);
    }

    return payload as UploadedPayload;
  }
}

export const pipelineOrchestrator = new PipelineOrchestrator();

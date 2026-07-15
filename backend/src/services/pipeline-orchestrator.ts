import { eventBus } from '../events/EventBus';
import { UaipEvent, UaipEventPayload } from '../events/UaipEvents';
import { UaipUpload } from '../models/UaipUpload';
import { GridFSProvider } from '../storage/GridFSProvider';
import { documentClassifier } from './classification/DocumentClassifier';
import { ParserService } from './parsing/ParserService';
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
    private readonly parserRunner: ParserRunner = ParserService
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

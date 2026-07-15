// src/services/parsing/ParserService.ts
import { eventBus } from '../../events/EventBus';
import { UaipEvent, UaipEventPayload } from '../../events/UaipEvents';
import { ParserFactory } from './ParserFactory';
import { IParser } from './ParserInterface';
import { logger } from '../../utils/logger';

/**
 * Service that orchestrates document parsing.
 * It receives the raw file buffer and a parser strategy identifier.
 * It uses the ParserFactory to obtain the appropriate parser, extracts raw content,
 * and publishes either a Parsed or ParseFailed event.
 */
export class ParserService {
  /**
   * Parse a document and emit the appropriate event.
   * @param params.processingId Unique id for the upload pipeline run.
   * @param params.buffer Raw file buffer from GridFS.
   * @param params.parserStrategy Strategy name provided by the classifier (e.g., 'PDF_PARSER').
   * @param params.mimeType MIME type of the original file.
   * @param params.fileName Original filename.
   * @param params.fileSize Size in bytes.
   */
  static async parseDocument(params: {
    processingId: string;
    buffer: Buffer;
    parserStrategy: string;
    mimeType: string;
    fileName: string;
    fileSize: number;
    storageId?: string;
    isScanned?: boolean;
  }): Promise<void> {
    const { processingId, buffer, parserStrategy, mimeType, fileName, fileSize, storageId, isScanned } = params;
    const timestamp = new Date();
    let parser: IParser;
    try {
      parser = ParserFactory.getParser(parserStrategy);
    } catch (e) {
      logger.error('ParserService: No parser registered', { processingId, parserStrategy, error: e });
      await eventBus.publish(UaipEvent.ParseFailed, {
        processingId,
        parserStrategy,
        errorMessage: (e as Error).message,
        timestamp,
      } as UaipEventPayload);
      return;
    }

    try {
      const rawContent = await parser.parse(buffer);
      const payload: UaipEventPayload = {
        processingId,
        parserStrategy,
        rawContent,
        mimeType,
        fileName,
        fileSize,
        timestamp,
        storageId,
        isScanned,
      };
      await eventBus.publish(UaipEvent.Parsed, payload);
    } catch (err) {
      logger.error('ParserService: Parsing failed', { processingId, parserStrategy, error: err });
      const payload: UaipEventPayload = {
        processingId,
        parserStrategy,
        errorMessage: (err as Error).message,
        timestamp,
      };
      await eventBus.publish(UaipEvent.ParseFailed, payload);
    }
  }
}

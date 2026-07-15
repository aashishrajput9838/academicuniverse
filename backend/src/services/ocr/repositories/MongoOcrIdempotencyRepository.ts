// src/services/ocr/repositories/MongoOcrIdempotencyRepository.ts
import { getMongoClient } from '../../../storage/GridFSProvider';
import { logger } from '../../../utils/logger';
import { IOcrIdempotencyRepository } from './IOcrIdempotencyRepository';

type MongoClientInstance = Awaited<ReturnType<typeof getMongoClient>>;

export class MongoOcrIdempotencyRepository implements IOcrIdempotencyRepository {
  private static readonly COLLECTION_NAME = 'ocrIdempotency';
  private clientPromise: Promise<MongoClientInstance>;

  constructor() {
    if (process.env.MONGODB_URI) {
      this.clientPromise = getMongoClient();
    } else {
      logger.warn('MongoDB URI not set; using in‑memory idempotency repository');
      const inMemoryStore = new Set<string>();
      const mockClient = {
        db: () => ({
          collection: () => ({
            findOne: async ({ processingId }: { processingId: string }) => 
              inMemoryStore.has(processingId) ? { processingId } : null,
            insertOne: async ({ processingId }: { processingId: string }) => {
              inMemoryStore.add(processingId);
            },
            deleteOne: async ({ processingId }: { processingId: string }) => {
              inMemoryStore.delete(processingId);
            },
            deleteMany: async () => {
              inMemoryStore.clear();
            }
          })
        })
      } as any;
      this.clientPromise = Promise.resolve(mockClient);
    }
  }

  private async getCollection() {
    const client = await this.clientPromise;
    return client.db().collection(MongoOcrIdempotencyRepository.COLLECTION_NAME);
  }

  async has(processingId: string): Promise<boolean> {
    const coll = await this.getCollection();
    const doc = await coll.findOne({ processingId });
    return !!doc;
  }

  async record(processingId: string): Promise<void> {
    const coll = await this.getCollection();
    try {
      await coll.insertOne({ processingId, createdAt: new Date() });
    } catch (e: any) {
      // Duplicate key error means already recorded – safe to ignore
    }
  }

  async delete(processingId: string): Promise<void> {
    const coll = await this.getCollection();
    await coll.deleteOne({ processingId });
  }

  // Helper for tests to clear the collection using the repository's clientPromise (handles fallback)
  static async clearAll(): Promise<void> {
    const repo = new MongoOcrIdempotencyRepository();
    const client = await repo.clientPromise;
    await client.db().collection(MongoOcrIdempotencyRepository.COLLECTION_NAME).deleteMany({});
  }
}

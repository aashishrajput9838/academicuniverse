/**
 * Research Repository
 * Handles all Firestore data access for research module
 */

import { firebaseFirestore } from '../../config/firebaseAdmin';
import { Logger } from '../../shared/utils';
import { ResearchDocument, ResearchHistoryItem } from './research.types';

const logger = new Logger('ResearchRepository');

export class ResearchRepository {
  private collection = 'research';

  /**
   * Find research documents by user ID
   */
  async findByUserId(userId: string, limit: number = 50): Promise<ResearchHistoryItem[]> {
    try {
      const snapshot = await firebaseFirestore
        .collection(this.collection)
        .where('userId', '==', userId)
        .orderBy('updatedAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      })) as ResearchHistoryItem[];
    } catch (error: any) {
      logger.error('Error fetching research by userId:', error);
      throw new Error(`Failed to fetch research history: ${error.message}`);
    }
  }

  /**
   * Find research document by ID
   */
  async findById(id: string): Promise<ResearchHistoryItem | null> {
    try {
      const doc = await firebaseFirestore
        .collection(this.collection)
        .doc(id)
        .get();

      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data(),
      } as ResearchHistoryItem;
    } catch (error: any) {
      logger.error('Error fetching research by id:', error);
      throw new Error(`Failed to fetch research: ${error.message}`);
    }
  }

  /**
   * Create new research document
   */
  async create(data: Omit<ResearchDocument, 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const now = new Date().toISOString();
      const document = {
        ...data,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await firebaseFirestore
        .collection(this.collection)
        .add(document);

      logger.info('Research document created', { id: docRef.id, userId: data.userId });
      return docRef.id;
    } catch (error: any) {
      logger.error('Error creating research document:', error);
      throw new Error(`Failed to create research: ${error.message}`);
    }
  }

  /**
   * Update existing research document
   */
  async update(id: string, data: Partial<ResearchDocument>): Promise<void> {
    try {
      const updateData = {
        ...data,
        updatedAt: new Date().toISOString(),
      };

      await firebaseFirestore
        .collection(this.collection)
        .doc(id)
        .update(updateData);

      logger.info('Research document updated', { id });
    } catch (error: any) {
      logger.error('Error updating research document:', error);
      throw new Error(`Failed to update research: ${error.message}`);
    }
  }

  /**
   * Delete research document
   */
  async delete(id: string): Promise<void> {
    try {
      await firebaseFirestore
        .collection(this.collection)
        .doc(id)
        .delete();

      logger.info('Research document deleted', { id });
    } catch (error: any) {
      logger.error('Error deleting research document:', error);
      throw new Error(`Failed to delete research: ${error.message}`);
    }
  }

  /**
   * Count research documents by user
   */
  async countByUserId(userId: string): Promise<number> {
    try {
      const snapshot = await firebaseFirestore
        .collection(this.collection)
        .where('userId', '==', userId)
        .count()
        .get();

      return snapshot.data().count;
    } catch (error: any) {
      logger.error('Error counting research documents:', error);
      return 0;
    }
  }
}

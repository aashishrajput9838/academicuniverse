/**
 * Academic Universe — Priority Review Queue Manager
 * Prioritizes documents needing review based on confidence, category, and review status.
 */

import { PriorityQueueItem } from '../types/annotationPlatform.types';
import { OrganizedDocumentRecord, ExtendedCategory } from '../types/datasetManager.types';

export type QueueSortOption = 'PRIORITY' | 'CONFIDENCE_ASC' | 'CONFIDENCE_DESC' | 'IMPORT_DATE' | 'CATEGORY';

export class ReviewQueueManager {
  /** Build prioritized review queue from document records */
  buildPriorityQueue(
    documents: OrganizedDocumentRecord[],
    sortBy: QueueSortOption = 'PRIORITY',
    filterCategory?: ExtendedCategory | 'ALL',
    filterConfidenceBucket?: 'ALL' | 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED'
  ): PriorityQueueItem[] {
    let items = documents.map((doc) => this.scoreDocument(doc));

    // Filter by category
    if (filterCategory && filterCategory !== 'ALL') {
      items = items.filter((item) => item.category === filterCategory);
    }

    // Filter by confidence bucket
    if (filterConfidenceBucket && filterConfidenceBucket !== 'ALL') {
      items = items.filter((item) => {
        const conf = item.classificationConfidence;
        if (filterConfidenceBucket === 'GREEN') return conf >= 0.95;
        if (filterConfidenceBucket === 'YELLOW') return conf >= 0.80 && conf < 0.95;
        if (filterConfidenceBucket === 'ORANGE') return conf >= 0.60 && conf < 0.80;
        if (filterConfidenceBucket === 'RED') return conf < 0.60;
        return true;
      });
    }

    // Sort items
    return this.sortQueue(items, sortBy);
  }

  /** Calculate scientific priority score for a document (higher score = higher review priority) */
  private scoreDocument(doc: OrganizedDocumentRecord): PriorityQueueItem {
    let score = 0;
    const reasons: string[] = [];

    // 1. Category check
    if (doc.category === 'UNKNOWN') {
      score += 50;
      reasons.push('Category is UNKNOWN — requires human categorization');
    }

    // 2. Confidence check
    if (doc.classificationConfidence < 0.60) {
      score += 40;
      reasons.push(`Low classification confidence (${(doc.classificationConfidence * 100).toFixed(0)}%)`);
    } else if (doc.classificationConfidence < 0.80) {
      score += 20;
      reasons.push(`Moderate classification confidence (${(doc.classificationConfidence * 100).toFixed(0)}%)`);
    }

    // 3. Status check
    if (doc.groundTruthStatus === 'REJECTED') {
      score += 30;
      reasons.push('Previous AI extraction was REJECTED');
    } else if (doc.groundTruthStatus === 'DRAFT') {
      score += 15;
      reasons.push('Awaiting initial verification (DRAFT)');
    }

    return {
      documentId: doc.documentId,
      originalFilename: doc.originalFilename,
      category: doc.category,
      priorityScore: score,
      priorityReasons: reasons,
      classificationConfidence: doc.classificationConfidence,
      groundTruthStatus: doc.groundTruthStatus,
      importedAt: doc.importedAt,
    };
  }

  private sortQueue(items: PriorityQueueItem[], sortBy: QueueSortOption): PriorityQueueItem[] {
    return items.sort((a, b) => {
      if (sortBy === 'PRIORITY') {
        return b.priorityScore - a.priorityScore;
      }
      if (sortBy === 'CONFIDENCE_ASC') {
        return a.classificationConfidence - b.classificationConfidence;
      }
      if (sortBy === 'CONFIDENCE_DESC') {
        return b.classificationConfidence - a.classificationConfidence;
      }
      if (sortBy === 'IMPORT_DATE') {
        return new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime();
      }
      if (sortBy === 'CATEGORY') {
        return a.category.localeCompare(b.category);
      }
      return 0;
    });
  }
}

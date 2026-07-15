/**
 * documentIntelligence.service.ts
 *
 * Business logic layer for the Document Intelligence Center.
 * Delegates data access to DocumentIntelligenceRepository.
 * Does NOT contain any raw Mongoose calls — those live in the repository.
 */

import { DocumentIntelligenceRepository } from './documentIntelligence.repository';
import type {
  DicDocumentListResponse,
  DicAnalytics,
  DicDocument,
  DicListQueryParams,
} from './documentIntelligence.types';

export class DocumentIntelligenceService {
  private readonly repo: DocumentIntelligenceRepository;

  constructor(repo?: DocumentIntelligenceRepository) {
    this.repo = repo ?? new DocumentIntelligenceRepository();
  }

  /**
   * Return a paginated, filtered list of documents for an organization.
   */
  async listDocuments(
    organizationId: string,
    params: DicListQueryParams
  ): Promise<DicDocumentListResponse> {
    return this.repo.listDocuments(organizationId, params);
  }

  /**
   * Return analytics/summary data for the organization's document corpus.
   */
  async getAnalytics(organizationId: string): Promise<DicAnalytics> {
    return this.repo.getAnalytics(organizationId);
  }

  /**
   * Return a single document's full detail, scoped by organizationId.
   * Returns null if not found or belongs to a different org.
   */
  async getDocumentDetail(
    organizationId: string,
    processingId: string
  ): Promise<DicDocument | null> {
    return this.repo.getDocumentDetail(organizationId, processingId);
  }

  /** Soft-delete an eligible non-canonical document workflow. */
  async softDeleteDocument(
    organizationId: string,
    processingId: string,
    deletedBy: string
  ) {
    return this.repo.softDeleteDocument(organizationId, processingId, deletedBy);
  }
}

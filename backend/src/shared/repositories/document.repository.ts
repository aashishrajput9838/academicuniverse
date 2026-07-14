import { DocumentModel, IDocument } from '../../models/Document';

export class DocumentRepository {
  async create(doc: Partial<IDocument>): Promise<IDocument> {
    const created = await DocumentModel.create(doc);
    return created;
  }

  async findById(id: string): Promise<IDocument | null> {
    return DocumentModel.findById(id);
  }

  async updateStatus(id: string, status: IDocument['status']): Promise<IDocument | null> {
    return DocumentModel.findByIdAndUpdate(id, { status }, { new: true });
  }

  async saveAIResult(id: string, aiResult: any, normalizedData: any, confidence: number, status: IDocument['status']): Promise<IDocument | null> {
    return DocumentModel.findByIdAndUpdate(
      id,
      {
        aiResult: JSON.stringify(aiResult),
        normalizedData,
        confidenceScore: confidence,
        status,
      },
      { new: true },
    );
  }
}

export interface ResumeEntity {
  type: 'person' | 'experience' | 'education' | 'skill' | 'project' | 'certification' | 'achievement' | 'language';
  confidence: number;
  sourceSection: string;
  data: Record<string, any>;
  extractedBy: 'heuristic' | 'ai';
  reviewStatus?: 'auto' | 'pending';
  mergedFrom?: string[];
}

export interface EntityExtractionOutput {
  entities: ResumeEntity[];
  strategy: 'heuristic' | 'heuristic+ai' | 'ai-only';
  aiFallbackUsed: boolean;
}

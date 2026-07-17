export interface QualityScore {
  score: number;
  isSufficient: boolean;
  reason?: string;
}

export interface IOcrQualityScorer {
  score(text: string, engine: string, pagesProcessed: number): QualityScore;
}

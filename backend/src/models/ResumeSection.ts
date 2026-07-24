export interface ResumeSection {
  title: string;
  order: number;
  startLine: number;
  endLine: number;
  rawText: string;
  entities?: any[];
  entries?: any[];
  repeatable?: boolean;
}

export interface SectionDetectionOutput {
  sections: ResumeSection[];
  strategy: 'heuristic' | 'heuristic+ai' | 'ai-only';
  aiFallbackUsed: boolean;
}

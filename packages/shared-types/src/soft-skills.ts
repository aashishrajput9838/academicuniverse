export interface VocabularySuggestion {
  original: string;
  suggested: string;
  reason: string;
}

export interface AnalysisData {
  id?: string;
  originalSentence: string;
  correctedSentence: string;
  improvedSentence: string;
  professionalVersion?: string;
  fluencyScore: number;
  overallScore?: number;
  grammarScore?: number;
  vocabularyScore?: number;
  confidenceScore?: number;
  professionalToneScore?: number;
  clarityScore?: number;
  shortTip: string;
  pronunciationFeedback?: string;
  grammarMistakes?: string[];
  vocabularySuggestions?: VocabularySuggestion[];
  speakingTips?: string[];
  confidenceTips?: string[];
  practiceRecommendation?: string;
  aiRecommendations?: string[];
  practiceMode?: string;
  topic?: string;
  createdAt?: string;
}

export interface ChallengeItem {
  prompt: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  timeEstimate: string;
  skillFocus: string;
  category: string;
}

export interface PracticeMode {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  targetFocus: string;
}

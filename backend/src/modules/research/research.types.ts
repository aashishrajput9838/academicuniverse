/**
 * Research Module Type Definitions
 */

// Data Transfer Objects
export interface GenerateTopicsDTO {
  domain: string;
}

export interface GenerateOutlineDTO {
  topic: string;
}

export interface ImproveContentDTO {
  text: string;
}

export interface GenerateAbstractDTO {
  content: string;
}

export interface GenerateCitationsDTO {
  details: string;
}

export interface SaveResearchDTO {
  id?: string;
  topic: string;
  outline?: any[];
  content?: Record<string, any>;
  abstract?: string;
  citations?: any[];
}

// Response Types
export interface ResearchTopicResponse {
  topics: string[];
}

export interface ResearchOutlineResponse {
  outline: Array<{
    title: string;
    points: string[];
  }>;
}

export interface ImprovedContentResponse {
  improvedText: string;
}

export interface AbstractResponse {
  abstract: string;
}

export interface CitationsResponse {
  citations: {
    apa: string;
    mla: string;
    ieee: string;
  };
}

export interface ResearchHistoryItem {
  id: string;
  userId: string;
  topic: string;
  outline: any[];
  content: Record<string, any>;
  abstract: string;
  citations: any[];
  createdAt: string;
  updatedAt: string;
}

export interface ResearchHistoryResponse {
  history: ResearchHistoryItem[];
}

// Firestore Document Type
export interface ResearchDocument {
  id?: string;
  userId: string;
  topic: string;
  outline: any[];
  content: Record<string, any>;
  abstract: string;
  citations: any[];
  createdAt: string;
  updatedAt: string;
}

import { IssueCategory, IssueDifficulty, IssueStatus } from '../../models/CodeArenaIssue';

export interface CreateIssueDTO {
  title: string;
  description: string;
  expectedOutput?: string;
  currentOutput?: string;
  errorLogs?: string;
  category: IssueCategory;
  difficulty?: IssueDifficulty;
  tags?: string[];
  programmingLanguage?: string;
  framework?: string;
  techStack?: string[];
  projectType?: string;
  rewardAmount: number;
  deadline?: string | Date;
  githubRepo?: string;
  externalLinks?: string[];
  attachments?: {
    storageId: string;
    fileName: string;
    mimeType: string;
    size: number;
  }[];
}

export interface UpdateIssueDTO {
  title?: string;
  description?: string;
  expectedOutput?: string;
  currentOutput?: string;
  errorLogs?: string;
  category?: IssueCategory;
  difficulty?: IssueDifficulty;
  tags?: string[];
  programmingLanguage?: string;
  framework?: string;
  techStack?: string[];
  projectType?: string;
  deadline?: string | Date;
  githubRepo?: string;
  externalLinks?: string[];
}

export interface SubmitSolutionDTO {
  explanation: string;
  codeSnippets?: string[];
  githubCommitUrl?: string;
  githubPrUrl?: string;
  references?: string[];
  attachments?: {
    storageId: string;
    fileName: string;
    mimeType: string;
    size: number;
  }[];
}

export interface IssueFilterQuery {
  category?: string;
  status?: IssueStatus;
  difficulty?: IssueDifficulty;
  search?: string;
  tags?: string | string[];
  posterId?: string;
  solverId?: string;
  myIssuesOnly?: boolean;
  mySolutionsOnly?: boolean;
  savedOnly?: boolean;
  sortBy?: 'rewardAmount' | 'createdAt' | 'viewCount' | 'solutionCount';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface DepositCreditsDTO {
  amount: number;
  paymentReference?: string;
  description?: string;
}

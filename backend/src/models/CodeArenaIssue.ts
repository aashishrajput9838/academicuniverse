import { Schema, model, Document, Types } from 'mongoose';

// ──────────────────────────────────────────────
// Enums & types
// ──────────────────────────────────────────────

export const ISSUE_CATEGORIES = [
  'Frontend', 'Backend', 'Full Stack', 'Java', 'Python', 'C++',
  'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Express',
  'Spring Boot', 'Android', 'Flutter', 'AI', 'Machine Learning',
  'Data Science', 'Docker', 'DevOps', 'Cloud', 'MongoDB', 'MySQL',
  'PostgreSQL', 'Firebase', 'Git', 'Cyber Security', 'Blockchain',
  'Research', 'Other',
] as const;

export type IssueCategory = typeof ISSUE_CATEGORIES[number];

export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'SOLVED' | 'CLOSED' | 'CANCELLED';
export type IssueDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
export type EscrowStatus = 'PENDING' | 'LOCKED' | 'RELEASED' | 'REFUNDED';

export interface IIssueAttachment {
  storageId: string;   // GridFS ObjectId string
  fileName: string;
  mimeType: string;
  size: number;
}

export interface IIssueAISuggestions {
  detectedTechnologies: string[];
  generatedTags: string[];
  estimatedDifficulty: IssueDifficulty;
  estimatedSolvingTimeHours: number;
  suggestedRootCauses: string[];
  processedAt: Date;
}

// ──────────────────────────────────────────────
// Interface
// ──────────────────────────────────────────────

export interface ICodeArenaIssue extends Document {
  _id: Types.ObjectId;

  // Tenant isolation — required on every document
  organizationId: Types.ObjectId;

  // Future-proofing: visibility flag to support cross-org Global Marketplace
  // Default is 'ORG_ONLY'. Setting to 'GLOBAL' will allow cross-org browsing
  // without requiring schema changes. The service layer enforces the current org-only policy.
  visibility: 'ORG_ONLY' | 'GLOBAL';

  // Poster
  posterId: string;       // User._id string (from JWT)
  posterName: string;     // denormalized for display

  // Content
  title: string;
  description: string;    // markdown
  expectedOutput?: string;
  currentOutput?: string;
  errorLogs?: string;

  // Classification
  category: IssueCategory;
  difficulty: IssueDifficulty;
  tags: string[];
  programmingLanguage?: string;
  framework?: string;
  techStack: string[];
  projectType?: string;

  // Workflow
  status: IssueStatus;
  deadline?: Date;

  // Reward & Escrow
  rewardAmount: number;   // integer credits
  escrowStatus: EscrowStatus;
  escrowLockedAt?: Date;

  // Resolution
  acceptedSolutionId?: Types.ObjectId;
  solvedAt?: Date;
  solverId?: string;

  // External references
  githubRepo?: string;
  externalLinks: string[];

  // Attachments (stored in GridFS)
  attachments: IIssueAttachment[];

  // AI suggestions (optional — populated async after creation)
  aiSuggestions?: IIssueAISuggestions;

  // Denormalized counters (updated atomically with $inc)
  viewCount: number;
  solutionCount: number;

  // User interaction
  savedBy: string[];      // array of userIds who bookmarked this issue

  createdAt: Date;
  updatedAt: Date;
}

// ──────────────────────────────────────────────
// Schema
// ──────────────────────────────────────────────

const AttachmentSchema = new Schema<IIssueAttachment>(
  {
    storageId: { type: String, required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false }
);

const AISuggestionsSchema = new Schema<IIssueAISuggestions>(
  {
    detectedTechnologies: [{ type: String }],
    generatedTags: [{ type: String }],
    estimatedDifficulty: {
      type: String,
      enum: ['EASY', 'MEDIUM', 'HARD', 'EXPERT'],
    },
    estimatedSolvingTimeHours: { type: Number },
    suggestedRootCauses: [{ type: String }],
    processedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CodeArenaIssueSchema = new Schema<ICodeArenaIssue>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Organization',
      index: true,
    },
    visibility: {
      type: String,
      enum: ['ORG_ONLY', 'GLOBAL'],
      default: 'ORG_ONLY',
      index: true,
    },
    posterId: { type: String, required: true, index: true },
    posterName: { type: String, required: true },

    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 10000 },
    expectedOutput: { type: String, maxlength: 5000 },
    currentOutput: { type: String, maxlength: 5000 },
    errorLogs: { type: String, maxlength: 5000 },

    category: {
      type: String,
      required: true,
      enum: ISSUE_CATEGORIES,
    },
    difficulty: {
      type: String,
      required: true,
      enum: ['EASY', 'MEDIUM', 'HARD', 'EXPERT'],
    },
    tags: [{ type: String }],
    programmingLanguage: { type: String },
    framework: { type: String },
    techStack: [{ type: String }],
    projectType: { type: String },

    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'SOLVED', 'CLOSED', 'CANCELLED'],
      default: 'OPEN',
      index: true,
    },
    deadline: { type: Date },

    rewardAmount: { type: Number, required: true, min: 1 },
    escrowStatus: {
      type: String,
      enum: ['PENDING', 'LOCKED', 'RELEASED', 'REFUNDED'],
      default: 'PENDING',
    },
    escrowLockedAt: { type: Date },

    acceptedSolutionId: { type: Schema.Types.ObjectId, ref: 'CodeArenaSolution' },
    solvedAt: { type: Date },
    solverId: { type: String },

    githubRepo: { type: String },
    externalLinks: [{ type: String }],
    attachments: [AttachmentSchema],

    aiSuggestions: AISuggestionsSchema,

    viewCount: { type: Number, default: 0 },
    solutionCount: { type: Number, default: 0 },
    savedBy: [{ type: String }],
  } as any,
  { timestamps: true }
);

// ──────────────────────────────────────────────
// Indexes
// ──────────────────────────────────────────────

// Primary browse query: org + status + newest first
CodeArenaIssueSchema.index({ organizationId: 1, status: 1, createdAt: -1 });

// My issues
CodeArenaIssueSchema.index({ organizationId: 1, posterId: 1, createdAt: -1 });

// Issues I solved
CodeArenaIssueSchema.index({ organizationId: 1, solverId: 1, createdAt: -1 });

// Category + status filtering
CodeArenaIssueSchema.index({ organizationId: 1, category: 1, status: 1 });

// Tag search
CodeArenaIssueSchema.index({ organizationId: 1, tags: 1 });

// Reward-sorted browse
CodeArenaIssueSchema.index({ organizationId: 1, rewardAmount: -1, status: 1 });

// Full-text search
CodeArenaIssueSchema.index(
  { title: 'text', description: 'text', tags: 'text' },
  { name: 'codeArenaIssueTextSearch', weights: { title: 10, tags: 5, description: 1 } } as any
);

// Global marketplace support: visibility-based queries (no org filter)
CodeArenaIssueSchema.index({ visibility: 1, status: 1, createdAt: -1 });

export const CodeArenaIssue = model<ICodeArenaIssue>('CodeArenaIssue', CodeArenaIssueSchema);

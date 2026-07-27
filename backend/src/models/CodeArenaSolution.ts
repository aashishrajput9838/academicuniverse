import { Schema, model, Document, Types } from 'mongoose';

export interface ISolutionAttachment {
  storageId: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface ICodeArenaSolution extends Document {
  _id: Types.ObjectId;

  issueId: Types.ObjectId;       // ref: CodeArenaIssue
  organizationId: Types.ObjectId; // denormalized for org-isolation queries

  submitterId: string;     // User._id string
  submitterName: string;   // denormalized

  // Content
  explanation: string;     // markdown, required
  codeSnippets: string[];  // array of raw code blocks
  githubCommitUrl?: string;
  githubPrUrl?: string;
  references: string[];    // documentation links, SO links, etc.

  // Attachments
  attachments: ISolutionAttachment[];

  // Resolution
  isAccepted: boolean;
  acceptedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const SolutionAttachmentSchema = new Schema<ISolutionAttachment>(
  {
    storageId: { type: String, required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false }
);

const CodeArenaSolutionSchema = new Schema<ICodeArenaSolution>(
  {
    issueId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'CodeArenaIssue',
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Organization',
      index: true,
    },
    submitterId: { type: String, required: true },
    submitterName: { type: String, required: true },

    explanation: { type: String, required: true, maxlength: 20000 },
    codeSnippets: [{ type: String }],
    githubCommitUrl: { type: String },
    githubPrUrl: { type: String },
    references: [{ type: String }],

    attachments: [SolutionAttachmentSchema],

    isAccepted: { type: Boolean, default: false },
    acceptedAt: { type: Date },
  } as any,
  { timestamps: true }
);

// Prevent a user from submitting more than one solution per issue
CodeArenaSolutionSchema.index(
  { issueId: 1, submitterId: 1 },
  { unique: true, name: 'uniqueSolutionPerUserPerIssue' } as any
);

// List solutions for an issue
CodeArenaSolutionSchema.index({ issueId: 1, isAccepted: 1, createdAt: 1 });

// My submitted solutions
CodeArenaSolutionSchema.index({ organizationId: 1, submitterId: 1, createdAt: -1 });

export const CodeArenaSolution = model<ICodeArenaSolution>('CodeArenaSolution', CodeArenaSolutionSchema);

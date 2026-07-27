import { Schema, model, Document, Types } from 'mongoose';

export type ReputationBadge =
  | 'FIRST_ISSUE'       // posted first issue
  | 'FIRST_SOLVE'       // submitted first accepted solution
  | 'HELPFUL_MEMBER'    // 5+ accepted solutions
  | 'PROBLEM_SOLVER'    // 10+ accepted solutions
  | 'TOP_CONTRIBUTOR'   // 25+ accepted solutions
  | 'EXPERT_SOLVER'     // 50+ accepted solutions
  | 'COMMUNITY_PILLAR'  // 100+ accepted solutions
  | 'QUICK_RESPONDER'   // avg first solution within 2 hours
  | 'HIGH_EARNER'       // total rewards earned >= 5000 credits
  | 'ACTIVE_POSTER';    // 10+ issues posted

export interface ICodeArenaReputation extends Document {
  _id: Types.ObjectId;

  organizationId: Types.ObjectId;
  userId: string;

  totalPoints: number;      // reputation score

  // Issue stats
  issuesPosted: number;
  issuesSolved: number;     // issues where this user's solution was accepted
  issuesCancelled: number;

  // Solution stats
  solutionsSubmitted: number;
  solutionsAccepted: number;
  acceptanceRate: number;   // solutionsAccepted / solutionsSubmitted * 100 (0–100)

  // Financial summary (mirrors wallet totals for quick display)
  totalRewardsEarned: number;
  totalRewardsSpent: number;

  // Technology profile (top tags from issues and solutions)
  favoriteTechnologies: string[];

  // Badges earned
  badges: ReputationBadge[];

  createdAt: Date;
  updatedAt: Date;
}

const CodeArenaReputationSchema = new Schema<ICodeArenaReputation>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Organization',
    },
    userId: { type: String, required: true },

    totalPoints: { type: Number, default: 0 },

    issuesPosted: { type: Number, default: 0 },
    issuesSolved: { type: Number, default: 0 },
    issuesCancelled: { type: Number, default: 0 },

    solutionsSubmitted: { type: Number, default: 0 },
    solutionsAccepted: { type: Number, default: 0 },
    acceptanceRate: { type: Number, default: 0 },

    totalRewardsEarned: { type: Number, default: 0 },
    totalRewardsSpent: { type: Number, default: 0 },

    favoriteTechnologies: [{ type: String }],

    badges: [
      {
        type: String,
        enum: [
          'FIRST_ISSUE', 'FIRST_SOLVE', 'HELPFUL_MEMBER', 'PROBLEM_SOLVER',
          'TOP_CONTRIBUTOR', 'EXPERT_SOLVER', 'COMMUNITY_PILLAR',
          'QUICK_RESPONDER', 'HIGH_EARNER', 'ACTIVE_POSTER',
        ],
      },
    ],
  } as any,
  { timestamps: true }
);

// Unique reputation doc per user per org
CodeArenaReputationSchema.index(
  { organizationId: 1, userId: 1 },
  { unique: true, name: 'uniqueReputationPerUserPerOrg' } as any
);

// Leaderboard query
CodeArenaReputationSchema.index({ organizationId: 1, totalPoints: -1 });

export const CodeArenaReputation = model<ICodeArenaReputation>(
  'CodeArenaReputation',
  CodeArenaReputationSchema
);

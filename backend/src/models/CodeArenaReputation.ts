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
  | 'HIGH_EARNER'       // total AP earned >= 5000 AP
  | 'ACTIVE_POSTER'     // 10+ issues posted
  | 'STREAK_MASTER';    // 7-day streak achieved

export interface ICodeArenaReputation extends Document {
  _id: Types.ObjectId;

  organizationId: Types.ObjectId;
  userId: string;

  // Platform Currency & Economy
  arenaPoints: number;        // Available Arena Points (starts at 1000 AP)
  totalEarned: number;        // Lifetime AP earned
  totalSpent: number;         // Lifetime AP spent on issue rewards

  // Daily Check-in & Streak System
  lastDailyRewardDate?: Date; // Last date daily login reward (+5 AP) was claimed
  loginStreak: number;        // Consecutive days streak

  // Reputation & Statistics
  totalPoints: number;        // Reputation points score (for leaderboard)
  issuesPosted: number;
  issuesSolved: number;
  issuesCancelled: number;

  // Solution stats
  solutionsSubmitted: number;
  solutionsAccepted: number;
  acceptanceRate: number;     // percentage (0–100)

  // Technology profile
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

    arenaPoints: { type: Number, default: 1000, min: 0 },
    totalEarned: { type: Number, default: 1000 }, // Initial 1000 AP counts toward total earned
    totalSpent: { type: Number, default: 0, min: 0 },

    lastDailyRewardDate: { type: Date },
    loginStreak: { type: Number, default: 0 },

    totalPoints: { type: Number, default: 0 },

    issuesPosted: { type: Number, default: 0 },
    issuesSolved: { type: Number, default: 0 },
    issuesCancelled: { type: Number, default: 0 },

    solutionsSubmitted: { type: Number, default: 0 },
    solutionsAccepted: { type: Number, default: 0 },
    acceptanceRate: { type: Number, default: 0 },

    favoriteTechnologies: [{ type: String }],

    badges: [
      {
        type: String,
        enum: [
          'FIRST_ISSUE', 'FIRST_SOLVE', 'HELPFUL_MEMBER', 'PROBLEM_SOLVER',
          'TOP_CONTRIBUTOR', 'EXPERT_SOLVER', 'COMMUNITY_PILLAR',
          'QUICK_RESPONDER', 'HIGH_EARNER', 'ACTIVE_POSTER', 'STREAK_MASTER',
        ],
      },
    ],
  } as any,
  { timestamps: true }
);

// Unique reputation/points document per user per org
CodeArenaReputationSchema.index(
  { organizationId: 1, userId: 1 },
  { unique: true, name: 'uniqueReputationPerUserPerOrg' } as any
);

// Leaderboard indexes
CodeArenaReputationSchema.index({ organizationId: 1, totalEarned: -1 });
CodeArenaReputationSchema.index({ organizationId: 1, totalPoints: -1 });
CodeArenaReputationSchema.index({ organizationId: 1, solutionsAccepted: -1 });

export const CodeArenaReputation = model<ICodeArenaReputation>(
  'CodeArenaReputation',
  CodeArenaReputationSchema
);

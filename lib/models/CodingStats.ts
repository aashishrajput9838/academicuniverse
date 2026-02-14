import mongoose, { Schema, Document } from 'mongoose'

export interface ICodingStats extends Document {
  student_id: string
  leetcode_handle?: string
  codeforces_handle?: string
  github_handle?: string
  hackerrank_handle?: string
  codechef_handle?: string
  problems_solved_count: {
    leetcode: number
    codeforces: number
    hackerrank: number
    codechef: number
    total: number
  }
  difficulty_breakdown: {
    easy: number
    medium: number
    hard: number
  }
  contest_ratings: {
    leetcode_rating?: number
    codeforces_rating?: number
    codechef_rating?: number
  }
  bug_bounty_points: number
  bug_bounties_submitted: {
    title: string
    severity: 'Low' | 'Medium' | 'High' | 'Critical'
    status: 'Pending' | 'Accepted' | 'Rejected'
    points_awarded: number
    submitted_date: Date
  }[]
  languages_used: string[]
  github_stats: {
    repositories: number
    contributions: number
    stars: number
    followers: number
  }
  streak_data: {
    current_streak: number
    longest_streak: number
    last_solved_date?: Date
  }
  weekly_activity: {
    week_start: Date
    problems_solved: number
    time_spent_minutes: number
  }[]
  last_synced: Date
  created_at: Date
  updated_at: Date
}

const CodingStatsSchema = new Schema<ICodingStats>({
  student_id: {
    type: String,
    required: true,
    unique: true,
    ref: 'User'
  },
  leetcode_handle: {
    type: String,
    default: ''
  },
  codeforces_handle: {
    type: String,
    default: ''
  },
  github_handle: {
    type: String,
    default: ''
  },
  hackerrank_handle: {
    type: String,
    default: ''
  },
  codechef_handle: {
    type: String,
    default: ''
  },
  problems_solved_count: {
    leetcode: { type: Number, default: 0 },
    codeforces: { type: Number, default: 0 },
    hackerrank: { type: Number, default: 0 },
    codechef: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  difficulty_breakdown: {
    easy: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    hard: { type: Number, default: 0 }
  },
  contest_ratings: {
    leetcode_rating: { type: Number, default: null },
    codeforces_rating: { type: Number, default: null },
    codechef_rating: { type: Number, default: null }
  },
  bug_bounty_points: {
    type: Number,
    default: 0
  },
  bug_bounties_submitted: [{
    title: { type: String, required: true },
    severity: { 
      type: String, 
      enum: ['Low', 'Medium', 'High', 'Critical'],
      required: true 
    },
    status: { 
      type: String, 
      enum: ['Pending', 'Accepted', 'Rejected'],
      default: 'Pending' 
    },
    points_awarded: { type: Number, default: 0 },
    submitted_date: { type: Date, default: Date.now }
  }],
  languages_used: [{
    type: String
  }],
  github_stats: {
    repositories: { type: Number, default: 0 },
    contributions: { type: Number, default: 0 },
    stars: { type: Number, default: 0 },
    followers: { type: Number, default: 0 }
  },
  streak_data: {
    current_streak: { type: Number, default: 0 },
    longest_streak: { type: Number, default: 0 },
    last_solved_date: { type: Date, default: null }
  },
  weekly_activity: [{
    week_start: { type: Date, required: true },
    problems_solved: { type: Number, default: 0 },
    time_spent_minutes: { type: Number, default: 0 }
  }],
  last_synced: {
    type: Date,
    default: Date.now
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
})

export default mongoose.models.CodingStats || 
  mongoose.model<ICodingStats>('CodingStats', CodingStatsSchema)

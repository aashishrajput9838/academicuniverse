import mongoose, { Schema, Document } from 'mongoose'

export interface IResearchProject extends Document {
  student_id: string
  project_title: string
  abstract: string
  current_stage: 'Topic Selection' | 'Literature Review' | 'Structuring' | 'Writing' | 'Review' | 'Published'
  co_authors: string[]
  faculty_mentor_id?: string
  ai_feedback_logs: {
    timestamp: Date
    feedback_type: string
    suggestion: string
    applied: boolean
  }[]
  target_journals: string[]
  selected_journal?: string
  publication_url?: string
  publication_date?: Date
  keywords: string[]
  research_domain: string
  methodology?: string
  progress_percentage: number
  milestones: {
    name: string
    target_date: Date
    completed: boolean
    completed_date?: Date
  }[]
  created_at: Date
  updated_at: Date
}

const ResearchProjectSchema = new Schema<IResearchProject>({
  student_id: {
    type: String,
    required: true,
    ref: 'User'
  },
  project_title: {
    type: String,
    required: true
  },
  abstract: {
    type: String,
    default: ''
  },
  current_stage: {
    type: String,
    enum: ['Topic Selection', 'Literature Review', 'Structuring', 'Writing', 'Review', 'Published'],
    default: 'Topic Selection'
  },
  co_authors: [{
    type: String,
    ref: 'User'
  }],
  faculty_mentor_id: {
    type: String,
    ref: 'User',
    default: null
  },
  ai_feedback_logs: [{
    timestamp: { type: Date, default: Date.now },
    feedback_type: { type: String, required: true },
    suggestion: { type: String, required: true },
    applied: { type: Boolean, default: false }
  }],
  target_journals: [{
    type: String
  }],
  selected_journal: {
    type: String,
    default: ''
  },
  publication_url: {
    type: String,
    default: ''
  },
  publication_date: {
    type: Date,
    default: null
  },
  keywords: [{
    type: String
  }],
  research_domain: {
    type: String,
    default: ''
  },
  methodology: {
    type: String,
    default: ''
  },
  progress_percentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  milestones: [{
    name: { type: String, required: true },
    target_date: { type: Date, required: true },
    completed: { type: Boolean, default: false },
    completed_date: { type: Date, default: null }
  }],
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
})

ResearchProjectSchema.index({ student_id: 1, current_stage: 1 })

export default mongoose.models.ResearchProject || 
  mongoose.model<IResearchProject>('ResearchProject', ResearchProjectSchema)

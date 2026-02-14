import mongoose, { Schema, Document } from 'mongoose'

export interface IAchievementVerification extends Document {
  student_id: string
  type: 'Hackathon' | 'Certification' | 'Research Paper' | 'Award' | 'Internship' | 'Project'
  title: string
  description: string
  proof_url: string
  certificate_url?: string
  verification_status: 'Pending' | 'Verified' | 'Rejected'
  faculty_approver_id?: string
  verification_date?: Date
  rejection_reason?: string
  issuing_organization?: string
  achievement_date: Date
  tags: string[]
  visibility: 'Public' | 'Private' | 'Recruiters Only'
  created_at: Date
  updated_at: Date
}

const AchievementVerificationSchema = new Schema<IAchievementVerification>({
  student_id: {
    type: String,
    required: true,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['Hackathon', 'Certification', 'Research Paper', 'Award', 'Internship', 'Project'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  proof_url: {
    type: String,
    required: true
  },
  certificate_url: {
    type: String,
    default: ''
  },
  verification_status: {
    type: String,
    enum: ['Pending', 'Verified', 'Rejected'],
    default: 'Pending'
  },
  faculty_approver_id: {
    type: String,
    ref: 'User',
    default: null
  },
  verification_date: {
    type: Date,
    default: null
  },
  rejection_reason: {
    type: String,
    default: ''
  },
  issuing_organization: {
    type: String,
    default: ''
  },
  achievement_date: {
    type: Date,
    required: true
  },
  tags: [{
    type: String
  }],
  visibility: {
    type: String,
    enum: ['Public', 'Private', 'Recruiters Only'],
    default: 'Public'
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

AchievementVerificationSchema.index({ student_id: 1, verification_status: 1 })
AchievementVerificationSchema.index({ type: 1 })

export default mongoose.models.AchievementVerification || 
  mongoose.model<IAchievementVerification>('AchievementVerification', AchievementVerificationSchema)

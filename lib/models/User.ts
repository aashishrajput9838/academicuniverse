import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  user_id: string
  name: string
  email: string
  password: string
  role: 'Student' | 'Faculty' | 'Recruiter'
  verified_status: boolean
  external_links: {
    github_url?: string
    linkedin_url?: string
    portfolio_url?: string
  }
  profile_image?: string
  department?: string
  created_at: Date
  updated_at: Date
}

const UserSchema = new Schema<IUser>({
  user_id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['Student', 'Faculty', 'Recruiter'],
    required: true
  },
  verified_status: {
    type: Boolean,
    default: false
  },
  external_links: {
    github_url: { type: String, default: '' },
    linkedin_url: { type: String, default: '' },
    portfolio_url: { type: String, default: '' }
  },
  profile_image: {
    type: String,
    default: ''
  },
  department: {
    type: String,
    default: ''
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

UserSchema.pre('save', function(next) {
  this.updated_at = new Date()
  next()
})

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema)

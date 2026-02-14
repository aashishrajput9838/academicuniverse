import mongoose, { Schema, Document } from 'mongoose'

export interface IAcademicGrowthMetrics extends Document {
  student_id: string
  week_number: number
  academic_year: string
  iq_score: number
  eq_score: number
  stress_level: number
  burnout_indicator: boolean
  growth_trend_analysis: string
  cognitive_metrics: {
    logical_thinking: number
    problem_solving: number
    analytical_skills: number
    creativity: number
  }
  emotional_metrics: {
    self_awareness: number
    empathy: number
    social_skills: number
    motivation: number
  }
  ai_recommendations: string[]
  assessment_date: Date
  created_at: Date
}

const AcademicGrowthMetricsSchema = new Schema<IAcademicGrowthMetrics>({
  student_id: {
    type: String,
    required: true,
    ref: 'User'
  },
  week_number: {
    type: Number,
    required: true
  },
  academic_year: {
    type: String,
    required: true
  },
  iq_score: {
    type: Number,
    required: true,
    min: 0,
    max: 200
  },
  eq_score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  stress_level: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  burnout_indicator: {
    type: Boolean,
    default: false
  },
  growth_trend_analysis: {
    type: String,
    default: ''
  },
  cognitive_metrics: {
    logical_thinking: { type: Number, min: 0, max: 100, default: 0 },
    problem_solving: { type: Number, min: 0, max: 100, default: 0 },
    analytical_skills: { type: Number, min: 0, max: 100, default: 0 },
    creativity: { type: Number, min: 0, max: 100, default: 0 }
  },
  emotional_metrics: {
    self_awareness: { type: Number, min: 0, max: 100, default: 0 },
    empathy: { type: Number, min: 0, max: 100, default: 0 },
    social_skills: { type: Number, min: 0, max: 100, default: 0 },
    motivation: { type: Number, min: 0, max: 100, default: 0 }
  },
  ai_recommendations: [{
    type: String
  }],
  assessment_date: {
    type: Date,
    default: Date.now
  },
  created_at: {
    type: Date,
    default: Date.now
  }
})

// Compound index for efficient querying
AcademicGrowthMetricsSchema.index({ student_id: 1, week_number: 1, academic_year: 1 })

export default mongoose.models.AcademicGrowthMetrics || 
  mongoose.model<IAcademicGrowthMetrics>('AcademicGrowthMetrics', AcademicGrowthMetricsSchema)

import mongoose, { Document, Schema } from 'mongoose';

export interface IAILogAnalysis extends Document {
    errorSignature: string;
    timestamp: string;
    route: string;
    method: string;
    status: number;
    message: string;
    stackTrace?: string;
    aiAnalysis: {
        cause: string;
        fix: string;
        severity: string;
    };
    createdAt: Date;
}

const AILogAnalysisSchema = new Schema({
    errorSignature: { type: String, required: true },
    timestamp: { type: String, required: true },
    route: { type: String, required: true },
    method: { type: String, required: true },
    status: { type: Number, required: true },
    message: { type: String, required: true },
    stackTrace: { type: String },
    aiAnalysis: {
        cause: { type: String, required: true },
        fix: { type: String, required: true },
        severity: { type: String, required: true, enum: ['low', 'medium', 'high'] }
    },
    // Auto purge old logs after 30 days to save database space
    createdAt: { type: Date, default: Date.now, expires: '30d' } 
});

export default mongoose.model<IAILogAnalysis>('AILogAnalysis', AILogAnalysisSchema);

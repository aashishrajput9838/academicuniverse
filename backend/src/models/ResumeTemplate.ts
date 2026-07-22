import mongoose, { Schema, Document } from 'mongoose';

export interface IResumeTemplate extends Document {
    templateName: string;
    type: string;
    target: string;
    fileUrl: string;
    organizationId: mongoose.Types.ObjectId;
    uploadedBy: mongoose.Types.ObjectId;
    questions: {
        tag: string;
        question: string;
        type: 'text' | 'textarea';
        aiEnhanceable: boolean;
    }[];
    createdAt: Date;
    updatedAt: Date;
    originalFileUrl?: string;
    sections?: ITemplateSection[];
    formattingMetadata?: {
        styles: Record<string, any>;
        headingLevels: Record<string, number>;
        bulletMarker: string;
        dateFormat: string;
    };
    confidence?: number;
    reviewed?: boolean;
    reviewNotes?: string;
}

export interface ITemplateSection {
    id: string;
    title: string;
    order: number;
    repeatable: boolean;
    maxEntries?: number;
    minEntries?: number;
    fields: ITemplateField[];
    aiPrompt?: string;
}

export interface ITemplateField {
    key: string;
    label: string;
    type: 'text' | 'textarea' | 'date' | 'email' | 'phone' | 'url' | 'select' | 'list';
    required: boolean;
    aiEnhanceable: boolean;
    placeholder?: string;
    validation?: {
        pattern?: string;
        minLength?: number;
        maxLength?: number;
    };
    options?: string[];
}

const ResumeTemplateSchema = new Schema<IResumeTemplate>(
    {
        templateName: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ['section', 'department', 'global'],
            required: true,
        },
        target: {
            type: String,
            trim: true,
            default: '',
        },
        fileUrl: {
            type: String,
            required: true,
        },
        organizationId: {
            type: Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
            index: true,
        },
        uploadedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        questions: [{
            tag: { type: String, required: true },
            question: { type: String, required: true },
            type: { type: String, enum: ['text', 'textarea'], default: 'text' },
            aiEnhanceable: { type: Boolean, default: false }
        }],
        originalFileUrl: {
            type: String,
            required: false,
        },
        sections: [{
            id: String,
            title: String,
            order: Number,
            repeatable: Boolean,
            maxEntries: Number,
            minEntries: Number,
            fields: [{
                key: String,
                label: String,
                type: String,
                required: Boolean,
                aiEnhanceable: Boolean,
                placeholder: String,
                validation: {
                    pattern: String,
                    minLength: Number,
                    maxLength: Number
                },
                options: [String]
            }],
            aiPrompt: String
        }],
        formattingMetadata: {
            styles: Schema.Types.Mixed,
            headingLevels: Schema.Types.Mixed,
            bulletMarker: String,
            dateFormat: String
        },
        confidence: {
            type: Number,
            default: 0,
            min: 0,
            max: 1
        },
        reviewed: {
            type: Boolean,
            default: false
        },
        reviewNotes: {
            type: String,
            default: ''
        }
    } as any,
    { timestamps: true }
);

export default mongoose.model<IResumeTemplate>('ResumeTemplate', ResumeTemplateSchema);

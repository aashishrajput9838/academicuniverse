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
    processingMode?: 'auto-inject' | 'placeholder-first';
    validationStatus?: 'pending' | 'valid' | 'invalid' | 'deprecated';
    validationReport?: {
        valid: boolean;
        placeholders: {
            raw: string;
            key: string;
            location: string;
            context: string;
        }[];
        issues: {
            severity: 'info' | 'warning' | 'error';
            code: string;
            placeholder: string;
            message: string;
            suggestion?: string;
            location?: string;
        }[];
        summary: {
            total: number;
            unique: number;
            duplicates: number;
            missingRequired: string[];
            unknown: string[];
            misspelled: string[];
            reservedConflicts: string[];
        };
    };
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

const ResumeFieldSchema = new Schema<ITemplateField>(
    {
        key: { type: String, required: true },
        label: { type: String, required: true },
        type: { type: String, required: true },
        required: { type: Boolean, default: false },
        aiEnhanceable: { type: Boolean, default: false },
        placeholder: String,
        validation: {
            pattern: String,
            minLength: Number,
            maxLength: Number,
        },
        options: [String],
    },
    { _id: false }
);

const ResumeSectionSchema = new Schema<ITemplateSection>(
    {
        id: { type: String, required: true },
        title: { type: String, required: true },
        order: { type: Number, required: true },
        repeatable: { type: Boolean, default: false },
        maxEntries: Number,
        minEntries: Number,
        fields: { type: [ResumeFieldSchema], default: [] } as any,
        aiPrompt: String,
    },
    { _id: false }
);

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
        questions: [
            {
                tag: { type: String, required: true },
                question: { type: String, required: true },
                type: { type: String, enum: ['text', 'textarea'], default: 'text' },
                aiEnhanceable: { type: Boolean, default: false },
            },
        ],
        originalFileUrl: {
            type: String,
            required: false,
        },
        sections: { type: [ResumeSectionSchema], default: [] } as any,
        formattingMetadata: {
            styles: Schema.Types.Mixed,
            headingLevels: Schema.Types.Mixed,
            bulletMarker: String,
            dateFormat: String,
        },
        confidence: {
            type: Number,
            default: 0,
            min: 0,
            max: 1,
        },
        reviewed: {
            type: Boolean,
            default: false,
        },
        reviewNotes: {
            type: String,
            default: '',
        },
        processingMode: {
            type: String,
            enum: ['auto-inject', 'placeholder-first'],
            default: 'placeholder-first',
            required: true,
            index: true,
        },
        validationStatus: {
            type: String,
            enum: ['pending', 'valid', 'invalid', 'deprecated'],
            default: 'pending',
            required: true,
            index: true,
        },
        validationReport: {
            valid: { type: Boolean, default: false },
            placeholders: [
                {
                    raw: String,
                    key: String,
                    location: String,
                    context: String,
                },
            ],
            issues: [
                {
                    severity: { type: String, enum: ['info', 'warning', 'error'] },
                    code: String,
                    placeholder: String,
                    message: String,
                    suggestion: String,
                    location: String,
                },
            ],
            summary: {
                total: { type: Number, default: 0 },
                unique: { type: Number, default: 0 },
                duplicates: { type: Number, default: 0 },
                missingRequired: [String],
                unknown: [String],
                misspelled: [String],
                reservedConflicts: [String],
            },
        },
    } as any,
    { timestamps: true }
);

export default mongoose.model<IResumeTemplate>('ResumeTemplate', ResumeTemplateSchema);

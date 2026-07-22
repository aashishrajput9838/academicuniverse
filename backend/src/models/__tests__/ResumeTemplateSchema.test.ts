import mongoose from 'mongoose';
import ResumeTemplate, { ITemplateSection, ITemplateField } from '../ResumeTemplate';

describe('ResumeTemplate Schema Regression', () => {
    beforeAll(async () => {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/academic_universe';
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(mongoUri);
        }
    });

    afterAll(async () => {
        await mongoose.disconnect();
    });

    beforeEach(async () => {
        await ResumeTemplate.deleteMany({});
    });

    it('should compile sections.fields as embedded documents, not SchemaString', () => {
        const fieldsPath = ResumeTemplate.schema.path('sections.fields');
        expect(fieldsPath).toBeDefined();

        const caster = (fieldsPath as any).caster;
        expect(caster).toBeDefined();

        expect(caster.instance).not.toBe('String');
        expect(caster.constructor.name).not.toBe('SchemaString');

        const sectionSchema = (fieldsPath as any).schema;
        expect(sectionSchema).toBeDefined();
        expect(sectionSchema.path('key')).toBeDefined();
        expect(sectionSchema.path('label')).toBeDefined();
        expect(sectionSchema.path('type')).toBeDefined();
    });

    it('should create a document with fields as array of embedded documents', async () => {
        const section: ITemplateSection = {
            id: 'test-section-1',
            title: 'TestSection',
            order: 0,
            repeatable: false,
            fields: [
                {
                    key: 'name',
                    label: 'Name',
                    type: 'text',
                    required: true,
                    aiEnhanceable: true,
                },
                {
                    key: 'description',
                    label: 'Description',
                    type: 'textarea',
                    required: false,
                    aiEnhanceable: true,
                },
            ],
            aiPrompt: 'Extract test data',
        };

        const doc = new ResumeTemplate({
            templateName: 'Test Template',
            type: 'global',
            fileUrl: 'https://example.com/template.docx',
            organizationId: new mongoose.Types.ObjectId(),
            uploadedBy: new mongoose.Types.ObjectId(),
            sections: [section],
            questions: [],
        });

        await expect(doc.save()).resolves.toBeDefined();

        const found = await ResumeTemplate.findOne({ templateName: 'Test Template' });
        expect(found).toBeDefined();
        expect(found!.sections).toHaveLength(1);
        expect(found!.sections![0].fields).toHaveLength(2);
        expect(found!.sections![0].fields[0].key).toBe('name');
        expect(found!.sections![0].fields[0].label).toBe('Name');
        expect(found!.sections![0].fields[1].key).toBe('description');
    });

    it('should preserve fields with validation and options', async () => {
        const field: ITemplateField = {
            key: 'email',
            label: 'Email',
            type: 'email',
            required: true,
            aiEnhanceable: false,
            placeholder: 'Enter email',
            validation: {
                pattern: '^[^@]+@[^@]+$',
                minLength: 5,
                maxLength: 100,
            },
            options: ['opt1', 'opt2'],
        };

        const doc = new ResumeTemplate({
            templateName: 'Validation Template',
            type: 'global',
            fileUrl: 'https://example.com/template2.docx',
            organizationId: new mongoose.Types.ObjectId(),
            uploadedBy: new mongoose.Types.ObjectId(),
            sections: [
                {
                    id: 'section-1',
                    title: 'Contact',
                    order: 0,
                    repeatable: false,
                    fields: [field],
                    aiPrompt: 'Extract contact info',
                },
            ],
            questions: [],
        });

        await expect(doc.save()).resolves.toBeDefined();

        const found = await ResumeTemplate.findOne({ templateName: 'Validation Template' });
        expect(found!.sections![0].fields[0].validation).toBeDefined();
        expect(found!.sections![0].fields[0].validation!.pattern).toBe('^[^@]+@[^@]+$');
        expect(found!.sections![0].fields[0].options).toEqual(['opt1', 'opt2']);
        expect(found!.sections![0].fields[0].placeholder).toBe('Enter email');
    });
});

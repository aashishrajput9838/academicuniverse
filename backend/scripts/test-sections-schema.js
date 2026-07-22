const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  templateName: String,
  type: String,
  target: String,
  fileUrl: String,
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  questions: [{
    tag: { type: String, required: true },
    question: { type: String, required: true },
    type: { type: String, enum: ['text', 'textarea'], default: 'text' },
    aiEnhanceable: { type: Boolean, default: false }
  }],
  originalFileUrl: String,
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
    styles: mongoose.Schema.Types.Mixed,
    headingLevels: mongoose.Schema.Types.Mixed,
    bulletMarker: String,
    dateFormat: String
  },
  confidence: { type: Number, default: 0, min: 0, max: 1 },
  reviewed: { type: Boolean, default: false },
  reviewNotes: { type: String, default: '' }
}, { timestamps: true });

const Template = mongoose.model('ResumeTemplate', templateSchema);

async function test() {
  const data = {
    templateName: 'Test',
    type: 'global',
    target: '',
    fileUrl: 'https://example.com/file.docx',
    organizationId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
    uploadedBy: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
    sections: [
      {
        id: '1',
        title: 'Summary',
        order: 0,
        repeatable: false,
        maxEntries: 1,
        minEntries: 1,
        fields: [
          { key: 'text', label: 'Summary', type: 'textarea', required: true, aiEnhanceable: true }
        ],
        aiPrompt: 'Extract summary'
      }
    ],
    questions: [],
    formattingMetadata: { styles: {}, headingLevels: {}, bulletMarker: '-', dateFormat: 'YYYY-MM-DD' },
    confidence: 0.9
  };

  try {
    const doc = new Template(data);
    await doc.save();
    console.log('SUCCESS');
  } catch (err) {
    console.log('ERROR:', err.message);
  }
}

test().catch(e => console.error(e));

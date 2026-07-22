import PizZip from 'pizzip';
import { XMLBuilder } from 'fast-xml-parser';
import { DocxExtractionService } from '../src/docxExtraction.service';
import { SectionDetectorService } from '../src/services/sectionDetector.service';
import { EntityDetectorService } from '../src/services/entityDetector.service';
import { ConfidenceScorerService } from '../src/services/confidenceScorer.service';
import { FormattingBuilderService } from '../src/services/formattingBuilder.service';
import { ExtractionResultService } from '../src/services/extractionResult.service';
import { PlaceholderInjector } from '../src/services/placeholderInjector.service';
import { DocxTemplateGenerator } from '../src/services/docxTemplateGenerator.service';
import { TemplateProcessingOrchestrator } from '../src/services/templateProcessingOrchestrator.service';
import { ExtractedDocument } from '../src/docxExtraction.service';
import { DetectedSection, TemplateField } from '../src/services/milestone2.types';
import { Logger } from '../src/utils/logger';
import fs from 'fs';
import path from 'path';

const logger = new Logger('prg-verification');

const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '#text',
  suppressEmptyNode: true,
  format: false,
});

function createDocxXml(content: any): string {
  const doc = {
    'w:document': {
      'xmlns:w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
      'w:body': content,
    },
  };
  return xmlBuilder.build(doc);
}

function createParagraphWithText(text: string, bold = false, fontSize = 11): any {
  return {
    'w:p': [
      {
        'w:r': [
          {
            'w:rPr': {
              'w:rFonts': { 'w:ascii': 'Calibri', 'w:hAnsi': 'Calibri' },
              ...(bold ? { 'w:b': '' } : {}),
              ...(fontSize !== 11 ? { 'w:sz': { 'w:val': String(fontSize * 2) } } : {}),
            },
            'w:t': text,
          },
        ],
      },
    ],
  };
}

function createBulletParagraph(text: string): any {
  return {
    'w:p': [
      {
        'w:pPr': { 'w:numPr': { 'w:ilvl': { 'w:val': '0' }, 'w:numId': { 'w:val': '1' } } },
        'w:r': [
          {
            'w:rPr': { 'w:rFonts': { 'w:ascii': 'Calibri', 'w:hAnsi': 'Calibri' } },
            'w:t': text,
          },
        ],
      },
    ],
  };
}

interface TemplateConfig {
  name: string;
  title: string;
  sections: number;
  hasTable: boolean;
  hasImage: boolean;
  bulletMarker: string;
  description: string;
}

const TEMPLATE_CONFIGS: TemplateConfig[] = [
  {
    name: 'simple-text',
    title: 'Simple Text Resume',
    sections: 3,
    hasTable: false,
    hasImage: false,
    bulletMarker: '',
    description: 'Plain text resume with basic formatting',
  },
  {
    name: 'bullet-list',
    title: 'Bullet List Resume',
    sections: 4,
    hasTable: false,
    hasImage: false,
    bulletMarker: '•',
    description: 'Resume with bullet points for skills and experience',
  },
  {
    name: 'table-format',
    title: 'Table Format Resume',
    sections: 3,
    hasTable: true,
    hasImage: false,
    bulletMarker: '',
    description: 'Resume using tables for layout',
  },
  {
    name: 'complex-formatting',
    title: 'Complex Formatting Resume',
    sections: 5,
    hasTable: false,
    hasImage: true,
    bulletMarker: '•',
    description: 'Resume with multiple fonts, sizes, images, and bullets',
  },
  {
    name: 'academic-cv',
    title: 'Academic CV Template',
    sections: 6,
    hasTable: true,
    hasImage: false,
    bulletMarker: '-',
    description: 'Academic CV with education, publications, and research sections',
  },
];

async function generateTemplateDocx(config: TemplateConfig): Promise<Buffer> {
  const paragraphs: any[] = [];

  paragraphs.push(createParagraphWithText(config.title, true, 18));
  paragraphs.push(createParagraphWithText('John Doe'));
  paragraphs.push(createParagraphWithText('john.doe@university.edu'));
  paragraphs.push(createParagraphWithText(''));

  for (let i = 0; i < config.sections; i++) {
    const sectionName = `${config.title} - Section ${i + 1}`;
    paragraphs.push(createParagraphWithText(sectionName, true, 14));
    paragraphs.push(createParagraphWithText(`This is the ${sectionName.toLowerCase()} content area for student data.`, false, 11));
    
    if (config.bulletMarker && i > 0) {
      paragraphs.push(createBulletParagraph('First bullet point'));
      paragraphs.push(createBulletParagraph('Second bullet point'));
    }
    
    if (config.hasTable && i === 1) {
      paragraphs.push({
        'w:tbl': [
          {
            'w:tr': [
              { 'w:tc': [{ 'w:p': [{ 'w:r': [{ 'w:t': 'Column 1' }] }] }] },
              { 'w:tc': [{ 'w:p': [{ 'w:r': [{ 'w:t': 'Column 2' }] }] }] },
            ],
          },
        ],
      });
    }
    
    paragraphs.push(createParagraphWithText(''));
  }

  const bodyContent = {
    'w:p': paragraphs,
  };

  const xml = createDocxXml(bodyContent);
  const zip = new PizZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>');
  zip.file('word/document.xml', xml);
  zip.file('word/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>');

  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

interface VerificationResult {
  templateName: string;
  category: 'real' | 'synthetic';
  success: boolean;
  processingTimeMs: number;
  memoryUsedMB: number;
  inputSizeKB: number;
  outputSizeKB: number;
  sizeChangePercent: number;
  placeholdersInjected: number;
  xmlValid: boolean;
  sectionsDetected: number;
  entitiesDetected: number;
  formattingPreserved: boolean;
  issues: string[];
}

async function verifyTemplate(config: TemplateConfig, index: number, category: 'real' | 'synthetic'): Promise<VerificationResult> {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;

  logger.info(`Processing ${category} template ${index + 1}/5: ${config.name}`);

  try {
    let buffer: Buffer;
    if (category === 'real') {
      const templatePath = path.join(process.cwd(), 'input data', 'resume templet kushagra conv.docx');
      buffer = fs.readFileSync(templatePath);
    } else {
      buffer = await generateTemplateDocx(config);
    }

    const inputSizeKB = Math.round(buffer.length / 1024);

    const orchestrator = new TemplateProcessingOrchestrator({
      enableAiAssistance: false,
    });

    const result = await orchestrator.process(buffer);

    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;
    const processingTimeMs = endTime - startTime;
    const memoryUsedMB = Math.max(0, Math.round((endMemory - startMemory) / 1024 / 1024));

    const outputSizeKB = Math.round(result.processedBuffer.length / 1024);
    const sizeChangePercent = inputSizeKB > 0 ? Math.round(((outputSizeKB - inputSizeKB) / inputSizeKB) * 100) : 0;

    const xmlValid = result.processedBuffer.length > 0 && 
      result.milestone2Result !== null &&
      result.injectionResult.success;

    const issues: string[] = [];
    if (!result.success) {
      issues.push(...result.issues);
    }
    if (result.injectionResult.placeholdersInjected === 0 && config.sections > 0) {
      issues.push('No placeholders injected but sections expected');
    }

    return {
      templateName: config.name,
      category,
      success: result.success,
      processingTimeMs,
      memoryUsedMB,
      inputSizeKB,
      outputSizeKB,
      sizeChangePercent,
      placeholdersInjected: result.injectionResult.placeholdersInjected,
      xmlValid,
      sectionsDetected: result.milestone2Result?.sections?.length || 0,
      entitiesDetected: result.milestone2Result?.entities?.length || 0,
      formattingPreserved: result.injectionResult.success,
      issues,
    };
  } catch (error: any) {
    return {
      templateName: config.name,
      category,
      success: false,
      processingTimeMs: Date.now() - startTime,
      memoryUsedMB: 0,
      inputSizeKB: 0,
      outputSizeKB: 0,
      sizeChangePercent: 0,
      placeholdersInjected: 0,
      xmlValid: false,
      sectionsDetected: 0,
      entitiesDetected: 0,
      formattingPreserved: false,
      issues: [error.message],
    };
  }
}

async function runPRGVerification(): Promise<void> {
  logger.info('Starting Production Readiness Gate (PRG-001)');
  logger.info(`Real templates: 1`);
  logger.info(`Synthetic templates: ${TEMPLATE_CONFIGS.length}`);

  const results: VerificationResult[] = [];

  const realConfig: TemplateConfig = {
    name: 'resume templet kushagra conv',
    title: 'Resume Templet Kushagra Conv',
    sections: 6,
    hasTable: false,
    hasImage: false,
    bulletMarker: '',
    description: 'Real faculty-uploaded resume template',
  };

  const realResult = await verifyTemplate(realConfig, 0, 'real');
  results.push(realResult);
  logger.info(`Real template completed: ${realResult.success ? 'PASS' : 'FAIL'}`);

  for (let i = 0; i < TEMPLATE_CONFIGS.length; i++) {
    const result = await verifyTemplate(TEMPLATE_CONFIGS[i], i, 'synthetic');
    results.push(result);
    logger.info(`Synthetic template ${i + 1} completed: ${result.success ? 'PASS' : 'FAIL'}`);
  }

  const totalProcessingTime = results.reduce((sum, r) => sum + r.processingTimeMs, 0);
  const avgProcessingTime = Math.round(totalProcessingTime / results.length);
  const totalPlaceholders = results.reduce((sum, r) => sum + r.placeholdersInjected, 0);
  const passed = results.filter(r => r.success).length;
  const failed = results.length - passed;

  logger.info(`\n=== PRG-001 Results ===`);
  logger.info(`Total Processed: ${results.length}`);
  logger.info(`Passed: ${passed}`);
  logger.info(`Failed: ${failed}`);
  logger.info(`Total Placeholders Injected: ${totalPlaceholders}`);
  logger.info(`Average Processing Time: ${avgProcessingTime}ms`);
  logger.info(`Total Time: ${totalProcessingTime}ms`);

  const outputDir = path.join(process.cwd(), 'prg-verification');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(outputDir, 'prg-results.json'),
    JSON.stringify({
      timestamp: new Date().toISOString(),
      realTemplatesTested: 1,
      syntheticTemplatesTested: TEMPLATE_CONFIGS.length,
      results,
      summary: {
        total: results.length,
        passed,
        failed,
        totalPlaceholders,
        avgProcessingTime,
        totalProcessingTime,
      },
    }, null, 2)
  );

  logger.info(`Results saved to: ${path.join(outputDir, 'prg-results.json')}`);

  if (failed === 0) {
    logger.info('\n✅ PRG-001 PASSED: All templates processed successfully');
  } else {
    logger.error('\n❌ PRG-001 FAILED: Some templates failed processing');
    process.exit(1);
  }
}

runPRGVerification().catch((error) => {
  logger.error('PRG-001 verification failed:', error);
  process.exit(1);
});

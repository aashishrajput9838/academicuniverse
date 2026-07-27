import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import { XMLParser } from 'fast-xml-parser';
import { DocxExtractionService } from '../src/docxExtraction.service';
import { SectionDetectorService } from '../src/services/sectionDetector.service';
import { PlaceholderValidator } from '../src/services/placeholderValidator.service';
import { TemplateProcessingOrchestrator } from '../src/services/templateProcessingOrchestrator.service';

async function diagnoseTemplate2() {
  console.log('========================================================================');
  console.log('DIAGNOSTIC AUDIT: TEMPLATE 2 (TWO-COLUMN TABLE TRAVERSAL)');
  console.log('========================================================================\n');

  const filePath = path.join(__dirname, '..', 'input data', 'template2_modern_two_column.docx');
  const buffer = fs.readFileSync(filePath);

  // 1. Validation audit
  const validator = new PlaceholderValidator();
  const valResult = await validator.validate(buffer);
  console.log('--- 1. VALIDATION METRICS ---');
  console.log(`Total placeholders found during validation: ${valResult.summary.total}`);

  // 2. OpenXML Structural Audit (Raw XML Analysis)
  const zip = new PizZip(buffer);
  const docXml = zip.file('word/document.xml')?.asText() || '';
  const parser = new XMLParser({ ignoreAttributes: false, parseAttributeValue: false });
  const parsed = parser.parse(docXml);
  const body = parsed['w:document']?.['w:body'];

  let topLevelParagraphCount = 0;
  let tableCount = 0;
  let tableRowCount = 0;
  let tableCellCount = 0;
  let tableParagraphCount = 0;
  let placeholdersInTables = 0;

  if (body) {
    if (body['w:p']) {
      topLevelParagraphCount = Array.isArray(body['w:p']) ? body['w:p'].length : 1;
    }

    if (body['w:tbl']) {
      const tables = Array.isArray(body['w:tbl']) ? body['w:tbl'] : [body['w:tbl']];
      tableCount = tables.length;

      for (const tbl of tables) {
        const rows = tbl['w:tr'] ? (Array.isArray(tbl['w:tr']) ? tbl['w:tr'] : [tbl['w:tr']]) : [];
        tableRowCount += rows.length;

        for (const tr of rows) {
          const cells = tr['w:tc'] ? (Array.isArray(tr['w:tc']) ? tr['w:tc'] : [tr['w:tc']]) : [];
          tableCellCount += cells.length;

          for (const tc of cells) {
            const paras = tc['w:p'] ? (Array.isArray(tc['w:p']) ? tc['w:p'] : [tc['w:p']]) : [];
            tableParagraphCount += paras.length;

            for (const p of paras) {
              const pStr = JSON.stringify(p);
              const matches = pStr.match(/\{\{([^}]+)\}\}/g);
              if (matches) placeholdersInTables += matches.length;
            }
          }
        }
      }
    }
  }

  console.log('\n--- 2. OPENXML STRUCTURAL METRICS ---');
  console.log(`Top-level w:p count in w:body: ${topLevelParagraphCount}`);
  console.log(`w:tbl count in w:body: ${tableCount}`);
  console.log(`w:tr count in tables: ${tableRowCount}`);
  console.log(`Number of table cells scanned (w:tc): ${tableCellCount}`);
  console.log(`Paragraphs inside table cells (w:tc -> w:p): ${tableParagraphCount}`);
  console.log(`Number of placeholders found inside tables: ${placeholdersInTables}`);

  // 3. Current Extraction & Section Detector Audit
  const extractionService = new DocxExtractionService();
  const extractedDoc = await extractionService.extract(buffer);
  console.log('\n--- 3. CURRENT EXTRACTION SERVICE METRICS ---');
  console.log(`Number of paragraphs scanned by DocxExtractionService: ${extractedDoc.paragraphs.length}`);
  console.log(`Total placeholders found during extraction processing: ${extractedDoc.placeholderCount}`);

  const sectionDetector = new SectionDetectorService();
  const { sections } = sectionDetector.detect(extractedDoc);
  console.log(`Number of sections created by SectionDetector: ${sections.length}`);
  const questions = sections.flatMap(s => s.fields);
  console.log(`Number of questions generated: ${questions.length}`);
}

diagnoseTemplate2().catch(console.error);

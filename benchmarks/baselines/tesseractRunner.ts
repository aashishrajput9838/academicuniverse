/**
 * Baseline 1 — Tesseract OCR Runner (SYS-BASE-1)
 * Pure OCR extraction using Tesseract with regex-based field parsing.
 */

import { IBaselineRunner, RunnerInput, RunnerOutput } from './baselineRunner.interface';
import { ExtractionPrediction } from '../types/benchmark.types';

export class TesseractRunner implements IBaselineRunner {
  readonly systemId = 'SYS-BASE-1' as const;
  readonly displayName = 'Tesseract OCR v5.0';

  async initialize(): Promise<void> {
    // Tesseract initialization — verify binary is available
    // In production: spawn `tesseract --version` to confirm availability
  }

  async extract(input: RunnerInput): Promise<RunnerOutput> {
    const start = Date.now();

    try {
      const uploadStart = Date.now();
      // Write buffer to temp file for tesseract processing
      const uploadMs = Date.now() - uploadStart;

      const aiStart = Date.now();
      const rawText = await this.runTesseract(input.fileBuffer, input.fileFormat);
      const aiInferenceMs = Date.now() - aiStart;

      const prediction = this.parseWithRegex(rawText);

      const totalPipelineMs = Date.now() - start;

      return {
        systemId: this.systemId,
        prediction,
        primaryProvider: 'tesseract-v5',
        fallbackTriggered: false,
        fallbackProvider: null,
        latencyMs: { uploadMs, aiInferenceMs, dbStagingMs: 0, totalPipelineMs },
        rawResponse: rawText,
      };
    } catch (error: any) {
      return {
        systemId: this.systemId,
        prediction: {},
        primaryProvider: 'tesseract-v5',
        fallbackTriggered: false,
        fallbackProvider: null,
        latencyMs: { uploadMs: 0, aiInferenceMs: 0, dbStagingMs: 0, totalPipelineMs: Date.now() - start },
        errorMessage: error.message,
      };
    }
  }

  async shutdown(): Promise<void> {}

  /**
   * Execute Tesseract OCR on a file buffer.
   * Uses child_process to call the tesseract binary.
   */
  private async runTesseract(buffer: Buffer, format: string): Promise<string> {
    const { execSync } = await import('child_process');
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');

    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `bench_ocr_${Date.now()}.${format}`);
    const outputBase = path.join(tmpDir, `bench_ocr_out_${Date.now()}`);

    try {
      fs.writeFileSync(inputPath, buffer);
      try {
        execSync(`tesseract "${inputPath}" "${outputBase}" -l eng --oem 3 --psm 6`, {
          timeout: 30000,
          stdio: 'pipe',
        });
      } catch (execErr: any) {
        throw new Error(`Tesseract execution error: ${execErr.message || 'Binary not found in PATH'}`);
      }
      const outputPath = `${outputBase}.txt`;
      if (fs.existsSync(outputPath)) {
        return fs.readFileSync(outputPath, 'utf-8');
      }
      return '';
    } finally {
      // Cleanup temp files
      try { fs.unlinkSync(inputPath); } catch {}
      try { fs.unlinkSync(`${outputBase}.txt`); } catch {}
    }
  }

  /**
   * Attempt to parse structured fields from raw OCR text using regex patterns.
   */
  private parseWithRegex(text: string): ExtractionPrediction {
    const prediction: ExtractionPrediction = { rawText: text };

    // Student name — look for common label patterns
    const nameMatch = text.match(/(?:student\s*name|name\s*of\s*(?:the\s*)?student)\s*[:\-]?\s*(.+)/i);
    if (nameMatch) prediction.studentName = nameMatch[1].trim();

    // Roll number
    const rollMatch = text.match(/(?:roll\s*(?:no|number|#)|enrollment\s*(?:no|number))\s*[:\-]?\s*([A-Z0-9\-/]+)/i);
    if (rollMatch) prediction.rollNumber = rollMatch[1].trim();

    // Semester
    const semMatch = text.match(/(?:semester|sem)\s*[:\-]?\s*(\d+|[IVX]+(?:st|nd|rd|th)?)/i);
    if (semMatch) prediction.semester = semMatch[1].trim();

    // SGPA
    const sgpaMatch = text.match(/(?:SGPA|S\.G\.P\.A)\s*[:\-]?\s*(\d+\.?\d*)/i);
    if (sgpaMatch) prediction.sgpa = parseFloat(sgpaMatch[1]);

    // CGPA
    const cgpaMatch = text.match(/(?:CGPA|C\.G\.P\.A)\s*[:\-]?\s*(\d+\.?\d*)/i);
    if (cgpaMatch) prediction.cgpa = parseFloat(cgpaMatch[1]);

    // Issue date
    const dateMatch = text.match(/(?:date\s*(?:of\s*issue)?|issued?\s*on)\s*[:\-]?\s*(\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4})/i);
    if (dateMatch) prediction.issueDate = dateMatch[1].trim();

    return prediction;
  }
}

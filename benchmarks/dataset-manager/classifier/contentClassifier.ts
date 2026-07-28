/**
 * Academic Universe — Content-Based AI Classifier & Structured Field Extractor
 * Analyzes document text content to perform category prediction and extract structured fields.
 */

import { ExtendedCategory } from '../types/datasetManager.types';
import { FieldExtractionResult } from '../types/annotationPlatform.types';

export interface ContentAnalysisResult {
  category: ExtendedCategory;
  categoryConfidence: number;
  extractedFields: FieldExtractionResult[];
  rawText: string;
}

export class ContentClassifier {
  /**
   * Classify document based on text content and extract field-level metadata
   */
  analyzeContent(filename: string, contentText: string): ContentAnalysisResult {
    const text = contentText || '';
    const lowerText = text.toLowerCase();
    const lowerName = filename.toLowerCase();

    // Determine category based on content + filename
    let category: ExtendedCategory = 'UNKNOWN';
    let categoryConfidence = 0.45;

    if (
      /statement of marks|semester examination|total marks|grade card|sgpa|cgpa/i.test(text) ||
      /sem\s*\d|mark[s]?/i.test(lowerName)
    ) {
      category = 'MARKSHEET';
      categoryConfidence = /statement of marks|semester examination|sgpa/i.test(text) ? 0.98 : 0.92;
    } else if (/transcript|official academic record/i.test(text) || /transcript/i.test(lowerName)) {
      category = 'TRANSCRIPT';
      categoryConfidence = 0.96;
    } else if (/workshop|participated in workshop/i.test(text) || /workshop/i.test(lowerName)) {
      category = 'WORKSHOP_CERTIFICATE';
      categoryConfidence = 0.94;
    } else if (/internship|completion of internship/i.test(text) || /intern/i.test(lowerName)) {
      category = 'INTERNSHIP_CERTIFICATE';
      categoryConfidence = 0.95;
    } else if (/hackathon|winner|hack/i.test(text) || /hackathon/i.test(lowerName)) {
      category = 'HACKATHON_CERTIFICATE';
      categoryConfidence = 0.93;
    } else if (/certificate|certify|completion|awarded/i.test(text) || /cert|award/i.test(lowerName)) {
      category = 'CERTIFICATE';
      categoryConfidence = 0.91;
    } else if (/time\s*table|routine|class schedule/i.test(text) || /time\s*table/i.test(lowerName)) {
      category = 'TIMETABLE';
      categoryConfidence = 0.90;
    } else if (/admit card|hall ticket/i.test(text) || /admit/i.test(lowerName)) {
      category = 'ADMIT_CARD';
      categoryConfidence = 0.96;
    } else if (/fee receipt|payment receipt|tuition fee/i.test(text) || /fee/i.test(lowerName)) {
      category = 'FEE_RECEIPT';
      categoryConfidence = 0.96;
    } else if (/identity card|student id/i.test(text) || /student id|id card/i.test(lowerName)) {
      category = 'STUDENT_ID';
      categoryConfidence = 0.96;
    }

    // Extract structured fields based on category
    const extractedFields = this.extractFields(category, text, filename);

    return {
      category,
      categoryConfidence,
      extractedFields,
      rawText: text,
    };
  }

  /**
   * Extract field-level candidates with confidence ratings
   */
  private extractFields(category: ExtendedCategory, text: string, filename: string): FieldExtractionResult[] {
    const fields: FieldExtractionResult[] = [];

    // 1. Student Name — [A-Za-z ] avoids capturing \n into next field
    const nameMatch = text.match(/(?:student\s*name|name\s*of\s*(?:the\s*)?student|certify\s+that)\s*[:\-]?\s*([A-Za-z ]{3,40})/i);
    const nameVal = nameMatch ? nameMatch[1].trim() : this.inferNameFromFilename(filename);
    fields.push({
      fieldName: 'studentName',
      fieldLabel: 'Student Name',
      extractedValue: nameVal,
      currentValue: nameVal,
      confidence: nameMatch ? 0.96 : nameVal ? 0.75 : 0.40,
      isEdited: false,
      isApproved: false,
    });

    // 2. Roll / Registration Number
    const rollMatch = text.match(/(?:roll\s*(?:no|number|#)|enrollment\s*(?:no|number)|reg\s*no)\s*[:\-]?\s*([A-Z0-9\-/]+)/i);
    fields.push({
      fieldName: 'rollNumber',
      fieldLabel: 'Roll Number',
      extractedValue: rollMatch ? rollMatch[1].trim() : null,
      currentValue: rollMatch ? rollMatch[1].trim() : null,
      confidence: rollMatch ? 0.95 : 0.35,
      isEdited: false,
      isApproved: false,
    });

    // 3. Semester
    const semMatch = text.match(/(?:semester|sem)\s*[:\-]?\s*(\d+|[IVX]+)/i) || filename.match(/sem(?:ester)?[\s\-_]*(\d+)/i);
    fields.push({
      fieldName: 'semester',
      fieldLabel: 'Semester',
      extractedValue: semMatch ? semMatch[1] : null,
      currentValue: semMatch ? semMatch[1] : null,
      confidence: semMatch ? 0.92 : 0.30,
      isEdited: false,
      isApproved: false,
    });

    // 4. SGPA
    const sgpaMatch = text.match(/(?:SGPA|S\.G\.P\.A)\s*[:\-]?\s*(\d+\.?\d*)/i);
    const sgpaVal = sgpaMatch ? parseFloat(sgpaMatch[1]) : null;
    fields.push({
      fieldName: 'sgpa',
      fieldLabel: 'SGPA',
      extractedValue: sgpaVal,
      currentValue: sgpaVal,
      confidence: sgpaMatch ? 0.98 : 0.20,
      isEdited: false,
      isApproved: false,
    });

    // 5. CGPA
    const cgpaMatch = text.match(/(?:CGPA|C\.G\.P\.A)\s*[:\-]?\s*(\d+\.?\d*)/i);
    const cgpaVal = cgpaMatch ? parseFloat(cgpaMatch[1]) : null;
    fields.push({
      fieldName: 'cgpa',
      fieldLabel: 'CGPA',
      extractedValue: cgpaVal,
      currentValue: cgpaVal,
      confidence: cgpaMatch ? 0.98 : 0.20,
      isEdited: false,
      isApproved: false,
    });

    // 6. Issue Date
    const dateMatch = text.match(/(?:date\s*(?:of\s*issue)?|issued?\s*on)\s*[:\-]?\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i);
    fields.push({
      fieldName: 'issueDate',
      fieldLabel: 'Issue Date',
      extractedValue: dateMatch ? dateMatch[1] : null,
      currentValue: dateMatch ? dateMatch[1] : null,
      confidence: dateMatch ? 0.94 : 0.40,
      isEdited: false,
      isApproved: false,
    });

    // 7. Institution Name
    const instMatch = text.match(/(?:university|institute|academy|college)\s*of\s*[A-Za-z\s]{3,30}/i);
    fields.push({
      fieldName: 'institutionName',
      fieldLabel: 'Institution Name',
      extractedValue: instMatch ? instMatch[0].trim() : null,
      currentValue: instMatch ? instMatch[0].trim() : null,
      confidence: instMatch ? 0.88 : 0.30,
      isEdited: false,
      isApproved: false,
    });

    return fields;
  }

  private inferNameFromFilename(filename: string): string | null {
    // Remove extension and common document keywords, then extract capitalized name-like tokens
    const clean = filename
      .replace(/\.[^/.]+$/, '')               // strip extension
      .replace(/[_\-]/g, ' ')                 // normalize separators
      .replace(/\d{6,}/g, '')                 // strip long numeric strings (roll numbers)
      .replace(/\b(sem|semester|marks?|cert|certificate|internship|workshop|hackathon|result|grade|card|sheet|receipt|admit|fee|timetable|schedule|id)\b/gi, '')
      .trim();

    // Extract sequences of Title-Case words as probable name
    const nameMatch = clean.match(/([A-Z][a-z]+(?: [A-Z][a-z]+)+)/);
    if (nameMatch) return nameMatch[1].trim();

    return null;
  }
}

/**
 * Academic Universe — AI & Rule-Based Document Classifier
 * Classifies raw documents into granular categories with confidence scores and reasoning.
 */

import path from 'path';
import { ExtendedCategory, DocumentClassification } from '../types/datasetManager.types';

export class DocumentClassifier {
  /** Classify a document based on filename, extension, and optional text snippet */
  classify(filename: string, rawTextSnippet?: string): DocumentClassification {
    const lowerName = filename.toLowerCase();
    const text = (rawTextSnippet || '').toLowerCase();

    // 1. Marksheet
    if (
      /mark[s]?|mark\s*sheet|sem[ester\s]*\d|intermediate|cgpa|sgpa|result|\bms_\d|\bsynth_ms_/i.test(lowerName) ||
      /statement of marks|semester examination|total marks|grade card/i.test(text)
    ) {
      const isIntermediate = /intermediate|12th|hsc|senior secondary/i.test(lowerName);
      return {
        category: 'MARKSHEET',
        confidence: isIntermediate ? 0.98 : 0.95,
        reasons: ['Filename matches marksheet keyword patterns (marks, sem, grade, ms_)'],
        suggestedPrefix: 'MS',
      };
    }

    // 2. Transcript
    if (/transcript|academic\s*record|\btr_\d|\bsynth_tr_/i.test(lowerName) || /official transcript/i.test(text)) {
      return {
        category: 'TRANSCRIPT',
        confidence: 0.96,
        reasons: ['Filename contains transcript keyword'],
        suggestedPrefix: 'TR',
      };
    }

    // 3. Workshop Certificate
    if (/workshop\s*certific|\bcert_ws_|\bsynth_cert_ws_/i.test(lowerName) || /workshop on|participated in workshop/i.test(text)) {
      return {
        category: 'WORKSHOP_CERTIFICATE',
        confidence: 0.92,
        reasons: ['Matches workshop certificate pattern'],
        suggestedPrefix: 'CERT_WS',
      };
    }

    // 4. Internship Certificate
    if (/internship\s*certific|intern\s*cert|\bcert_int_|\bsynth_cert_int_/i.test(lowerName) || /internship completion/i.test(text)) {
      return {
        category: 'INTERNSHIP_CERTIFICATE',
        confidence: 0.94,
        reasons: ['Matches internship completion certificate pattern'],
        suggestedPrefix: 'CERT_INT',
      };
    }

    // 5. Hackathon Certificate
    if (/hackathon\s*certific|hack\s*cert|\bcert_hack_|\bsynth_cert_hack_/i.test(lowerName) || /hackathon winner|hackathon participant/i.test(text)) {
      return {
        category: 'HACKATHON_CERTIFICATE',
        confidence: 0.93,
        reasons: ['Matches hackathon certificate pattern'],
        suggestedPrefix: 'CERT_HACK',
      };
    }

    // 6. Generic Certificate
    if (
      /certific|completion|award|ethics|oracle|owasp|udemy|coursera|nptel|java_fundamentals|\bcert_\d|\bsynth_cert_/i.test(lowerName) ||
      /certificate of completion|successfully completed|has been awarded/i.test(text)
    ) {
      return {
        category: 'CERTIFICATE',
        confidence: 0.90,
        reasons: ['Filename matches course/skill certificate keyword (certificate, completion, award)'],
        suggestedPrefix: 'CERT',
      };
    }

    // 7. Exam Timetable vs Regular Timetable
    if (/exam[_\s]*time\s*table|date\s*sheet|exam\s*schedule|\btt_exam_|\bsynth_tt_exam_/i.test(lowerName) || /examination schedule|date sheet/i.test(text)) {
      return {
        category: 'EXAM_TIMETABLE',
        confidence: 0.91,
        reasons: ['Matches exam timetable / date sheet pattern'],
        suggestedPrefix: 'TT_EXAM',
      };
    }

    if (/time\s*table|schedule|class\s*routine|\btt_\d|\bsynth_tt_/i.test(lowerName) || /weekly schedule|class timetable/i.test(text)) {
      return {
        category: 'TIMETABLE',
        confidence: 0.90,
        reasons: ['Matches class timetable schedule pattern'],
        suggestedPrefix: 'TT',
      };
    }

    // 8. Admit Card
    if (/admit\s*card|hall\s*ticket|\badmit_\d|\bsynth_admit_/i.test(lowerName) || /admit card|hall ticket/i.test(text)) {
      return {
        category: 'ADMIT_CARD',
        confidence: 0.95,
        reasons: ['Matches admit card / hall ticket pattern'],
        suggestedPrefix: 'ADMIT',
      };
    }

    // 9. Fee Receipt
    if (/fee[_\s]*receipt|payment[_\s]*receipt|tuition\s*fee|\bfee_\d|\bsynth_fee_/i.test(lowerName) || /fee receipt|payment acknowledgement/i.test(text)) {
      return {
        category: 'FEE_RECEIPT',
        confidence: 0.95,
        reasons: ['Matches fee receipt payment pattern'],
        suggestedPrefix: 'FEE',
      };
    }

    // 10. Student ID Card
    if (/student\s*id|identity\s*card|id\s*card|\bid_\d|\bsynth_id_/i.test(lowerName) || /student identity card/i.test(text)) {
      return {
        category: 'STUDENT_ID',
        confidence: 0.95,
        reasons: ['Matches student identity card pattern'],
        suggestedPrefix: 'ID',
      };
    }

    // Default: UNKNOWN
    return {
      category: 'UNKNOWN',
      confidence: 0.40,
      reasons: ['No matching category rule found for filename'],
      suggestedPrefix: 'UNK',
    };
  }

  /** Get destination folder relative path for a given category */
  getDestinationSubfolder(category: ExtendedCategory): string {
    const map: Record<ExtendedCategory, string> = {
      MARKSHEET: 'marksheets',
      TRANSCRIPT: 'transcripts',
      CERTIFICATE: 'certificates',
      WORKSHOP_CERTIFICATE: 'certificates',
      INTERNSHIP_CERTIFICATE: 'certificates',
      HACKATHON_CERTIFICATE: 'certificates',
      TIMETABLE: 'timetables',
      EXAM_TIMETABLE: 'timetables',
      ADMIT_CARD: 'admit_cards',
      FEE_RECEIPT: 'fee_receipts',
      STUDENT_ID: 'student_id',
      UNKNOWN: 'unknown',
    };
    return map[category] || 'unknown';
  }
}

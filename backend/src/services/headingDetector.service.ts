"use strict";

import { ExtractedDocument, ExtractedParagraph, ExtractedRun } from '../docxExtraction.service';

export interface HeadingCandidate {
  index: number;
  title: string;
  paragraphIndex: number;
  runIndex?: number;
  runText: string;
  titleKey?: string;
  rawConfidence: number;
}

export interface DetectionOptions {
  enableAiAssistance: boolean;
}

const KNOWN_SECTION_KEYWORDS: Record<string, string[]> = {
  'summary': ['summary', 'objective', 'profile', 'about', 'about me'],
  'skills': ['skills', 'technical skills', 'core competencies', 'competencies'],
  'education': ['education', 'qualification', 'academic', 'academics'],
  'experience': ['experience', 'work history', 'employment', 'work experience', 'professional experience'],
  'projects': ['projects', 'publications', 'achievements'],
  'certifications': ['certifications', 'certificates', 'certification'],
  'languages': ['languages', 'hobbies', 'interests', 'references'],
};

export class HeadingDetector {
  private readonly KNOWN_SECTION_KEYWORDS = KNOWN_SECTION_KEYWORDS;

  constructor(private options: DetectionOptions = { enableAiAssistance: false }) {}

  findHeadingCandidates(document: ExtractedDocument): HeadingCandidate[] {
    const candidates: HeadingCandidate[] = [];

    for (let pIndex = 0; pIndex < document.paragraphs.length; pIndex++) {
      const paragraph = document.paragraphs[pIndex];
      const rawText = paragraph.rawText.trim();
      
      if (!rawText || rawText.length === 0) continue;
      if (paragraph.runs.length === 0) continue;

      const firstRun = paragraph.runs[0];
      const isStyledHeading = firstRun.formatting.bold && (firstRun.formatting.fontSize || 0) >= 14;
      const isAllCapsOrTitleCase = /^[A-Z][A-Z\s]+$/.test(rawText) || /^[A-Z][a-z]+(\s[A-Z][a-z]+)*$/.test(rawText);
      const hasTrailingPunctuation = /[.:;!?]$/.test(rawText);
      const isKeywordMatch = this.matchKeyword(rawText);
      const startsWithBullet = /^[•\-\*\u2022\u2023\u2043\u204c\u204d]/.test(rawText) || /^(\d+\.\s|[a-zA-Z]\.\s)/.test(rawText);

      const isHeading = !startsWithBullet && (isStyledHeading || (isKeywordMatch && !hasTrailingPunctuation) || (isAllCapsOrTitleCase && isKeywordMatch));

      if (!isHeading && !isStyledHeading) continue;

      let titleKey: string | undefined;
      let confidence = 0.5;

      if (isStyledHeading) {
        confidence = 0.8;
      }

      const keywordMatch = this.matchKeywordWithKey(rawText);
      if (keywordMatch) {
        titleKey = keywordMatch.key;
        confidence = Math.max(confidence, 0.9);
      } else if (isStyledHeading && isAllCapsOrTitleCase) {
        titleKey = this.normalizeTitle(rawText);
        confidence = Math.max(confidence, 0.6);
      }

      const title = this.cleanTitle(rawText);
      if (title.length < 2 || title.length > 100) continue;

      if (confidence >= 0.6) {
        candidates.push({
          index: candidates.length,
          title,
          paragraphIndex: pIndex,
          runIndex: firstRun.runIndex,
          runText: rawText,
          titleKey,
          rawConfidence: confidence,
        });
      }
    }

    return candidates;
  }

  isHeading(paragraph: ExtractedParagraph, document: ExtractedDocument): boolean {
    const rawText = paragraph.rawText.trim();
    
    if (!rawText || rawText.length === 0) return false;
    if (paragraph.runs.length === 0) return false;

    const firstRun = paragraph.runs[0];
    const isStyledHeading = firstRun.formatting.bold && (firstRun.formatting.fontSize || 0) >= 14;
    const isAllCapsOrTitleCase = /^[A-Z][A-Z\s]+$/.test(rawText) || /^[A-Z][a-z]+(\s[A-Z][a-z]+)*$/.test(rawText);
    const hasTrailingPunctuation = /[.:;!?]$/.test(rawText);
    const isKeywordMatch = this.matchKeyword(rawText);
    const startsWithBullet = /^[•\-\*\u2022\u2023\u2043\u204c\u204d]/.test(rawText) || /^(\d+\.\s|[a-zA-Z]\.\s)/.test(rawText);

    return !startsWithBullet && (isStyledHeading || (isKeywordMatch && !hasTrailingPunctuation) || (isAllCapsOrTitleCase && isKeywordMatch));
  }

  findSectionStart(paragraph: ExtractedParagraph, document: ExtractedDocument): number {
    const index = document.paragraphs.indexOf(paragraph);
    if (index === -1) return -1;
    
    const firstRun = paragraph.runs[0];
    const isStyledHeading = firstRun.formatting.bold && (firstRun.formatting.fontSize || 0) >= 14;
    
    if (!isStyledHeading) return -1;
    
    const nextIndex = index + 1;
    if (nextIndex < document.paragraphs.length) {
      return nextIndex;
    }
    return -1;
  }

  private matchKeyword(text: string): boolean {
    const lower = text.toLowerCase();
    return Object.values(KNOWN_SECTION_KEYWORDS).some(keywords =>
      keywords.some(keyword => lower.includes(keyword))
    );
  }

  private matchKeywordWithKey(text: string): { key: string; confidence: number } | null {
    const lower = text.toLowerCase();
    for (const [key, keywords] of Object.entries(KNOWN_SECTION_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          return { key, confidence: 0.9 };
        }
      }
    }
    return null;
  }

  private cleanTitle(text: string): string {
    return text.replace(/[:\-–—]+$/, '').trim();
  }

  private normalizeTitle(text: string): string {
    return this.cleanTitle(text).toLowerCase();
  }
}

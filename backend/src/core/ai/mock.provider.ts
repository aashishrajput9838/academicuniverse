/**
 * Mock AI Provider Implementation
 * Fallback provider when no real AI providers are available
 */

import { IAIProvider, AIConfig, AIResponse } from './ai.provider';
import { Logger } from '../../shared/utils';

const logger = new Logger('MockAIProvider');

export class MockAIProvider implements IAIProvider {
  private responseCounter = 0;
  private readonly isProduction = process.env.NODE_ENV === 'production';

  constructor() {
    logger.info('Mock AI provider initialized (for development only)');
  }

  /**
   * Check if mock is available (always true)
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'Mock AI Provider';
  }

  /**
   * Generate mock content from prompt
   */
  async generateContent(prompt: string, config?: AIConfig): Promise<AIResponse> {
    if (this.isProduction) {
      throw new Error('AI service is temporarily unavailable. Please try again later.');
    }

    logger.warn('Using mock AI response (no real API key configured)');
    
    // Simple mock responses based on prompt keywords
    this.responseCounter++;
    
    return {
      text: `This is a mock AI response #${this.responseCounter} for prompt: ${prompt.substring(0, 50)}...`,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      }
    };
  }

  /**
   * Generate mock JSON from prompt
   */
  async generateJSON<T>(prompt: string, config?: AIConfig): Promise<T> {
    if (this.isProduction) {
      throw new Error('AI service is temporarily unavailable. Please try again later.');
    }

    logger.warn('Using mock JSON AI response (provider unavailable or quota exhausted)', {
      providerName: this.getProviderName(),
      providerClass: this.constructor.name,
      promptSnippet: prompt.substring(0, 120),
      isProduction: this.isProduction,
    });

    this.responseCounter++;

    const normalizedPrompt = prompt.toLowerCase();

    if (normalizedPrompt.includes('outline') || normalizedPrompt.includes('structure')) {
      return [
        {
          title: '1. Abstract',
          points: ['Problem statement', 'Research contribution', 'Expected impact']
        },
        {
          title: '2. Introduction',
          points: ['Background context', 'Research gap', 'Objectives']
        },
        {
          title: '3. Literature Review',
          points: ['Key theories', 'Prior studies', 'Research synthesis']
        },
        {
          title: '4. Methodology',
          points: ['Dataset', 'Approach', 'Evaluation criteria']
        },
        {
          title: '5. Conclusion',
          points: ['Key findings', 'Implications', 'Future work']
        }
      ] as unknown as T;
    }

    if (normalizedPrompt.includes('generate 5 unique') || normalizedPrompt.includes('topic')) {
      const domain = this.extractDomain(prompt);
      return [
        `AI-Driven ${domain} Discovery Framework for Scalable Clinical Decision Support`,
        `Privacy-Preserving ${domain} Analytics with Explainable Machine Learning Pipelines`,
        `Human-Centered ${domain} Systems for Reliable and Interpretable Outcomes`,
        `Robust ${domain} Evaluation Methods for Real-World Deployment and Governance`,
        `Adaptive ${domain} Optimization Strategies for High-Impact Research and Practice`
      ] as unknown as T;
    }

    if ((normalizedPrompt.includes('rewrite') || normalizedPrompt.includes('rewrite the')) && normalizedPrompt.includes('original text')) {
      throw new Error('AI service is temporarily unavailable. Please try again later.');
    }

    if (normalizedPrompt.includes('generate a concise, highly professional, 250-word academic abstract')) {
      return {
        abstract: 'This mock abstract provides a concise summary of the research aim, motivating context, methodological approach, and expected scholarly contribution. It emphasizes analytical rigor, methodological transparency, and the practical relevance of the study for the target academic domain.'
      } as unknown as T;
    }

    if (normalizedPrompt.includes('precisely formatted citations')) {
      return {
        apa: 'Doe, J. (2025). AI in Healthcare. Academic Press.',
        mla: 'Doe, Jane. AI in Healthcare. Academic Press, 2025.',
        ieee: '[1] J. Doe, AI in Healthcare, Academic Press, 2025.'
      } as unknown as T;
    }

    if (normalizedPrompt.includes('module registry') || normalizedPrompt.includes('routing options') || normalizedPrompt.includes('routing decision')) {
      let docType = 'UNKNOWN';
      let primary = '';
      let secondary: string[] = [];
      let confidence = 0.95;

      if (normalizedPrompt.includes('transcript') || normalizedPrompt.includes('marks') || normalizedPrompt.includes('xls')) {
        docType = 'TRANSCRIPT';
        primary = 'academic_records';
        secondary = ['growth_hub', 'career_profile'];
      } else if (normalizedPrompt.includes('timetable') || normalizedPrompt.includes('schedule')) {
        docType = 'ACADEMIC_TIMETABLE';
        primary = 'academic_schedule';
        secondary = ['growth_hub'];
      } else if (normalizedPrompt.includes('certificate')) {
        docType = 'CERTIFICATE';
        primary = 'certificates';
        secondary = ['growth_hub', 'resume_builder', 'career_profile'];
      } else if (normalizedPrompt.includes('resume')) {
        docType = 'RESUME';
        primary = 'resume_builder';
        secondary = ['career_profile', 'growth_hub'];
      } else if (normalizedPrompt.includes('research') || normalizedPrompt.includes('publication')) {
        docType = 'RESEARCH_PAPER';
        primary = 'research_wing';
        secondary = [];
      } else if (normalizedPrompt.includes('unknown') || normalizedPrompt.includes('corrupted') || normalizedPrompt.includes('other')) {
        docType = 'UNKNOWN';
        primary = '';
        secondary = [];
        confidence = 0.5;
      }

      return {
        documentType: docType,
        confidence,
        targetModules: [
          ...(primary ? [{ moduleId: primary, confidence, reason: `Matched primary candidate for ${docType}.` }] : []),
          ...secondary.map((s, idx) => ({ moduleId: s, confidence: confidence - 0.05 - idx * 0.02, reason: `Secondary growth and sync for ${docType}.` }))
        ]
      } as unknown as T;
    }

    // Default mock JSON
    return {
      message: 'Mock JSON response',
      timestamp: new Date().toISOString(),
      counter: this.responseCounter
    } as unknown as T;
  }

  private extractDomain(prompt: string): string {
    const match = prompt.match(/domain of:\s*"([^"]+)"/i);
    if (match?.[1]) {
      return match[1].trim();
    }

    return 'Research';
  }

  private extractOriginalText(prompt: string): string {
    const match = prompt.match(/Original text:\s*"([^"]+)"/i);
    if (match?.[1]) {
      return match[1].trim();
    }

    return 'Artificial intelligence is transforming healthcare through improved diagnostics, treatment personalization, and evidence-based clinical decision support.';
  }

  private rewriteAcademicParagraph(text: string): string {
    const normalized = text.trim().replace(/\s+/g, ' ');

    if (!normalized) {
      return 'This paragraph has been revised to improve academic clarity and scholarly tone.';
    }

    if (normalized.toLowerCase().includes('artificial intelligence') && normalized.toLowerCase().includes('healthcare')) {
      return 'Artificial intelligence is reshaping healthcare by improving diagnostic accuracy, enabling personalized treatment strategies, and strengthening evidence-based clinical decision support.';
    }

    if (normalized.toLowerCase().includes('through')) {
      return normalized
        .replace(/\bis transforming\b/i, 'is reshaping')
        .replace(/\bthrough\b/i, 'by')
        .replace(/\bimproved diagnostics\b/i, 'enhanced diagnostic accuracy')
        .replace(/\btreatment personalization\b/i, 'personalized treatment strategies')
        .replace(/\bevidence-based clinical decision support\b/i, 'evidence-based clinical decision making');
    }

    return normalized
      .replace(/\bis transforming\b/i, 'is reshaping')
      .replace(/\bimproved\b/i, 'enhanced')
      .replace(/\bpersonalization\b/i, 'personalization strategies')
      .replace(/\bdecision support\b/i, 'decision-making support');
  }
}

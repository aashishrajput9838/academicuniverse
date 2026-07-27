import { GoogleGenAI } from '@google/genai';
import { Logger } from '../../utils/logger';
import { IssueDifficulty, IIssueAISuggestions } from '../../models/CodeArenaIssue';

const logger = new Logger('codeArenaAIService');

export class CodeArenaAIService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'your_gemini_api_key_here') {
      try {
        this.ai = new GoogleGenAI({ apiKey });
        logger.info('CodeArenaAIService: Gemini client initialized successfully');
      } catch (err) {
        logger.warn('CodeArenaAIService: Failed to initialize Gemini client', { error: err });
      }
    } else {
      logger.warn('CodeArenaAIService: GEMINI_API_KEY missing, fallback heuristics enabled');
    }
  }

  /**
   * Analyze issue title, description, and error logs to extract technology stack,
   * generate tags, estimate difficulty & time, and suggest root causes.
   */
  public async analyzeIssue(
    title: string,
    description: string,
    errorLogs?: string,
    category?: string
  ): Promise<IIssueAISuggestions> {
    if (!this.ai) {
      return this.heuristicAnalysis(title, description, errorLogs, category);
    }

    try {
      const prompt = `You are a Senior Full Stack Engineer reviewing a technical issue posted by a developer on Code Arena.
Analyze the following technical issue and provide structured insights in JSON format.

Issue Title: "${title}"
Category: "${category || 'General'}"
Description:
"""
${description.slice(0, 3000)}
"""
${errorLogs ? `Error Logs / Stack Traces:\n"""\n${errorLogs.slice(0, 2000)}\n"""` : ''}

Respond STRICTLY with a valid JSON object matching this schema:
{
  "detectedTechnologies": ["string"],
  "generatedTags": ["string"],
  "estimatedDifficulty": "EASY" | "MEDIUM" | "HARD" | "EXPERT",
  "estimatedSolvingTimeHours": number,
  "suggestedRootCauses": ["string"]
}

Rules:
1. "detectedTechnologies": array of 2-6 specific frameworks, languages, libraries, databases detected.
2. "generatedTags": array of 3-7 concise tags (lowercase, hyphens permitted).
3. "estimatedDifficulty": one of "EASY", "MEDIUM", "HARD", "EXPERT".
4. "estimatedSolvingTimeHours": reasonable positive number (e.g. 0.5, 1, 2, 4, 8).
5. "suggestedRootCauses": array of 2-4 plausible technical root causes or debugging directions based on the description and stack trace.
`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          temperature: 0.2,
          maxOutputTokens: 1000,
        },
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse JSON response from Gemini');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      const validDifficulty: IssueDifficulty = ['EASY', 'MEDIUM', 'HARD', 'EXPERT'].includes(
        parsed.estimatedDifficulty
      )
        ? parsed.estimatedDifficulty
        : 'MEDIUM';

      return {
        detectedTechnologies: Array.isArray(parsed.detectedTechnologies) ? parsed.detectedTechnologies : [],
        generatedTags: Array.isArray(parsed.generatedTags) ? parsed.generatedTags : [],
        estimatedDifficulty: validDifficulty,
        estimatedSolvingTimeHours: Number(parsed.estimatedSolvingTimeHours) || 2,
        suggestedRootCauses: Array.isArray(parsed.suggestedRootCauses) ? parsed.suggestedRootCauses : [],
        processedAt: new Date(),
      };
    } catch (err) {
      logger.warn('CodeArenaAIService: Error during Gemini AI analysis, falling back to heuristics', { error: err });
      return this.heuristicAnalysis(title, description, errorLogs, category);
    }
  }

  /**
   * Deterministic heuristic fallback when Gemini API is unavailable.
   */
  private heuristicAnalysis(
    title: string,
    description: string,
    errorLogs?: string,
    category?: string
  ): IIssueAISuggestions {
    const fullText = `${title} ${description} ${errorLogs || ''}`.toLowerCase();

    const techCatalog: Record<string, string> = {
      react: 'React',
      next: 'Next.js',
      node: 'Node.js',
      express: 'Express',
      typescript: 'TypeScript',
      javascript: 'JavaScript',
      python: 'Python',
      django: 'Django',
      flask: 'Flask',
      java: 'Java',
      spring: 'Spring Boot',
      cpp: 'C++',
      mongodb: 'MongoDB',
      postgres: 'PostgreSQL',
      mysql: 'MySQL',
      docker: 'Docker',
      kubernetes: 'Kubernetes',
      aws: 'AWS',
      firebase: 'Firebase',
      tailwind: 'Tailwind CSS',
    };

    const detectedTechnologies: string[] = [];
    Object.entries(techCatalog).forEach(([key, val]) => {
      if (fullText.includes(key)) {
        detectedTechnologies.push(val);
      }
    });

    if (category && !detectedTechnologies.includes(category)) {
      detectedTechnologies.push(category);
    }

    const generatedTags = Array.from(
      new Set([
        ...(category ? [category.toLowerCase()] : []),
        ...detectedTechnologies.map((t) => t.toLowerCase().replace(/\s+/g, '-')),
        fullText.includes('error') ? 'debugging' : 'help-wanted',
        fullText.includes('performance') ? 'performance' : 'implementation',
      ])
    ).slice(0, 6);

    let estimatedDifficulty: IssueDifficulty = 'MEDIUM';
    if (fullText.includes('kernel') || fullText.includes('memory leak') || fullText.includes('distributed')) {
      estimatedDifficulty = 'EXPERT';
    } else if (fullText.includes('architecture') || fullText.includes('deadlock') || fullText.includes('cluster')) {
      estimatedDifficulty = 'HARD';
    } else if (fullText.includes('typo') || fullText.includes('syntax') || fullText.includes('import')) {
      estimatedDifficulty = 'EASY';
    }

    const suggestedRootCauses = [
      'Verify environment configuration, environment variables, and module version compatibility.',
      'Check error logs and network request trace headers for unexpected payload formats.',
      'Validate input parameter types, nullability guards, and async/await error handlers.',
    ];

    return {
      detectedTechnologies: detectedTechnologies.length > 0 ? detectedTechnologies : ['General'],
      generatedTags,
      estimatedDifficulty,
      estimatedSolvingTimeHours: estimatedDifficulty === 'EASY' ? 1 : estimatedDifficulty === 'HARD' ? 5 : 2,
      suggestedRootCauses,
      processedAt: new Date(),
    };
  }
}

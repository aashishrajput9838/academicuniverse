import { SkillCategory, SkillSource } from '../shared/enums/skills.enum';

export interface NormalizedEvidencePayload {
  source: SkillSource;
  sourceId: string;
  skillId: string;
  skillName: string;
  category: SkillCategory;
  subcategory?: string;
  timestamp: Date;
  volumeMetric: number; // e.g. bytes of code, commit count, problem count, course credits
  isOwned: boolean;
  languageDominanceRatio: number; // 0.0 to 1.0
  frameworksDetected: string[];
  topicsDetected: string[];
  rawPayload: Record<string, any>;
}

export const SOURCE_RELIABILITY_WEIGHTS: Record<SkillSource, number> = {
  [SkillSource.AU_DIC]: 1.00,
  [SkillSource.GITHUB]: 0.90,
  [SkillSource.LEETCODE]: 0.85,
  [SkillSource.CERTIFICATE]: 0.80,
  [SkillSource.RESEARCH_PAPER]: 0.75,
  [SkillSource.RESEARCH]: 0.75,
  [SkillSource.PROJECT]: 0.70,
  [SkillSource.RESUME]: 0.60,
  [SkillSource.AI_INFERENCE]: 0.60,
  [SkillSource.MANUAL]: 0.40,
  [SkillSource.ACADEMIC]: 0.95,
};

/**
 * Resolves a raw technology name into the 10-tier hierarchical taxonomy
 */
export function resolveSkillCategory(name: string): SkillCategory {
  const normalized = name.toLowerCase().trim();

  // 1. Programming Languages
  const languages = [
    'typescript', 'javascript', 'python', 'java', 'kotlin', 'php', 'dart', 
    'c', 'c++', 'cpp', 'c#', 'go', 'golang', 'rust', 'swift', 'ruby', 'scala', 'r'
  ];
  if (languages.includes(normalized)) return SkillCategory.PROGRAMMING_LANGUAGES;

  // 2. Frontend Development
  const frontend = [
    'html', 'css', 'react', 'react.js', 'next.js', 'nextjs', 'vue', 'vue.js', 
    'angular', 'tailwind', 'tailwindcss', 'bootstrap', 'sass', 'redux', 'svelte'
  ];
  if (frontend.includes(normalized)) return SkillCategory.FRONTEND;

  // 3. Backend Development
  const backend = [
    'node.js', 'nodejs', 'express', 'express.js', 'nestjs', 'django', 'flask', 
    'fastapi', 'spring', 'spring boot', 'laravel', 'asp.net', 'graphql', 'rest api'
  ];
  if (backend.includes(normalized)) return SkillCategory.BACKEND;

  // 4. Database Systems
  const database = [
    'mongodb', 'postgresql', 'postgres', 'mysql', 'sqlite', 'redis', 'firebase', 
    'firestore', 'cassandra', 'dynamodb', 'neo4j', 'supabase'
  ];
  if (database.includes(normalized)) return SkillCategory.DATABASE;

  // 5. Cloud Computing
  const cloud = [
    'aws', 'amazon web services', 'azure', 'gcp', 'google cloud', 'vercel', 
    'render', 'heroku', 'digitalocean', 'serverless'
  ];
  if (cloud.includes(normalized)) return SkillCategory.CLOUD;

  // 6. DevOps & CI/CD
  const devops = [
    'docker', 'kubernetes', 'k8s', 'github actions', 'jenkins', 'terraform', 
    'ansible', 'ci/cd', 'nginx', 'bash', 'shell'
  ];
  if (devops.includes(normalized)) return SkillCategory.DEVOPS;

  // 7. AI & Machine Learning
  const aiMl = [
    'tensorflow', 'pytorch', 'opencv', 'langchain', 'scikit-learn', 'keras', 
    'huggingface', 'nlp', 'deep learning', 'machine learning', 'llm', 'rag'
  ];
  if (aiMl.includes(normalized)) return SkillCategory.AI_ML;

  // 8. Data Science & Analytics
  const dataScience = [
    'pandas', 'numpy', 'matplotlib', 'seaborn', 'powerbi', 'tableau', 
    'spark', 'pyspark', 'data analysis', 'jupyter'
  ];
  if (dataScience.includes(normalized)) return SkillCategory.DATA_SCIENCE;

  // 9. Developer Tools & Platforms
  const tools = [
    'git', 'github', 'gitlab', 'linux', 'vs code', 'vscode', 'postman', 
    'docker desktop', 'npm', 'yarn', 'pnpm', 'vite', 'webpack'
  ];
  if (tools.includes(normalized)) return SkillCategory.TOOLS;

  // Default fallback
  return SkillCategory.TECHNICAL;
}

export class EvidenceNormalizationLayer {
  /**
   * Transforms raw GitHub repository list into normalized evidence items
   */
  public normalizeGithubRepositories(repositories: any[]): NormalizedEvidencePayload[] {
    const evidenceItems: NormalizedEvidencePayload[] = [];

    for (const repo of repositories) {
      if (!repo) continue;
      const isOwned = !repo.fork;
      const timestamp = new Date(repo.updated_at || repo.pushed_at || Date.now());

      // 1. Primary Repository Language
      if (repo.language) {
        const langName = repo.language.trim();
        evidenceItems.push({
          source: SkillSource.GITHUB,
          sourceId: String(repo.id || repo.name),
          skillId: langName.toLowerCase().replace(/\s+/g, '-'),
          skillName: langName,
          category: resolveSkillCategory(langName),
          timestamp,
          volumeMetric: repo.size || 100, // Size in KB
          isOwned,
          languageDominanceRatio: 0.85,
          frameworksDetected: [],
          topicsDetected: repo.topics || [],
          rawPayload: { repoName: repo.name, url: repo.html_url, stargazers: repo.stargazers_count }
        });
      }

      // 2. Repository Topics (Frameworks / Technologies)
      if (Array.isArray(repo.topics)) {
        for (const topic of repo.topics) {
          const topicName = topic.trim();
          evidenceItems.push({
            source: SkillSource.GITHUB,
            sourceId: `${repo.id}-${topicName}`,
            skillId: topicName.toLowerCase().replace(/\s+/g, '-'),
            skillName: topicName.charAt(0).toUpperCase() + topicName.slice(1),
            category: resolveSkillCategory(topicName),
            timestamp,
            volumeMetric: 50,
            isOwned,
            languageDominanceRatio: 0.50,
            frameworksDetected: [topicName],
            topicsDetected: repo.topics,
            rawPayload: { repoName: repo.name, topic: topicName }
          });
        }
      }
    }

    return evidenceItems;
  }
}

export default new EvidenceNormalizationLayer();

import skillsEngine from '../skillsIntelligenceEngine';
import { SkillCategory, SkillSource } from '../../shared/enums/skills.enum';
import { NormalizedEvidencePayload } from '../evidenceNormalizationLayer';

// Helper to create mock evidence items
function createEvidence(
  source: SkillSource,
  sourceId: string,
  skillName: string,
  category: SkillCategory,
  daysAgo: number,
  volumeMetric: number,
  isOwned = true,
  dominance = 0.85
): NormalizedEvidencePayload {
  const timestamp = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return {
    source,
    sourceId,
    skillId: skillName.toLowerCase().replace(/\s+/g, '-'),
    skillName,
    category,
    timestamp,
    volumeMetric,
    isOwned,
    languageDominanceRatio: dominance,
    frameworksDetected: [],
    topicsDetected: [],
    rawPayload: { testId: sourceId },
  };
}

console.log('===========================================================');
console.log('     SIE-1.0 SCIENTIFIC BENCHMARK & DETERMINISM EVALUATION ');
console.log('===========================================================');

// Profile A: GitHub Only (Student A)
const profileA: NormalizedEvidencePayload[] = [
  createEvidence(SkillSource.GITHUB, 'repo-1', 'TypeScript', SkillCategory.PROGRAMMING_LANGUAGES, 5, 250, true, 0.9),
  createEvidence(SkillSource.GITHUB, 'repo-2', 'TypeScript', SkillCategory.PROGRAMMING_LANGUAGES, 30, 180, true, 0.85),
  createEvidence(SkillSource.GITHUB, 'repo-3', 'TypeScript', SkillCategory.PROGRAMMING_LANGUAGES, 90, 100, false, 0.6),
];

// Profile B: GitHub + AU DIC Transcript (Student B)
const profileB: NormalizedEvidencePayload[] = [
  ...profileA,
  createEvidence(SkillSource.AU_DIC, 'course-cs101', 'TypeScript', SkillCategory.PROGRAMMING_LANGUAGES, 120, 500, true, 1.0),
];

// Profile C: GitHub + LeetCode (Student C)
const profileC: NormalizedEvidencePayload[] = [
  ...profileA,
  createEvidence(SkillSource.LEETCODE, 'lc-ts-medium', 'TypeScript', SkillCategory.PROGRAMMING_LANGUAGES, 15, 300, true, 0.95),
];

// Profile D: GitHub + Certificates (Student D)
const profileD: NormalizedEvidencePayload[] = [
  ...profileA,
  createEvidence(SkillSource.CERTIFICATE, 'cert-aws-ts', 'TypeScript', SkillCategory.PROGRAMMING_LANGUAGES, 60, 400, true, 0.9),
];

// Profile E: Multi-Source Evidence (Student E)
const profileE: NormalizedEvidencePayload[] = [
  createEvidence(SkillSource.AU_DIC, 'au-dic-401', 'TypeScript', SkillCategory.PROGRAMMING_LANGUAGES, 45, 600, true, 1.0),
  createEvidence(SkillSource.GITHUB, 'gh-main', 'TypeScript', SkillCategory.PROGRAMMING_LANGUAGES, 10, 400, true, 0.95),
  createEvidence(SkillSource.LEETCODE, 'lc-advanced', 'TypeScript', SkillCategory.PROGRAMMING_LANGUAGES, 20, 350, true, 0.9),
  createEvidence(SkillSource.CERTIFICATE, 'cert-expert', 'TypeScript', SkillCategory.PROGRAMMING_LANGUAGES, 30, 450, true, 0.95),
];

// Edge Case 1: Zero Evidence
const profileEdgeZero: NormalizedEvidencePayload[] = [];

// Edge Case 2: Outdated Evidence (3 years ago)
const profileEdgeOutdated: NormalizedEvidencePayload[] = [
  createEvidence(SkillSource.GITHUB, 'old-repo', 'TypeScript', SkillCategory.PROGRAMMING_LANGUAGES, 1095, 500, true, 0.9),
];

// Edge Case 3: Manual Entry Only
const profileEdgeManual: NormalizedEvidencePayload[] = [
  createEvidence(SkillSource.MANUAL, 'user-input', 'TypeScript', SkillCategory.PROGRAMMING_LANGUAGES, 1, 50, true, 0.5),
];

const benchmarkProfiles = [
  { name: 'Student A (GitHub Only)', evidence: profileA },
  { name: 'Student B (GitHub + AU DIC)', evidence: profileB },
  { name: 'Student C (GitHub + LeetCode)', evidence: profileC },
  { name: 'Student D (GitHub + Certificates)', evidence: profileD },
  { name: 'Student E (Multi-Source)', evidence: profileE },
  { name: 'Edge Case: Zero Evidence', evidence: profileEdgeZero },
  { name: 'Edge Case: Outdated (3 yrs ago)', evidence: profileEdgeOutdated },
  { name: 'Edge Case: Manual Only', evidence: profileEdgeManual },
];

const results: any[] = [];

for (const p of benchmarkProfiles) {
  const run1 = skillsEngine.evaluateSkill('typescript', 'TypeScript', SkillCategory.PROGRAMMING_LANGUAGES, p.evidence);
  const run2 = skillsEngine.evaluateSkill('typescript', 'TypeScript', SkillCategory.PROGRAMMING_LANGUAGES, p.evidence);

  const isDeterministic = JSON.stringify(run1) === JSON.stringify(run2);

  results.push({
    profile: p.name,
    proficiencyScore: run1.proficiencyScore,
    proficiencyLevel: run1.proficiencyLevel,
    confidenceScore: run1.confidenceScore,
    confidencePercent: `${Math.round(run1.confidenceScore * 100)}%`,
    verificationStatus: run1.verificationStatus,
    isDeterministic,
    scoreBreakdown: run1.scoreBreakdown,
    recruiterExplanation: run1.recruiterExplanation,
  });
}

console.dir(results, { depth: null });

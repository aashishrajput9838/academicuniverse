/**
 * Academic Universe — Synthetic Generator Domain Types
 */

import { ExtendedCategory } from '../../dataset-manager/types/datasetManager.types';

export type QualityProfileName =
  | 'CLEAN_PDF'
  | 'SCANNER_COPY'
  | 'MOBILE_CAMERA'
  | 'LOW_RESOLUTION'
  | 'BLURRED'
  | 'SHADOWED'
  | 'COMPRESSED'
  | 'ROTATED'
  | 'SKEWED';

export interface QualityProfileConfig {
  name: QualityProfileName;
  description: string;
  rotationDegrees: number; // e.g. -3 to +3
  opacityOverlay: number; // 0 to 1
  contrastAdjustment: number;
  noiseLevel: number;
  grayscale: boolean;
}

export interface UniversityTemplateConfig {
  id: string; // e.g. 'TEMPLATE_A'
  name: string; // e.g. 'Vivekananda Technical University'
  shortCode: string; // 'VTU'
  location: string;
  tagline: string;
  primaryColor: string; // Hex color e.g. '#1a2e5a'
  secondaryColor: string;
  fontFamily: 'Helvetica' | 'Times-Roman' | 'Courier';
  headerStyle: 'RULED' | 'GRADIENT_BAR' | 'TRIPLE_BORDER' | 'DIAGONAL_ACCENT';
  watermarkText: string;
}

export interface CourseMark {
  courseCode: string;
  courseName: string;
  credits: number;
  grade: string;
  gradePoint: number;
  marksObtained: number;
  maxMarks: number;
}

export interface SemesterRecord {
  semesterName: string;
  sgpa: number;
  creditsEarned: number;
  courseMarks: CourseMark[];
}

export interface StudentProfile {
  studentName: string;
  rollNumber: string;
  enrollmentNumber: string;
  degreeName: string;
  branchName: string;
  batchYears: string;
  fatherName: string;
  motherName: string;
  dob: string;
  email: string;
  phone: string;
  address: string;
  bloodGroup: string;
}

export interface SyntheticDocumentData {
  documentId: string;
  category: ExtendedCategory;
  templateId: string;
  seed: number;
  student: StudentProfile;
  semesterRecords: SemesterRecord[];
  cgpa: number;
  issueDate: string;
  qualityProfile: QualityProfileConfig;
  customData: Record<string, unknown>;
}

export interface SyntheticGenerationConfig {
  seed: number;
  count: number;
  categories?: ExtendedCategory[];
  templateIds?: string[];
  qualityDistributions?: Record<QualityProfileName, number>; // percentages sum to 100
  outputDir?: string;
  syntheticWatermarkText?: string;
}

export interface SyntheticManifestEntry {
  documentId: string;
  originalFilename: string;
  canonicalFilename: string;
  category: ExtendedCategory;
  generationSeed: number;
  templateId: string;
  templateName: string;
  generatorVersion: string;
  qualityProfile: QualityProfileName;
  synthetic: boolean;
  generatedTimestamp: string;
  checksumSha256: string;
  fileSizeBytes: number;
  groundTruthFile: string;
  relativeDocPath: string;
  pngPath?: string;
}

export interface SyntheticManifest {
  manifestVersion: string;
  generatorVersion: string;
  generationSeed: number;
  generatedTimestamp: string;
  totalDocuments: number;
  categoryCounts: Record<string, number>;
  qualityCounts: Record<string, number>;
  templateCounts: Record<string, number>;
  documents: SyntheticManifestEntry[];
}

export interface GenerationReport {
  experimentSeed: number;
  generatorVersion: string;
  generatedTimestamp: string;
  totalDocuments: number;
  categoryBreakdown: Record<string, number>;
  qualityProfileBreakdown: Record<string, number>;
  templateBreakdown: Record<string, number>;
  validationStatus: 'PASSED' | 'FAILED';
  validationErrors: string[];
  manifestHash: string;
  generationDurationMs: number;
}

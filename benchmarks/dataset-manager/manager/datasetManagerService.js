"use strict";
/**
 * Academic Universe — AI Research Dataset Manager Service
 * Top-level orchestrator for end-to-end dataset scanning, organization,
 * manifest generation, duplicate detection, ground truth management, and reporting.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatasetManagerService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const datasetOrganizer_1 = require("../organizer/datasetOrganizer");
const duplicateDetector_1 = require("../duplicates/duplicateDetector");
class DatasetManagerService {
    constructor(benchmarkRoot) {
        this.benchmarkRoot = benchmarkRoot;
        this.manifestPath = path_1.default.join(benchmarkRoot, 'dataset-pipeline', 'manifests', 'dataset_manager_manifest.json');
        this.reportsDir = path_1.default.join(benchmarkRoot, 'dataset-pipeline', 'reports');
        this.organizer = new datasetOrganizer_1.DatasetOrganizer(benchmarkRoot);
        this.duplicateDetector = new duplicateDetector_1.DuplicateDetector();
        this.ensureDirs();
    }
    /** Run end-to-end automated processing of the RAW folder */
    processRawDataset() {
        console.log('🔍 Scanning RAW dataset folder...');
        const rawFiles = this.organizer.scanRawFolder();
        if (rawFiles.length === 0) {
            console.log('ℹ️ No files found in RAW directory.');
        }
        else {
            console.log(`📦 Found ${rawFiles.length} files in RAW directory. Organizing...`);
        }
        const existingManifest = this.getManifest();
        const existingMap = new Map();
        for (const doc of existingManifest.documents) {
            existingMap.set(doc.checksumSha256, doc);
        }
        const organizedDocs = [...existingManifest.documents];
        let newlyProcessed = 0;
        for (const rawDoc of rawFiles) {
            // Check if already processed by checksum
            if (!existingMap.has(rawDoc.checksumSha256)) {
                const organized = this.organizer.organizeDocument(rawDoc);
                organizedDocs.push(organized);
                existingMap.set(rawDoc.checksumSha256, organized);
                newlyProcessed++;
                console.log(`  ✅ Processed: "${rawDoc.originalFilename}" → ${organized.documentId} (${organized.category})`);
            }
        }
        // Re-classify any existing UNKNOWN documents with updated classifier rules
        const classifier = new (require('../classifier/documentClassifier').DocumentClassifier)();
        for (const doc of organizedDocs) {
            if (doc.category === 'UNKNOWN') {
                const reclassified = classifier.classify(doc.originalFilename);
                if (reclassified.category !== 'UNKNOWN') {
                    doc.category = reclassified.category;
                    doc.classificationConfidence = reclassified.confidence;
                }
            }
        }
        // Build category counts
        const categoryCounts = {
            MARKSHEET: 0,
            TRANSCRIPT: 0,
            CERTIFICATE: 0,
            WORKSHOP_CERTIFICATE: 0,
            INTERNSHIP_CERTIFICATE: 0,
            HACKATHON_CERTIFICATE: 0,
            TIMETABLE: 0,
            EXAM_TIMETABLE: 0,
            ADMIT_CARD: 0,
            FEE_RECEIPT: 0,
            STUDENT_ID: 0,
            UNKNOWN: 0,
        };
        for (const doc of organizedDocs) {
            if (doc.category in categoryCounts) {
                categoryCounts[doc.category]++;
            }
        }
        const manifest = {
            manifestVersion: '1.0.0',
            datasetVersion: '1.0.0',
            createdAt: existingManifest.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            totalRawDocuments: rawFiles.length,
            totalOrganizedDocuments: organizedDocs.length,
            categoryCounts,
            documents: organizedDocs,
        };
        this.saveManifest(manifest);
        const stats = this.getStats();
        // Export report
        this.exportMarkdownReport(manifest, stats);
        return { processedCount: newlyProcessed, manifest, stats };
    }
    /** Load current dataset manager manifest */
    getManifest() {
        if (fs_1.default.existsSync(this.manifestPath)) {
            try {
                return JSON.parse(fs_1.default.readFileSync(this.manifestPath, 'utf-8'));
            }
            catch { }
        }
        return {
            manifestVersion: '1.0.0',
            datasetVersion: '1.0.0',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            totalRawDocuments: 0,
            totalOrganizedDocuments: 0,
            categoryCounts: {
                MARKSHEET: 0, TRANSCRIPT: 0, CERTIFICATE: 0, WORKSHOP_CERTIFICATE: 0,
                INTERNSHIP_CERTIFICATE: 0, HACKATHON_CERTIFICATE: 0, TIMETABLE: 0,
                EXAM_TIMETABLE: 0, ADMIT_CARD: 0, FEE_RECEIPT: 0, STUDENT_ID: 0, UNKNOWN: 0,
            },
            documents: [],
        };
    }
    /** Compute aggregate dataset statistics */
    getStats() {
        const manifest = this.getManifest();
        const docs = manifest.documents;
        const catDist = {
            MARKSHEET: 0, TRANSCRIPT: 0, CERTIFICATE: 0, WORKSHOP_CERTIFICATE: 0,
            INTERNSHIP_CERTIFICATE: 0, HACKATHON_CERTIFICATE: 0, TIMETABLE: 0,
            EXAM_TIMETABLE: 0, ADMIT_CARD: 0, FEE_RECEIPT: 0, STUDENT_ID: 0, UNKNOWN: 0,
        };
        const statusDist = {
            DRAFT: 0, VERIFIED: 0, REJECTED: 0, RECLASSIFIED: 0,
        };
        let totalConfidence = 0;
        for (const doc of docs) {
            if (doc.category in catDist)
                catDist[doc.category]++;
            if (doc.groundTruthStatus in statusDist)
                statusDist[doc.groundTruthStatus]++;
            totalConfidence += doc.classificationConfidence || 0;
        }
        const dupes = this.duplicateDetector.detectSha256Duplicates(docs);
        return {
            totalImported: docs.length,
            totalClassified: docs.filter((d) => d.category !== 'UNKNOWN').length,
            averageConfidence: docs.length > 0 ? totalConfidence / docs.length : 0,
            categoryDistribution: catDist,
            statusDistribution: statusDist,
            duplicateCount: dupes.length,
            pendingReviewCount: statusDist.DRAFT,
            verifiedCount: statusDist.VERIFIED,
        };
    }
    /** Review & Update Document Status (Approve, Edit, Reclassify) */
    reviewDocument(documentId, action, newCategory) {
        const manifest = this.getManifest();
        const doc = manifest.documents.find((d) => d.documentId === documentId);
        if (!doc)
            throw new Error(`Document not found: ${documentId}`);
        if (action === 'APPROVE') {
            doc.groundTruthStatus = 'VERIFIED';
        }
        else if (action === 'REJECT') {
            doc.groundTruthStatus = 'REJECTED';
        }
        else if (action === 'RECLASSIFY' && newCategory) {
            doc.category = newCategory;
            doc.groundTruthStatus = 'RECLASSIFIED';
        }
        // Update Ground Truth file annotation status
        if (fs_1.default.existsSync(doc.groundTruthPath)) {
            try {
                const gt = JSON.parse(fs_1.default.readFileSync(doc.groundTruthPath, 'utf-8'));
                gt.annotationStatus = doc.groundTruthStatus;
                gt.category = doc.category;
                fs_1.default.writeFileSync(doc.groundTruthPath, JSON.stringify(gt, null, 2), 'utf-8');
            }
            catch { }
        }
        manifest.updatedAt = new Date().toISOString();
        this.saveManifest(manifest);
        return doc;
    }
    // --- Private Helpers ---
    saveManifest(manifest) {
        const dir = path_1.default.dirname(this.manifestPath);
        if (!fs_1.default.existsSync(dir))
            fs_1.default.mkdirSync(dir, { recursive: true });
        fs_1.default.writeFileSync(this.manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    }
    exportMarkdownReport(manifest, stats) {
        const lines = [
            '# AI Research Dataset Manager — Automatic Ingestion Report',
            `**Generated:** ${new Date().toISOString()} | **Total Documents:** ${manifest.totalOrganizedDocuments}`,
            '',
            '## Document Category Distribution',
            '| Category | Document Count | Percentage | Status |',
            '| :--- | :---: | :---: | :--- |',
            `| **Semester Marksheets** | ${stats.categoryDistribution.MARKSHEET} | ${((stats.categoryDistribution.MARKSHEET / (manifest.totalOrganizedDocuments || 1)) * 100).toFixed(1)}% | Auto-Classified |`,
            `| **Transcripts** | ${stats.categoryDistribution.TRANSCRIPT} | ${((stats.categoryDistribution.TRANSCRIPT / (manifest.totalOrganizedDocuments || 1)) * 100).toFixed(1)}% | Auto-Classified |`,
            `| **Certificates (Course)** | ${stats.categoryDistribution.CERTIFICATE} | ${((stats.categoryDistribution.CERTIFICATE / (manifest.totalOrganizedDocuments || 1)) * 100).toFixed(1)}% | Auto-Classified |`,
            `| **Workshop Certificates** | ${stats.categoryDistribution.WORKSHOP_CERTIFICATE} | ${((stats.categoryDistribution.WORKSHOP_CERTIFICATE / (manifest.totalOrganizedDocuments || 1)) * 100).toFixed(1)}% | Auto-Classified |`,
            `| **Internship Certificates** | ${stats.categoryDistribution.INTERNSHIP_CERTIFICATE} | ${((stats.categoryDistribution.INTERNSHIP_CERTIFICATE / (manifest.totalOrganizedDocuments || 1)) * 100).toFixed(1)}% | Auto-Classified |`,
            `| **Hackathon Certificates** | ${stats.categoryDistribution.HACKATHON_CERTIFICATE} | ${((stats.categoryDistribution.HACKATHON_CERTIFICATE / (manifest.totalOrganizedDocuments || 1)) * 100).toFixed(1)}% | Auto-Classified |`,
            `| **Timetables** | ${stats.categoryDistribution.TIMETABLE} | ${((stats.categoryDistribution.TIMETABLE / (manifest.totalOrganizedDocuments || 1)) * 100).toFixed(1)}% | Auto-Classified |`,
            `| **Exam Timetables** | ${stats.categoryDistribution.EXAM_TIMETABLE} | ${((stats.categoryDistribution.EXAM_TIMETABLE / (manifest.totalOrganizedDocuments || 1)) * 100).toFixed(1)}% | Auto-Classified |`,
            `| **Admit Cards** | ${stats.categoryDistribution.ADMIT_CARD} | ${((stats.categoryDistribution.ADMIT_CARD / (manifest.totalOrganizedDocuments || 1)) * 100).toFixed(1)}% | Auto-Classified |`,
            `| **Fee Receipts** | ${stats.categoryDistribution.FEE_RECEIPT} | ${((stats.categoryDistribution.FEE_RECEIPT / (manifest.totalOrganizedDocuments || 1)) * 100).toFixed(1)}% | Auto-Classified |`,
            `| **Student IDs** | ${stats.categoryDistribution.STUDENT_ID} | ${((stats.categoryDistribution.STUDENT_ID / (manifest.totalOrganizedDocuments || 1)) * 100).toFixed(1)}% | Auto-Classified |`,
            `| **Unknown / Review Req.** | ${stats.categoryDistribution.UNKNOWN} | ${((stats.categoryDistribution.UNKNOWN / (manifest.totalOrganizedDocuments || 1)) * 100).toFixed(1)}% | Needs Review |`,
            `| **TOTAL** | **${manifest.totalOrganizedDocuments}** | **100.0%** | — |`,
            '',
            '## Quality & Review Summary',
            `- **Average AI Classification Confidence:** ${(stats.averageConfidence * 100).toFixed(1)}%`,
            `- **Pending Human Review (Drafts):** ${stats.pendingReviewCount}`,
            `- **Verified Ground Truths:** ${stats.verifiedCount}`,
            `- **Exact SHA-256 Duplicates:** ${stats.duplicateCount}`,
        ];
        const md = lines.join('\n');
        fs_1.default.writeFileSync(path_1.default.join(this.reportsDir, 'dataset_manager_report.md'), md, 'utf-8');
        return md;
    }
    ensureDirs() {
        [path_1.default.dirname(this.manifestPath), this.reportsDir].forEach((d) => {
            if (!fs_1.default.existsSync(d))
                fs_1.default.mkdirSync(d, { recursive: true });
        });
    }
}
exports.DatasetManagerService = DatasetManagerService;

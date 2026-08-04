"use strict";
/**
 * Academic Universe — Dataset Organizer
 * Safely copies documents from RAW to organized subfolders with smart canonical renaming.
 * INVARIANT: RAW files are NEVER modified or deleted. RAW remains 100% read-only.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatasetOrganizer = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const documentClassifier_1 = require("../classifier/documentClassifier");
class DatasetOrganizer {
    constructor(benchmarkRoot) {
        this.categoryCounters = new Map();
        this.benchmarkRoot = benchmarkRoot;
        this.rawDir = path_1.default.join(benchmarkRoot, 'dataset', 'RAW');
        this.datasetDir = path_1.default.join(benchmarkRoot, 'dataset');
        this.groundTruthDir = path_1.default.join(benchmarkRoot, 'ground-truth');
        this.classifier = new documentClassifier_1.DocumentClassifier();
        this.ensureDirs();
        this.initializeCounters();
    }
    /** Scan the RAW folder for files */
    scanRawFolder() {
        if (!fs_1.default.existsSync(this.rawDir)) {
            return [];
        }
        const files = fs_1.default.readdirSync(this.rawDir).filter((f) => {
            const full = path_1.default.join(this.rawDir, f);
            return fs_1.default.statSync(full).isFile() && !f.startsWith('.');
        });
        return files.map((file) => {
            const fullPath = path_1.default.join(this.rawDir, file);
            const stat = fs_1.default.statSync(fullPath);
            const ext = path_1.default.extname(file).slice(1).toLowerCase();
            const checksum = this.computeSha256Sync(fullPath);
            return {
                originalFilename: file,
                rawPath: fullPath,
                fileFormat: ext,
                fileSizeBytes: stat.size,
                checksumSha256: checksum,
                createdAt: stat.birthtime.toISOString(),
                modifiedAt: stat.mtime.toISOString(),
            };
        });
    }
    /** Organize raw document: Classify → Copy → Assign Canonical ID → Generate Draft GT */
    organizeDocument(rawDoc) {
        const classification = this.classifier.classify(rawDoc.originalFilename);
        const subfolder = this.classifier.getDestinationSubfolder(classification.category);
        // Increment counter for prefix
        const prefix = classification.suggestedPrefix;
        const currentCount = (this.categoryCounters.get(prefix) || 0) + 1;
        this.categoryCounters.set(prefix, currentCount);
        const documentId = `${prefix}_${currentCount.toString().padStart(3, '0')}`;
        const canonicalFilename = `${documentId}.${rawDoc.fileFormat}`;
        const destDir = path_1.default.join(this.datasetDir, subfolder);
        if (!fs_1.default.existsSync(destDir))
            fs_1.default.mkdirSync(destDir, { recursive: true });
        const organizedPath = path_1.default.join(destDir, canonicalFilename);
        const gtPath = path_1.default.join(this.groundTruthDir, `${documentId}.json`);
        // SAFE COPY: RAW file is read, never modified
        fs_1.default.copyFileSync(rawDoc.rawPath, organizedPath);
        // Create Draft Ground Truth JSON
        const draftGT = this.createDraftGroundTruth(documentId, classification.category, rawDoc.originalFilename);
        fs_1.default.writeFileSync(gtPath, JSON.stringify(draftGT, null, 2), 'utf-8');
        return {
            documentId,
            originalFilename: rawDoc.originalFilename,
            canonicalFilename,
            rawPath: rawDoc.rawPath,
            organizedPath,
            category: classification.category,
            fileFormat: rawDoc.fileFormat,
            fileSizeBytes: rawDoc.fileSizeBytes,
            checksumSha256: rawDoc.checksumSha256,
            qualityLevel: this.inferQuality(rawDoc.originalFilename),
            classificationConfidence: classification.confidence,
            importedAt: new Date().toISOString(),
            groundTruthPath: gtPath,
            groundTruthStatus: 'DRAFT',
        };
    }
    // --- Helpers ---
    initializeCounters() {
        // Scan existing files in dataset/ subfolders to avoid ID collision
        const prefixes = ['MS', 'TR', 'CERT', 'CERT_WS', 'CERT_INT', 'CERT_HACK', 'TT', 'TT_EXAM', 'ADMIT', 'FEE', 'ID', 'UNK'];
        for (const prefix of prefixes) {
            this.categoryCounters.set(prefix, 0);
        }
        if (fs_1.default.existsSync(this.datasetDir)) {
            const subdirs = fs_1.default.readdirSync(this.datasetDir);
            for (const sub of subdirs) {
                const subPath = path_1.default.join(this.datasetDir, sub);
                if (fs_1.default.statSync(subPath).isDirectory() && sub !== 'RAW') {
                    const files = fs_1.default.readdirSync(subPath);
                    for (const f of files) {
                        const match = f.match(/^([A-Z_]+)_(\d{3})\./);
                        if (match) {
                            const prefix = match[1];
                            const num = parseInt(match[2], 10);
                            const current = this.categoryCounters.get(prefix) || 0;
                            if (num > current)
                                this.categoryCounters.set(prefix, num);
                        }
                    }
                }
            }
        }
    }
    createDraftGroundTruth(documentId, category, originalName) {
        const isMarksheet = category === 'MARKSHEET' || category === 'TRANSCRIPT';
        const isCert = category.includes('CERTIFICATE');
        // Parse potential semester number from filename e.g., "sem 1 marks.pdf"
        const semMatch = originalName.match(/sem(?:ester)?[\s\-_]*(\d+)/i);
        const semesterStr = semMatch ? semMatch[1] : null;
        return {
            schemaVersion: '1.0.0',
            documentId,
            category,
            studentName: null,
            rollNumber: null,
            semester: semesterStr,
            academicYear: null,
            institutionName: isCert ? this.inferInstitution(originalName) : null,
            courseName: isCert ? originalName.replace(/\.[^/.]+$/, '') : null,
            sgpa: null,
            cgpa: null,
            issueDate: null,
            courseMarks: [],
            annotatedBy: 'AI_ASSISTANT_DRAFT',
            annotatedAt: new Date().toISOString(),
            annotationStatus: 'DRAFT',
            annotationNotes: `Auto-generated draft GT for raw file "${originalName}"`,
            lowConfidenceFields: ['studentName', 'rollNumber', 'sgpa', 'cgpa'],
        };
    }
    inferInstitution(name) {
        const lower = name.toLowerCase();
        if (lower.includes('oracle'))
            return 'Oracle';
        if (lower.includes('owasp'))
            return 'OWASP Foundation';
        if (lower.includes('udemy'))
            return 'Udemy';
        if (lower.includes('nptel'))
            return 'NPTEL';
        return null;
    }
    inferQuality(filename) {
        const lower = filename.toLowerCase();
        if (lower.includes('scan') || lower.includes('blurry'))
            return 'SCANNED';
        if (lower.includes('low') || lower.endsWith('.png'))
            return 'MEDIUM';
        return 'HIGH';
    }
    computeSha256Sync(filePath) {
        const buffer = fs_1.default.readFileSync(filePath);
        return crypto_1.default.createHash('sha256').update(buffer).digest('hex');
    }
    ensureDirs() {
        [
            this.datasetDir,
            path_1.default.join(this.datasetDir, 'marksheets'),
            path_1.default.join(this.datasetDir, 'certificates'),
            path_1.default.join(this.datasetDir, 'timetables'),
            path_1.default.join(this.datasetDir, 'admit_cards'),
            path_1.default.join(this.datasetDir, 'fee_receipts'),
            path_1.default.join(this.datasetDir, 'student_id'),
            path_1.default.join(this.datasetDir, 'unknown'),
            this.groundTruthDir,
        ].forEach((d) => {
            if (!fs_1.default.existsSync(d))
                fs_1.default.mkdirSync(d, { recursive: true });
        });
    }
}
exports.DatasetOrganizer = DatasetOrganizer;

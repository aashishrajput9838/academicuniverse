"use strict";
/**
 * Academic Universe — Synthetic Dataset Generation Orchestrator Pipeline
 * Orchestrates deterministic generation of synthetic academic documents & Ground Truth JSON records.
 *
 * DESIGN INVARIANT: Output is written to isolated `synthetic-dataset/` folder by default.
 * Datasets are ONLY imported into Dataset Manager upon explicit invocation.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyntheticPipeline = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const datasetManagerService_1 = require("../../dataset-manager/manager/datasetManagerService");
const seededRandom_1 = require("../core/seededRandom");
const dataFabricator_1 = require("../core/dataFabricator");
const templateEngine_1 = require("../core/templateEngine");
const qualityProfiles_1 = require("../core/qualityProfiles");
const marksheetGenerator_1 = require("../generators/marksheetGenerator");
const certificateGenerator_1 = require("../generators/certificateGenerator");
const transcriptGenerator_1 = require("../generators/transcriptGenerator");
const timetableGenerator_1 = require("../generators/timetableGenerator");
const admitCardGenerator_1 = require("../generators/admitCardGenerator");
const feeReceiptGenerator_1 = require("../generators/feeReceiptGenerator");
const studentIdGenerator_1 = require("../generators/studentIdGenerator");
const groundTruthBuilder_1 = require("./groundTruthBuilder");
const manifestBuilder_1 = require("./manifestBuilder");
const qualityChecker_1 = require("./qualityChecker");
class SyntheticPipeline {
    constructor(benchmarkRoot) {
        this.benchmarkRoot = benchmarkRoot;
        this.templateEngine = new templateEngine_1.TemplateEngine();
        // Register built-in templates
        this.templateEngine.registerTemplate(new templateEngine_1.DefaultTemplateA());
        this.templateEngine.registerTemplate(new templateEngine_1.DefaultTemplateB());
        this.templateEngine.registerTemplate(new templateEngine_1.DefaultTemplateC());
        this.templateEngine.registerTemplate(new templateEngine_1.DefaultTemplateD());
    }
    /** Run end-to-end synthetic dataset generation */
    async generateDataset(config) {
        const startTime = Date.now();
        const seed = config.seed || 42;
        const count = config.count || 25;
        const outputDir = config.outputDir || path_1.default.join(this.benchmarkRoot, 'synthetic-dataset');
        const docsDir = path_1.default.join(outputDir, 'documents');
        const gtDir = path_1.default.join(outputDir, 'ground-truth');
        [outputDir, docsDir, gtDir].forEach((d) => {
            if (!fs_1.default.existsSync(d))
                fs_1.default.mkdirSync(d, { recursive: true });
        });
        const masterRng = new seededRandom_1.SeededRandom(seed);
        const categories = config.categories && config.categories.length > 0
            ? config.categories
            : [
                'MARKSHEET',
                'TRANSCRIPT',
                'CERTIFICATE',
                'WORKSHOP_CERTIFICATE',
                'INTERNSHIP_CERTIFICATE',
                'HACKATHON_CERTIFICATE',
                'TIMETABLE',
                'EXAM_TIMETABLE',
                'ADMIT_CARD',
                'FEE_RECEIPT',
                'STUDENT_ID',
            ];
        const availableTemplates = config.templateIds && config.templateIds.length > 0
            ? config.templateIds
            : this.templateEngine.getAllTemplateIds();
        const manifestEntries = [];
        const categoryBreakdown = {};
        const qualityBreakdown = {};
        const templateBreakdown = {};
        console.log(`🚀 Generating ${count} synthetic documents (Seed: ${seed})...`);
        for (let i = 1; i <= count; i++) {
            // Deterministic child seed per document
            const docSeed = masterRng.childSeed();
            const docRng = new seededRandom_1.SeededRandom(docSeed);
            const fabricator = new dataFabricator_1.DataFabricator(docRng);
            const category = docRng.pick(categories);
            const templateId = docRng.pick(availableTemplates);
            const template = this.templateEngine.getTemplate(templateId);
            const qualityProfile = qualityProfiles_1.QualityProfileManager.selectProfile(docRng, config.qualityDistributions);
            // Deterministic document ID e.g. SYNTH_MS_001
            const prefix = this.getPrefixForCategory(category);
            const documentId = `SYNTH_${prefix}_${String(i).padStart(3, '0')}`;
            const canonicalFilename = `${documentId}.pdf`;
            const originalFilename = `synthetic_${category.toLowerCase()}_${i}.pdf`;
            // Fabricate student data
            const student = fabricator.generateStudentProfile();
            const sem1 = fabricator.generateSemesterRecord(1);
            const sem2 = fabricator.generateSemesterRecord(2);
            const cgpa = parseFloat(((sem1.sgpa + sem2.sgpa) / 2).toFixed(2));
            const issueDate = docRng.nextDate(2023, 2026);
            const docData = {
                documentId,
                category,
                templateId,
                seed: docSeed,
                student,
                semesterRecords: [sem1, sem2],
                cgpa,
                issueDate,
                qualityProfile,
                customData: {
                    syntheticWatermark: config.syntheticWatermarkText || 'SYNTHETIC RESEARCH DATASET',
                },
            };
            // 1. Generate PDF
            const pdfBytes = await this.renderPdf(docData, template);
            const pdfPath = path_1.default.join(docsDir, canonicalFilename);
            fs_1.default.writeFileSync(pdfPath, pdfBytes);
            // 2. Optionally generate PNG for OpenRouter vision compatibility
            let pngPath;
            try {
                const { pdf } = await Promise.resolve().then(() => __importStar(require('pdf-to-img')));
                const documentPages = await pdf(pdfBytes, { scale: 2 });
                const firstPage = await documentPages.getPage(1);
                const pngFileName = `${documentId}.png`;
                const pngFilePath = path_1.default.join(docsDir, pngFileName);
                fs_1.default.writeFileSync(pngFilePath, firstPage);
                pngPath = pngFilePath;
            }
            catch {
                // pdf-to-img not available (requires poppler system libraries); PNG will not be generated
            }
            const checksumSha256 = crypto_1.default.createHash('sha256').update(pdfBytes).digest('hex');
            // 2. Build & Save Ground Truth JSON
            const gtSchema = groundTruthBuilder_1.GroundTruthBuilder.buildGroundTruth(docData);
            const gtRelPath = path_1.default.join('ground-truth', `${documentId}.json`);
            const gtAbsPath = path_1.default.join(outputDir, gtRelPath);
            fs_1.default.writeFileSync(gtAbsPath, JSON.stringify(gtSchema, null, 2), 'utf-8');
            // Record manifest entry
            const entry = {
                documentId,
                originalFilename,
                canonicalFilename,
                category,
                generationSeed: docSeed,
                templateId,
                templateName: template.config.name,
                generatorVersion: '1.1.0',
                qualityProfile: qualityProfile.name,
                synthetic: true,
                generatedTimestamp: new Date().toISOString(),
                checksumSha256,
                fileSizeBytes: pdfBytes.length,
                groundTruthFile: gtRelPath,
                relativeDocPath: path_1.default.join('documents', canonicalFilename),
                pngPath,
            };
            manifestEntries.push(entry);
            categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
            qualityBreakdown[qualityProfile.name] = (qualityBreakdown[qualityProfile.name] || 0) + 1;
            templateBreakdown[templateId] = (templateBreakdown[templateId] || 0) + 1;
        }
        // 3. Save Manifest & Metadata
        const { manifestHash } = manifestBuilder_1.ManifestBuilder.saveManifestAndMetadata(outputDir, seed, '1.1.0', manifestEntries);
        // 4. Validate Generated Dataset
        const validation = qualityChecker_1.QualityChecker.validateDataset(outputDir);
        const durationMs = Date.now() - startTime;
        const report = {
            experimentSeed: seed,
            generatorVersion: '1.1.0',
            generatedTimestamp: new Date().toISOString(),
            totalDocuments: manifestEntries.length,
            categoryBreakdown,
            qualityProfileBreakdown: qualityBreakdown,
            templateBreakdown,
            validationStatus: validation.isValid ? 'PASSED' : 'FAILED',
            validationErrors: validation.errors,
            manifestHash,
            generationDurationMs: durationMs,
        };
        // 5. Save generation-report.md
        manifestBuilder_1.ManifestBuilder.saveReport(outputDir, report);
        console.log(`✅ Synthetic generation complete: ${count} documents created in ${(durationMs / 1000).toFixed(2)}s`);
        return { outputDir, totalDocuments: manifestEntries.length, report };
    }
    /**
     * Explicit action: Import generated synthetic dataset into the existing Dataset Manager
     * Copies documents to benchmarks/dataset/RAW/ and triggers DatasetManagerService
     */
    importToDatasetManager(outputDir) {
        const rawDir = path_1.default.join(this.benchmarkRoot, 'dataset', 'RAW');
        if (!fs_1.default.existsSync(rawDir))
            fs_1.default.mkdirSync(rawDir, { recursive: true });
        const docsDir = path_1.default.join(outputDir, 'documents');
        if (!fs_1.default.existsSync(docsDir)) {
            throw new Error(`Synthetic documents directory not found at: ${docsDir}`);
        }
        const files = fs_1.default.readdirSync(docsDir).filter((f) => f.endsWith('.pdf'));
        let count = 0;
        files.forEach((file) => {
            const src = path_1.default.join(docsDir, file);
            const dest = path_1.default.join(rawDir, file);
            try {
                fs_1.default.copyFileSync(src, dest);
            }
            catch (err) {
                if (err.code !== 'EBUSY')
                    throw err;
            }
            count++;
        });
        // Copy GT JSON files to ground-truth/ directory
        const synthGtDir = path_1.default.join(outputDir, 'ground-truth');
        const targetGtDir = path_1.default.join(this.benchmarkRoot, 'ground-truth');
        if (!fs_1.default.existsSync(targetGtDir))
            fs_1.default.mkdirSync(targetGtDir, { recursive: true });
        if (fs_1.default.existsSync(synthGtDir)) {
            const gtFiles = fs_1.default.readdirSync(synthGtDir).filter((f) => f.endsWith('.json'));
            gtFiles.forEach((file) => {
                const src = path_1.default.join(synthGtDir, file);
                const dest = path_1.default.join(targetGtDir, file);
                try {
                    fs_1.default.copyFileSync(src, dest);
                }
                catch { }
            });
        }
        // Trigger existing Dataset Manager scanning & organization
        const managerService = new datasetManagerService_1.DatasetManagerService(this.benchmarkRoot);
        managerService.processRawDataset();
        return { importedCount: count };
    }
    async renderPdf(data, template) {
        switch (data.category) {
            case 'MARKSHEET':
                return marksheetGenerator_1.MarksheetGenerator.generate(data, template);
            case 'TRANSCRIPT':
                return transcriptGenerator_1.TranscriptGenerator.generate(data, template);
            case 'CERTIFICATE':
            case 'WORKSHOP_CERTIFICATE':
            case 'INTERNSHIP_CERTIFICATE':
            case 'HACKATHON_CERTIFICATE':
                return certificateGenerator_1.CertificateGenerator.generate(data, template);
            case 'TIMETABLE':
            case 'EXAM_TIMETABLE':
                return timetableGenerator_1.TimetableGenerator.generate(data, template);
            case 'ADMIT_CARD':
                return admitCardGenerator_1.AdmitCardGenerator.generate(data, template);
            case 'FEE_RECEIPT':
                return feeReceiptGenerator_1.FeeReceiptGenerator.generate(data, template);
            case 'STUDENT_ID':
                return studentIdGenerator_1.StudentIdGenerator.generate(data, template);
            default:
                return marksheetGenerator_1.MarksheetGenerator.generate(data, template);
        }
    }
    getPrefixForCategory(cat) {
        const prefixes = {
            MARKSHEET: 'MS',
            TRANSCRIPT: 'TR',
            CERTIFICATE: 'CERT',
            WORKSHOP_CERTIFICATE: 'CERT_WS',
            INTERNSHIP_CERTIFICATE: 'CERT_INT',
            HACKATHON_CERTIFICATE: 'CERT_HACK',
            TIMETABLE: 'TT',
            EXAM_TIMETABLE: 'TT_EXAM',
            ADMIT_CARD: 'ADMIT',
            FEE_RECEIPT: 'FEE',
            STUDENT_ID: 'ID',
            UNKNOWN: 'UNK',
        };
        return prefixes[cat] || 'DOC';
    }
}
exports.SyntheticPipeline = SyntheticPipeline;

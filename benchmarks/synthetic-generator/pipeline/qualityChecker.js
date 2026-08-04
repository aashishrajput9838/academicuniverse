"use strict";
/**
 * Academic Universe — Synthetic Quality & Integrity Checker
 * Verifies that generated Ground Truth JSON files exactly match rendered documents and manifest entries.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QualityChecker = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
class QualityChecker {
    /** Validate a completed synthetic dataset output folder */
    static validateDataset(outputDir) {
        const errors = [];
        const warnings = [];
        const manifestPath = path_1.default.join(outputDir, 'manifest.json');
        if (!fs_1.default.existsSync(manifestPath)) {
            return { isValid: false, errors: ['manifest.json is missing in dataset directory'], warnings: [] };
        }
        let manifest;
        try {
            manifest = JSON.parse(fs_1.default.readFileSync(manifestPath, 'utf-8'));
        }
        catch (e) {
            return { isValid: false, errors: [`Failed to parse manifest.json: ${e.message}`], warnings: [] };
        }
        if (!manifest.documents || manifest.documents.length === 0) {
            errors.push('Manifest contains zero documents.');
        }
        const seenIds = new Set();
        for (const doc of manifest.documents || []) {
            // 1. Check ID uniqueness
            if (seenIds.has(doc.documentId)) {
                errors.push(`Duplicate documentId detected in manifest: ${doc.documentId}`);
            }
            seenIds.add(doc.documentId);
            // 2. Check PDF file existence
            const pdfPath = path_1.default.join(outputDir, doc.relativeDocPath);
            if (!fs_1.default.existsSync(pdfPath)) {
                errors.push(`PDF document file missing for ${doc.documentId} at: ${pdfPath}`);
            }
            else {
                // Verify SHA-256 checksum
                const fileBuffer = fs_1.default.readFileSync(pdfPath);
                const actualSha256 = crypto_1.default.createHash('sha256').update(fileBuffer).digest('hex');
                if (actualSha256 !== doc.checksumSha256) {
                    errors.push(`SHA-256 checksum mismatch for ${doc.documentId}. Manifest: ${doc.checksumSha256}, Actual: ${actualSha256}`);
                }
            }
            // 3. Check GT file existence & consistency
            const gtPath = path_1.default.join(outputDir, doc.groundTruthFile);
            if (!fs_1.default.existsSync(gtPath)) {
                errors.push(`Ground Truth file missing for ${doc.documentId} at: ${gtPath}`);
            }
            else {
                try {
                    const gtData = JSON.parse(fs_1.default.readFileSync(gtPath, 'utf-8'));
                    if (gtData.documentId !== doc.documentId) {
                        errors.push(`GT documentId mismatch for ${doc.documentId}. Found: ${gtData.documentId}`);
                    }
                    if (gtData.category !== doc.category) {
                        errors.push(`GT category mismatch for ${doc.documentId}. Expected: ${doc.category}, GT: ${gtData.category}`);
                    }
                    if (!gtData.studentName) {
                        warnings.push(`GT studentName is empty for ${doc.documentId}`);
                    }
                }
                catch (e) {
                    errors.push(`Invalid Ground Truth JSON for ${doc.documentId}: ${e.message}`);
                }
            }
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }
}
exports.QualityChecker = QualityChecker;

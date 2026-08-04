"use strict";
/**
 * Academic Universe — Duplicate Detector
 * Detects exact SHA-256 duplicates and near-duplicate filenames/content.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuplicateDetector = void 0;
class DuplicateDetector {
    /** Detect exact SHA-256 duplicate groups among organized document records */
    detectSha256Duplicates(documents) {
        const hashMap = new Map();
        for (const doc of documents) {
            const existing = hashMap.get(doc.checksumSha256) || [];
            existing.push(doc);
            hashMap.set(doc.checksumSha256, existing);
        }
        const duplicateGroups = [];
        for (const [hash, docs] of hashMap.entries()) {
            if (docs.length > 1) {
                duplicateGroups.push({
                    checksumSha256: hash,
                    documents: docs.map((d) => ({
                        documentId: d.documentId,
                        filename: d.originalFilename,
                        path: d.organizedPath,
                    })),
                });
            }
        }
        return duplicateGroups;
    }
    /** Detect similar original filenames that might be duplicate uploads */
    detectFilenameSimilarities(documents) {
        const similarPairs = [];
        for (let i = 0; i < documents.length; i++) {
            for (let j = i + 1; j < documents.length; j++) {
                const a = documents[i];
                const b = documents[j];
                const normA = this.normalizeStr(a.originalFilename.replace(/\.[^/.]+$/, ''));
                const normB = this.normalizeStr(b.originalFilename.replace(/\.[^/.]+$/, ''));
                const sim = this.similarity(normA, normB);
                if (sim >= 0.70 && a.checksumSha256 !== b.checksumSha256) {
                    similarPairs.push({
                        docA: `${a.documentId} (${a.originalFilename})`,
                        docB: `${b.documentId} (${b.originalFilename})`,
                        similarity: parseFloat((sim * 100).toFixed(1)),
                    });
                }
            }
        }
        return similarPairs;
    }
    normalizeStr(str) {
        return str.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
    similarity(a, b) {
        if (a === b)
            return 1.0;
        const maxLen = Math.max(a.length, b.length);
        if (maxLen === 0)
            return 1.0;
        const dist = this.levenshtein(a, b);
        return 1 - dist / maxLen;
    }
    levenshtein(a, b) {
        const m = a.length;
        const n = b.length;
        const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
        for (let i = 0; i <= m; i++)
            dp[i][0] = i;
        for (let j = 0; j <= n; j++)
            dp[0][j] = j;
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
            }
        }
        return dp[m][n];
    }
}
exports.DuplicateDetector = DuplicateDetector;

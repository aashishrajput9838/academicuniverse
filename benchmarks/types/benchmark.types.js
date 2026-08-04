"use strict";
/**
 * Academic Universe — Benchmark & Evaluation Framework Types
 * Strict TypeScript Interfaces for Experimental Evaluation of DIC Subsystem
 *
 * CANONICAL HITL SEMANTICS (locked — do not change):
 *   Decision 1: reviewRequired=true && fieldsCorrected=0 is VALID.
 *               A reviewer may inspect without correcting.
 *   Decision 2: fieldsCorrected > 0 → reviewRequired MUST be true.
 *   Decision 3: reviewDurationSec measures human review time, NOT correction time.
 *   Decision 4: fallbackTriggered does NOT imply reviewRequired.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseMarksComparisonMode = void 0;
var CourseMarksComparisonMode;
(function (CourseMarksComparisonMode) {
    CourseMarksComparisonMode["PER_COURSE"] = "PER_COURSE";
    CourseMarksComparisonMode["PER_ARRAY"] = "PER_ARRAY";
})(fieldComparisonMode_1.CourseMarksComparisonMode || (fieldComparisonMode_1.CourseMarksComparisonMode = {}));
const fieldComparisonMode_1 = require("../validation/fieldComparisonMode");

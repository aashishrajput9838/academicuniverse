"use strict";
/**
 * Academic Universe — Synthetic Ground Truth Builder
 * Generates 100% consistent Ground Truth JSON schema files for every synthetic document.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroundTruthBuilder = void 0;
class GroundTruthBuilder {
    /** Build Ground Truth JSON schema matching benchmark expectation */
    static buildGroundTruth(data) {
        const currentSem = data.semesterRecords[0];
        const gt = {
            documentId: data.documentId,
            category: data.category,
            studentName: data.student.studentName,
            rollNumber: data.student.rollNumber,
            semester: currentSem ? currentSem.semesterName : 'Semester 1',
            sgpa: currentSem ? currentSem.sgpa : data.cgpa,
            cgpa: data.cgpa,
            issueDate: data.issueDate,
            courseMarks: currentSem
                ? currentSem.courseMarks.map((cm) => ({
                    courseCode: cm.courseCode,
                    courseName: cm.courseName,
                    marksObtained: cm.marksObtained,
                    maxMarks: cm.maxMarks,
                }))
                : [],
            customFields: {
                synthetic: true,
                generationSeed: data.seed,
                templateId: data.templateId,
                qualityProfile: data.qualityProfile.name,
                enrollmentNumber: data.student.enrollmentNumber,
                degreeName: data.student.degreeName,
                branchName: data.student.branchName,
                ...data.customData,
            },
        };
        return gt;
    }
}
exports.GroundTruthBuilder = GroundTruthBuilder;

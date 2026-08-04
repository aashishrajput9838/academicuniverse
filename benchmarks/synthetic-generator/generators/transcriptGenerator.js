"use strict";
/**
 * Academic Universe — Consolidated Transcript Generator
 * Generates multi-semester cumulative academic transcript PDFs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscriptGenerator = void 0;
const pdf_lib_1 = require("pdf-lib");
const templateEngine_1 = require("../core/templateEngine");
const qualityProfiles_1 = require("../core/qualityProfiles");
class TranscriptGenerator {
    static async generate(data, template) {
        const pdfDoc = await pdf_lib_1.PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]);
        const { width, height } = page.getSize();
        const font = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
        const primaryRgb = (0, templateEngine_1.hexToRgb)(template.config.primaryColor);
        await template.renderDocument(pdfDoc, page, data);
        page.drawText('OFFICIAL CONSOLIDATED TRANSCRIPT', {
            x: width / 2 - 130,
            y: height - 105,
            size: 14,
            font: fontBold,
            color: primaryRgb,
        });
        // Student Header
        page.drawRectangle({
            x: 40,
            y: height - 180,
            width: width - 80,
            height: 65,
            borderColor: primaryRgb,
            borderWidth: 1,
            color: (0, pdf_lib_1.rgb)(0.98, 0.98, 1),
        });
        const info = [
            `Name: ${data.student.studentName}`,
            `Roll No: ${data.student.rollNumber}`,
            `Enrollment: ${data.student.enrollmentNumber}`,
            `Degree: ${data.student.degreeName}`,
            `Branch: ${data.student.branchName}`,
            `Batch: ${data.student.batchYears}`,
        ];
        info.forEach((item, idx) => {
            const col = idx % 2 === 0 ? 50 : 310;
            const row = Math.floor(idx / 2);
            page.drawText(item, {
                x: col,
                y: height - 135 - row * 16,
                size: 8.5,
                font: fontBold,
                color: (0, pdf_lib_1.rgb)(0.2, 0.2, 0.2),
            });
        });
        // Render Semesters
        let currentY = height - 205;
        data.semesterRecords.forEach((sem) => {
            if (currentY < 150)
                return; // page boundary guard
            page.drawText(`${sem.semesterName.toUpperCase()}  (SGPA: ${sem.sgpa.toFixed(2)})`, {
                x: 40,
                y: currentY,
                size: 10,
                font: fontBold,
                color: primaryRgb,
            });
            currentY -= 15;
            sem.courseMarks.slice(0, 4).forEach((course) => {
                page.drawText(`- ${course.courseCode}: ${course.courseName} (${course.credits} Credits) — Grade: ${course.grade} (${course.marksObtained}/100)`, {
                    x: 50,
                    y: currentY,
                    size: 8,
                    font,
                    color: (0, pdf_lib_1.rgb)(0.3, 0.3, 0.3),
                });
                currentY -= 13;
            });
            currentY -= 10;
        });
        // Cumulative Summary Box
        page.drawRectangle({
            x: 40,
            y: 90,
            width: width - 80,
            height: 40,
            color: primaryRgb,
        });
        page.drawText(`CUMULATIVE GRADE POINT AVERAGE (CGPA): ${data.cgpa.toFixed(2)} / 10.0`, {
            x: 55,
            y: 112,
            size: 11,
            font: fontBold,
            color: (0, pdf_lib_1.rgb)(1, 1, 1),
        });
        page.drawText(`TOTAL CREDITS EARNED: 160   |   DIVISION: FIRST CLASS WITH DISTINCTION`, {
            x: 55,
            y: 98,
            size: 8.5,
            font,
            color: (0, pdf_lib_1.rgb)(0.9, 0.9, 1),
        });
        // Registrar sign
        page.drawText('Registrar (Evaluation)', {
            x: width - 180,
            y: 55,
            size: 9,
            font: fontBold,
            color: primaryRgb,
        });
        await qualityProfiles_1.QualityProfileManager.applyProfileAndDisclaimers(pdfDoc, page, data.qualityProfile, template.config.watermarkText);
        return pdfDoc.save();
    }
}
exports.TranscriptGenerator = TranscriptGenerator;

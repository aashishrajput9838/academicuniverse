"use strict";
/**
 * Academic Universe — Marksheet Document Generator
 * Generates realistic Semester Marksheet PDFs with subject tables, SGPA, CGPA, and QR code placeholders.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarksheetGenerator = void 0;
const pdf_lib_1 = require("pdf-lib");
const templateEngine_1 = require("../core/templateEngine");
const qualityProfiles_1 = require("../core/qualityProfiles");
class MarksheetGenerator {
    static async generate(data, template) {
        const pdfDoc = await pdf_lib_1.PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
        const { width, height } = page.getSize();
        const font = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
        const primaryRgb = (0, templateEngine_1.hexToRgb)(template.config.primaryColor);
        // Render template header
        await template.renderDocument(pdfDoc, page, data);
        // Document Title
        page.drawText('STATEMENT OF MARKS', {
            x: width / 2 - 90,
            y: height - 110,
            size: 16,
            font: fontBold,
            color: primaryRgb,
        });
        page.drawText('ACADEMIC EVALUATION RECORD', {
            x: width / 2 - 75,
            y: height - 125,
            size: 9,
            font,
            color: (0, pdf_lib_1.rgb)(0.4, 0.4, 0.4),
        });
        // Student Information Block
        const startY = height - 155;
        const col1 = 45;
        const col2 = 300;
        const studentInfo = [
            { label: 'Student Name:', value: data.student.studentName },
            { label: 'Roll Number:', value: data.student.rollNumber },
            { label: 'Enrollment No:', value: data.student.enrollmentNumber },
            { label: 'Degree / Program:', value: data.student.degreeName },
            { label: 'Branch / Specialization:', value: data.student.branchName },
            { label: 'Semester / Year:', value: data.semesterRecords[0]?.semesterName || 'Semester 1' },
        ];
        studentInfo.forEach((item, idx) => {
            const isRightCol = idx % 2 === 1;
            const row = Math.floor(idx / 2);
            const x = isRightCol ? col2 : col1;
            const y = startY - row * 18;
            page.drawText(item.label, { x, y, size: 9, font: fontBold, color: (0, pdf_lib_1.rgb)(0.2, 0.2, 0.2) });
            page.drawText(item.value, { x: x + 110, y, size: 9, font, color: (0, pdf_lib_1.rgb)(0.1, 0.1, 0.1) });
        });
        // Course Marks Table
        const tableY = startY - 70;
        const headers = ['Course Code', 'Course Title', 'Credits', 'Grade', 'Marks'];
        const colWidths = [80, 220, 50, 50, 60];
        // Table Header Background
        page.drawRectangle({
            x: 40,
            y: tableY - 5,
            width: width - 80,
            height: 20,
            color: primaryRgb,
        });
        let currentX = 45;
        headers.forEach((h, i) => {
            page.drawText(h, { x: currentX, y: tableY, size: 9, font: fontBold, color: (0, pdf_lib_1.rgb)(1, 1, 1) });
            currentX += colWidths[i];
        });
        // Table Rows
        const currentSem = data.semesterRecords[0];
        let rowY = tableY - 22;
        if (currentSem) {
            currentSem.courseMarks.forEach((course, rIdx) => {
                if (rIdx % 2 === 1) {
                    page.drawRectangle({
                        x: 40,
                        y: rowY - 4,
                        width: width - 80,
                        height: 18,
                        color: (0, pdf_lib_1.rgb)(0.96, 0.96, 0.98),
                    });
                }
                let rX = 45;
                page.drawText(course.courseCode, { x: rX, y: rowY, size: 8.5, font: fontBold, color: (0, pdf_lib_1.rgb)(0.2, 0.2, 0.2) });
                rX += colWidths[0];
                page.drawText(course.courseName, { x: rX, y: rowY, size: 8.5, font, color: (0, pdf_lib_1.rgb)(0.2, 0.2, 0.2) });
                rX += colWidths[1];
                page.drawText(String(course.credits), { x: rX + 15, y: rowY, size: 8.5, font, color: (0, pdf_lib_1.rgb)(0.2, 0.2, 0.2) });
                rX += colWidths[2];
                page.drawText(course.grade, { x: rX + 10, y: rowY, size: 8.5, font: fontBold, color: primaryRgb });
                rX += colWidths[3];
                page.drawText(`${course.marksObtained}/100`, { x: rX + 5, y: rowY, size: 8.5, font, color: (0, pdf_lib_1.rgb)(0.2, 0.2, 0.2) });
                rowY -= 20;
            });
        }
        // Summary Box (SGPA / CGPA)
        const summaryY = rowY - 15;
        page.drawRectangle({
            x: 40,
            y: summaryY - 25,
            width: width - 80,
            height: 35,
            borderColor: primaryRgb,
            borderWidth: 1,
            color: (0, pdf_lib_1.rgb)(0.98, 0.98, 1),
        });
        const sgpa = currentSem ? currentSem.sgpa : 8.5;
        page.drawText(`SEMESTER SGPA: ${sgpa.toFixed(2)}`, {
            x: 60,
            y: summaryY - 10,
            size: 11,
            font: fontBold,
            color: primaryRgb,
        });
        page.drawText(`CUMULATIVE CGPA: ${data.cgpa.toFixed(2)}`, {
            x: 320,
            y: summaryY - 10,
            size: 11,
            font: fontBold,
            color: primaryRgb,
        });
        page.drawText(`RESULT: PASSED IN FIRST DIVISION`, {
            x: 60,
            y: summaryY - 22,
            size: 8.5,
            font,
            color: (0, pdf_lib_1.rgb)(0.1, 0.6, 0.2),
        });
        // Signature Block & QR Code Placeholder
        const footerY = 90;
        // Synthetic QR Placeholder Box
        page.drawRectangle({
            x: 45,
            y: footerY - 20,
            width: 50,
            height: 50,
            borderColor: (0, pdf_lib_1.rgb)(0.5, 0.5, 0.5),
            borderWidth: 1,
        });
        page.drawText('QR VERIFY', { x: 50, y: footerY, size: 6, font, color: (0, pdf_lib_1.rgb)(0.5, 0.5, 0.5) });
        // Date
        page.drawText(`Date of Issue: ${data.issueDate}`, {
            x: 115,
            y: footerY,
            size: 9,
            font,
            color: (0, pdf_lib_1.rgb)(0.3, 0.3, 0.3),
        });
        // Controller of Examinations Signature
        page.drawText('Controller of Examinations', {
            x: width - 200,
            y: footerY - 10,
            size: 9,
            font: fontBold,
            color: primaryRgb,
        });
        page.drawText(template.config.name, {
            x: width - 200,
            y: footerY - 22,
            size: 8,
            font,
            color: (0, pdf_lib_1.rgb)(0.4, 0.4, 0.4),
        });
        // Apply quality profile distortion & mandatory research watermark/disclaimer
        await qualityProfiles_1.QualityProfileManager.applyProfileAndDisclaimers(pdfDoc, page, data.qualityProfile, template.config.watermarkText);
        return pdfDoc.save();
    }
}
exports.MarksheetGenerator = MarksheetGenerator;

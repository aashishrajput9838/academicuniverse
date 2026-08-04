"use strict";
/**
 * Academic Universe — Student ID Card Generator
 * Generates compact Student Identity Card PDFs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentIdGenerator = void 0;
const pdf_lib_1 = require("pdf-lib");
const templateEngine_1 = require("../core/templateEngine");
const qualityProfiles_1 = require("../core/qualityProfiles");
class StudentIdGenerator {
    static async generate(data, template) {
        const pdfDoc = await pdf_lib_1.PDFDocument.create();
        // ID Card Dimensions: ~3.375 x 2.125 inches (243 x 153 pt) on A4 canvas
        const page = pdfDoc.addPage([595.28, 841.89]);
        const { width, height } = page.getSize();
        const font = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
        const primaryRgb = (0, templateEngine_1.hexToRgb)(template.config.primaryColor);
        await template.renderDocument(pdfDoc, page, data);
        // Render Centered ID Card Box
        const cardWidth = 320;
        const cardHeight = 200;
        const cardX = (width - cardWidth) / 2;
        const cardY = (height - cardHeight) / 2;
        // Card Outer Outline
        page.drawRectangle({
            x: cardX,
            y: cardY,
            width: cardWidth,
            height: cardHeight,
            borderColor: primaryRgb,
            borderWidth: 2,
            color: (0, pdf_lib_1.rgb)(0.99, 0.99, 1),
        });
        // Card Header Bar
        page.drawRectangle({
            x: cardX,
            y: cardY + cardHeight - 35,
            width: cardWidth,
            height: 35,
            color: primaryRgb,
        });
        page.drawText(template.config.shortCode + ' — STUDENT IDENTITY CARD', {
            x: cardX + 15,
            y: cardY + cardHeight - 22,
            size: 10,
            font: fontBold,
            color: (0, pdf_lib_1.rgb)(1, 1, 1),
        });
        // Photo Box
        page.drawRectangle({
            x: cardX + 15,
            y: cardY + 35,
            width: 80,
            height: 95,
            borderColor: primaryRgb,
            borderWidth: 1,
            color: (0, pdf_lib_1.rgb)(0.95, 0.95, 0.95),
        });
        page.drawText('PHOTO', { x: cardX + 38, y: cardY + 78, size: 8, font, color: (0, pdf_lib_1.rgb)(0.5, 0.5, 0.5) });
        // Details Block
        const textX = cardX + 110;
        let textY = cardY + cardHeight - 50;
        const items = [
            { label: 'Name:', val: data.student.studentName },
            { label: 'Roll No:', val: data.student.rollNumber },
            { label: 'Branch:', val: data.student.branchName.substring(0, 24) },
            { label: 'Batch:', val: data.student.batchYears },
            { label: 'Blood Group:', val: data.student.bloodGroup },
            { label: 'Emergency Contact:', val: data.student.phone.substring(0, 15) },
        ];
        items.forEach((item) => {
            page.drawText(item.label, { x: textX, y: textY, size: 8, font: fontBold, color: (0, pdf_lib_1.rgb)(0.2, 0.2, 0.2) });
            page.drawText(item.val, { x: textX + 65, y: textY, size: 8, font, color: (0, pdf_lib_1.rgb)(0.1, 0.1, 0.1) });
            textY -= 14;
        });
        // Card Footer Bar
        page.drawRectangle({
            x: cardX,
            y: cardY,
            width: cardWidth,
            height: 18,
            color: primaryRgb,
        });
        page.drawText('Property of Institution — If found, please return to Registrar Office', {
            x: cardX + 15,
            y: cardY + 5,
            size: 6.5,
            font,
            color: (0, pdf_lib_1.rgb)(1, 1, 1),
        });
        await qualityProfiles_1.QualityProfileManager.applyProfileAndDisclaimers(pdfDoc, page, data.qualityProfile, template.config.watermarkText);
        return pdfDoc.save();
    }
}
exports.StudentIdGenerator = StudentIdGenerator;

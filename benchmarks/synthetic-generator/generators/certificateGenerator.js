"use strict";
/**
 * Academic Universe — Certificate Document Generator
 * Generates landscape/portrait certificates for Degree, Workshop, Internship, and Hackathon events.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertificateGenerator = void 0;
const pdf_lib_1 = require("pdf-lib");
const templateEngine_1 = require("../core/templateEngine");
const qualityProfiles_1 = require("../core/qualityProfiles");
class CertificateGenerator {
    static async generate(data, template) {
        const pdfDoc = await pdf_lib_1.PDFDocument.create();
        // Landscape A4 for certificates
        const page = pdfDoc.addPage([841.89, 595.28]);
        const { width, height } = page.getSize();
        const font = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
        const fontOblique = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.HelveticaOblique);
        const primaryRgb = (0, templateEngine_1.hexToRgb)(template.config.primaryColor);
        // Decorative Double Border
        page.drawRectangle({
            x: 25,
            y: 25,
            width: width - 50,
            height: height - 50,
            borderColor: primaryRgb,
            borderWidth: 3,
        });
        page.drawRectangle({
            x: 30,
            y: 30,
            width: width - 60,
            height: height - 60,
            borderColor: primaryRgb,
            borderWidth: 1,
        });
        // Header University Name
        page.drawText(template.config.name.toUpperCase(), {
            x: width / 2 - (template.config.name.length * 4.5),
            y: height - 80,
            size: 20,
            font: fontBold,
            color: primaryRgb,
        });
        page.drawText(template.config.location, {
            x: width / 2 - 80,
            y: height - 98,
            size: 10,
            font,
            color: (0, pdf_lib_1.rgb)(0.4, 0.4, 0.4),
        });
        // Title based on category
        let certTitle = 'CERTIFICATE OF COMPLETION';
        let line1 = 'This is to certify that';
        let line2 = `has successfully completed the requirements for the award of`;
        if (data.category === 'WORKSHOP_CERTIFICATE') {
            certTitle = 'WORKSHOP PARTICIPATION CERTIFICATE';
            line2 = 'has actively participated in the National Level Technical Workshop on';
        }
        else if (data.category === 'INTERNSHIP_CERTIFICATE') {
            certTitle = 'INTERNSHIP COMPLETION CERTIFICATE';
            line2 = 'has successfully completed the Professional Industry Internship in';
        }
        else if (data.category === 'HACKATHON_CERTIFICATE') {
            certTitle = 'HACKATHON EXCELLENCE AWARD';
            line2 = 'has secured a distinguished position in the National Hackathon Competition for';
        }
        page.drawText(certTitle, {
            x: width / 2 - (certTitle.length * 4),
            y: height - 150,
            size: 18,
            font: fontBold,
            color: primaryRgb,
        });
        page.drawText(line1, {
            x: width / 2 - 60,
            y: height - 190,
            size: 12,
            font: fontOblique,
            color: (0, pdf_lib_1.rgb)(0.3, 0.3, 0.3),
        });
        // Student Name (Prominent)
        page.drawText(data.student.studentName.toUpperCase(), {
            x: width / 2 - (data.student.studentName.length * 6),
            y: height - 230,
            size: 24,
            font: fontBold,
            color: primaryRgb,
        });
        // Underline name
        page.drawLine({
            start: { x: width / 2 - 150, y: height - 238 },
            end: { x: width / 2 + 150, y: height - 238 },
            thickness: 1,
            color: primaryRgb,
        });
        page.drawText(line2, {
            x: width / 2 - 180,
            y: height - 270,
            size: 12,
            font,
            color: (0, pdf_lib_1.rgb)(0.2, 0.2, 0.2),
        });
        // Course / Branch Name
        const courseTitle = String(data.customData?.courseName || data.student.degreeName || 'Advanced Document Intelligence Systems');
        page.drawText(courseTitle, {
            x: width / 2 - (courseTitle.length * 4.5),
            y: height - 305,
            size: 16,
            font: fontBold,
            color: primaryRgb,
        });
        // Roll number & Cumulative CGPA
        page.drawText(`Roll No: ${data.student.rollNumber}   |   Cumulative Grade Point Average: ${data.cgpa.toFixed(2)} / 10.0`, {
            x: width / 2 - 190,
            y: height - 345,
            size: 10,
            font,
            color: (0, pdf_lib_1.rgb)(0.3, 0.3, 0.3),
        });
        // Date and Signatures
        const sigY = 90;
        page.drawText(`Issued On: ${data.issueDate}`, {
            x: 70,
            y: sigY,
            size: 10,
            font,
            color: (0, pdf_lib_1.rgb)(0.3, 0.3, 0.3),
        });
        // Signature 1
        page.drawText('Dean Academic Affairs', {
            x: width / 2 - 60,
            y: sigY,
            size: 10,
            font: fontBold,
            color: (0, pdf_lib_1.rgb)(0.2, 0.2, 0.2),
        });
        // Signature 2
        page.drawText('Registrar / Director', {
            x: width - 200,
            y: sigY,
            size: 10,
            font: fontBold,
            color: (0, pdf_lib_1.rgb)(0.2, 0.2, 0.2),
        });
        // Apply quality profile & watermark
        await qualityProfiles_1.QualityProfileManager.applyProfileAndDisclaimers(pdfDoc, page, data.qualityProfile, template.config.watermarkText);
        return pdfDoc.save();
    }
}
exports.CertificateGenerator = CertificateGenerator;

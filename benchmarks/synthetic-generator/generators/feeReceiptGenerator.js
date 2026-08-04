"use strict";
/**
 * Academic Universe — Fee Receipt Document Generator
 * Generates Tuition & Academic Fee Payment Receipt PDFs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeeReceiptGenerator = void 0;
const pdf_lib_1 = require("pdf-lib");
const templateEngine_1 = require("../core/templateEngine");
const qualityProfiles_1 = require("../core/qualityProfiles");
class FeeReceiptGenerator {
    static async generate(data, template) {
        const pdfDoc = await pdf_lib_1.PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]);
        const { width, height } = page.getSize();
        const font = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
        const primaryRgb = (0, templateEngine_1.hexToRgb)(template.config.primaryColor);
        await template.renderDocument(pdfDoc, page, data);
        page.drawText('TUITION & ACADEMIC FEE RECEIPT', {
            x: width / 2 - 130,
            y: height - 105,
            size: 14,
            font: fontBold,
            color: primaryRgb,
        });
        const receiptNo = `REC-${data.seed.toString().padStart(6, '0')}`;
        page.drawText(`Receipt No: ${receiptNo}   |   Payment Date: ${data.issueDate}`, {
            x: width / 2 - 140,
            y: height - 125,
            size: 9,
            font,
            color: (0, pdf_lib_1.rgb)(0.3, 0.3, 0.3),
        });
        // Payer Details
        const infoY = height - 160;
        const details = [
            { label: 'Student Name:', val: data.student.studentName },
            { label: 'Roll Number:', val: data.student.rollNumber },
            { label: 'Program / Branch:', val: data.student.branchName },
            { label: 'Academic Session:', val: '2025-2026' },
            { label: 'Payment Mode:', val: 'Online NetBanking / UPI' },
            { label: 'Transaction ID:', val: `TXN${data.seed}99823` },
        ];
        details.forEach((d, idx) => {
            const col = idx % 2 === 0 ? 45 : 310;
            const row = Math.floor(idx / 2);
            page.drawText(d.label, { x: col, y: infoY - row * 18, size: 9, font: fontBold, color: (0, pdf_lib_1.rgb)(0.2, 0.2, 0.2) });
            page.drawText(d.val, { x: col + 95, y: infoY - row * 18, size: 9, font, color: (0, pdf_lib_1.rgb)(0.1, 0.1, 0.1) });
        });
        // Particulars Table
        const tableY = height - 230;
        page.drawRectangle({ x: 40, y: tableY - 5, width: width - 80, height: 20, color: primaryRgb });
        page.drawText('Particulars / Fee Head', { x: 50, y: tableY, size: 9, font: fontBold, color: (0, pdf_lib_1.rgb)(1, 1, 1) });
        page.drawText('Amount (INR)', { x: width - 150, y: tableY, size: 9, font: fontBold, color: (0, pdf_lib_1.rgb)(1, 1, 1) });
        const feeItems = [
            { head: 'Tuition Fee (Semester IV)', amount: 45000 },
            { head: 'Examination & Evaluation Fee', amount: 2500 },
            { head: 'Laboratory & Development Charge', amount: 5000 },
            { head: 'Library Membership Fee', amount: 1500 },
        ];
        let total = 0;
        let rY = tableY - 22;
        feeItems.forEach((item, idx) => {
            total += item.amount;
            if (idx % 2 === 1) {
                page.drawRectangle({ x: 40, y: rY - 3, width: width - 80, height: 18, color: (0, pdf_lib_1.rgb)(0.96, 0.96, 0.98) });
            }
            page.drawText(item.head, { x: 50, y: rY, size: 8.5, font, color: (0, pdf_lib_1.rgb)(0.2, 0.2, 0.2) });
            page.drawText(`Rs. ${item.amount.toLocaleString()}.00`, { x: width - 150, y: rY, size: 8.5, font, color: (0, pdf_lib_1.rgb)(0.2, 0.2, 0.2) });
            rY -= 20;
        });
        // Total Amount Box
        page.drawRectangle({ x: 40, y: rY - 10, width: width - 80, height: 25, color: primaryRgb });
        page.drawText('TOTAL AMOUNT PAID:', { x: 50, y: rY - 2, size: 10, font: fontBold, color: (0, pdf_lib_1.rgb)(1, 1, 1) });
        page.drawText(`Rs. ${total.toLocaleString()}.00`, { x: width - 150, y: rY - 2, size: 11, font: fontBold, color: (0, pdf_lib_1.rgb)(1, 1, 1) });
        // Payment Status Stamp
        page.drawRectangle({
            x: 60,
            y: 110,
            width: 120,
            height: 40,
            borderColor: (0, pdf_lib_1.rgb)(0.1, 0.6, 0.2),
            borderWidth: 2,
        });
        page.drawText('PAID & VERIFIED', { x: 72, y: 125, size: 10, font: fontBold, color: (0, pdf_lib_1.rgb)(0.1, 0.6, 0.2) });
        // Cashier sign
        page.drawText('Accounts Officer / Cashier', { x: width - 200, y: 120, size: 9, font: fontBold, color: primaryRgb });
        await qualityProfiles_1.QualityProfileManager.applyProfileAndDisclaimers(pdfDoc, page, data.qualityProfile, template.config.watermarkText);
        return pdfDoc.save();
    }
}
exports.FeeReceiptGenerator = FeeReceiptGenerator;

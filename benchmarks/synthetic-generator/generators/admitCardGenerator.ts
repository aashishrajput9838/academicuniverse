/**
 * Academic Universe — Admit Card Document Generator
 * Generates Exam Hall Tickets with student details, course list, and photo placeholder.
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { SyntheticDocumentData } from '../types/syntheticGenerator.types';
import { ITemplatePlugin, hexToRgb } from '../core/templateEngine';
import { QualityProfileManager } from '../core/qualityProfiles';

export class AdmitCardGenerator {
  static async generate(data: SyntheticDocumentData, template: ITemplatePlugin): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const primaryRgb = hexToRgb(template.config.primaryColor);

    await template.renderDocument(pdfDoc, page, data);

    page.drawText('EXAMINATION ADMIT CARD / HALL TICKET', {
      x: width / 2 - 140,
      y: height - 105,
      size: 14,
      font: fontBold,
      color: primaryRgb,
    });

    // Student Info Block
    const infoY = height - 135;

    const fields = [
      { label: 'Student Name:', val: data.student.studentName },
      { label: 'Roll Number:', val: data.student.rollNumber },
      { label: 'Enrollment No:', val: data.student.enrollmentNumber },
      { label: 'Father Name:', val: data.student.fatherName },
      { label: 'Degree & Branch:', val: `${data.student.degreeName} - ${data.student.branchName}` },
      { label: 'Exam Center:', val: `${template.config.name}, Main Campus, Hall 3` },
    ];

    fields.forEach((f, idx) => {
      page.drawText(f.label, { x: 45, y: infoY - idx * 17, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
      page.drawText(f.val, { x: 155, y: infoY - idx * 17, size: 9, font, color: rgb(0.1, 0.1, 0.1) });
    });

    // Photo Box Placeholder
    const photoX = width - 150;
    const photoY = height - 230;
    page.drawRectangle({
      x: photoX,
      y: photoY,
      width: 100,
      height: 120,
      borderColor: primaryRgb,
      borderWidth: 1,
      color: rgb(0.97, 0.97, 0.97),
    });
    page.drawText('AFFIX RECENT', { x: photoX + 15, y: photoY + 65, size: 7.5, font, color: rgb(0.5, 0.5, 0.5) });
    page.drawText('PASSPORT PHOTO', { x: photoX + 12, y: photoY + 52, size: 7.5, font, color: rgb(0.5, 0.5, 0.5) });

    // Permitted Examination Courses Table
    const tableY = height - 260;
    page.drawText('PERMITTED EXAMINATION COURSES:', {
      x: 45,
      y: tableY,
      size: 10,
      font: fontBold,
      color: primaryRgb,
    });

    const courses = data.semesterRecords[0]?.courseMarks || [];

    page.drawRectangle({
      x: 40,
      y: tableY - 25,
      width: width - 80,
      height: 20,
      color: primaryRgb,
    });

    page.drawText('Course Code', { x: 50, y: tableY - 20, size: 8.5, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Course Title', { x: 140, y: tableY - 20, size: 8.5, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Invigilator Sign', { x: 420, y: tableY - 20, size: 8.5, font: fontBold, color: rgb(1, 1, 1) });

    let rY = tableY - 42;
    courses.forEach((c, idx) => {
      page.drawText(c.courseCode, { x: 50, y: rY, size: 8.5, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
      page.drawText(c.courseName, { x: 140, y: rY, size: 8.5, font, color: rgb(0.2, 0.2, 0.2) });
      page.drawText('[  SIGN HERE  ]', { x: 420, y: rY, size: 7.5, font, color: rgb(0.6, 0.6, 0.6) });
      rY -= 18;
    });

    // Student & Controller Signature Line
    page.drawLine({ start: { x: 45, y: 110 }, end: { x: 180, y: 110 }, thickness: 1, color: rgb(0.5, 0.5, 0.5) });
    page.drawText("Candidate's Signature", { x: 55, y: 95, size: 8.5, font, color: rgb(0.3, 0.3, 0.3) });

    page.drawLine({ start: { x: width - 200, y: 110 }, end: { x: width - 65, y: 110 }, thickness: 1, color: rgb(0.5, 0.5, 0.5) });
    page.drawText('Controller of Examinations', { x: width - 190, y: 95, size: 8.5, font: fontBold, color: primaryRgb });

    await QualityProfileManager.applyProfileAndDisclaimers(
      pdfDoc,
      page,
      data.qualityProfile,
      template.config.watermarkText
    );

    return pdfDoc.save();
  }
}

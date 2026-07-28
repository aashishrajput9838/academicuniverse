/**
 * Academic Universe — Timetable Document Generator
 * Generates Class Schedule and Exam Date Sheet PDFs.
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { SyntheticDocumentData } from '../types/syntheticGenerator.types';
import { ITemplatePlugin, hexToRgb } from '../core/templateEngine';
import { QualityProfileManager } from '../core/qualityProfiles';

export class TimetableGenerator {
  static async generate(data: SyntheticDocumentData, template: ITemplatePlugin): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const primaryRgb = hexToRgb(template.config.primaryColor);

    await template.renderDocument(pdfDoc, page, data);

    const isExam = data.category === 'EXAM_TIMETABLE';
    const title = isExam ? 'END SEMESTER EXAMINATION SCHEDULE' : 'WEEKLY CLASS TIMETABLE';

    page.drawText(title, {
      x: width / 2 - (title.length * 4),
      y: height - 110,
      size: 14,
      font: fontBold,
      color: primaryRgb,
    });

    page.drawText(`Branch: ${data.student.branchName}   |   Semester: ${data.semesterRecords[0]?.semesterName || 'Semester 4'}`, {
      x: width / 2 - 160,
      y: height - 130,
      size: 9.5,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Schedule Table Header
    const tableY = height - 170;
    const headers = isExam
      ? ['Date', 'Time Slot', 'Course Code', 'Course Title', 'Exam Hall']
      : ['Day', '09:00 - 10:00', '10:00 - 11:00', '11:15 - 12:15', '02:00 - 04:00'];

    const colWidths = isExam ? [80, 90, 80, 180, 75]
      : [65, 110, 110, 110, 110];

    page.drawRectangle({
      x: 35,
      y: tableY - 5,
      width: width - 70,
      height: 22,
      color: primaryRgb,
    });

    let currentX = 40;
    headers.forEach((h, i) => {
      page.drawText(h, { x: currentX, y: tableY, size: 8.5, font: fontBold, color: rgb(1, 1, 1) });
      currentX += colWidths[i];
    });

    // Rows
    let rowY = tableY - 25;
    const daysOrDates = isExam
      ? ['2026-05-10', '2026-05-12', '2026-05-14', '2026-05-16', '2026-05-18']
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    const subjects = data.semesterRecords[0]?.courseMarks || [];

    daysOrDates.forEach((label, rIdx) => {
      if (rIdx % 2 === 1) {
        page.drawRectangle({
          x: 35,
          y: rowY - 4,
          width: width - 70,
          height: 20,
          color: rgb(0.96, 0.96, 0.98),
        });
      }

      let rX = 40;
      page.drawText(label, { x: rX, y: rowY, size: 8, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
      rX += colWidths[0];

      if (isExam) {
        const course = subjects[rIdx % subjects.length] || { courseCode: 'CS101', courseName: 'Data Structures' };
        page.drawText('10:00 AM - 01:00 PM', { x: rX, y: rowY, size: 8, font, color: rgb(0.3, 0.3, 0.3) });
        rX += colWidths[1];
        page.drawText(course.courseCode, { x: rX, y: rowY, size: 8, font: fontBold, color: primaryRgb });
        rX += colWidths[2];
        page.drawText(course.courseName, { x: rX, y: rowY, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
        rX += colWidths[3];
        page.drawText(`Hall ${101 + rIdx}`, { x: rX, y: rowY, size: 8, font, color: rgb(0.3, 0.3, 0.3) });
      } else {
        ['Lect: CS101', 'Lab: CS102', 'Lect: CS103', 'Project Lab'].forEach((slot) => {
          page.drawText(slot, { x: rX, y: rowY, size: 8, font, color: rgb(0.3, 0.3, 0.3) });
          rX += colWidths[1];
        });
      }

      rowY -= 22;
    });

    // Instructions Box
    page.drawRectangle({
      x: 35,
      y: 90,
      width: width - 70,
      height: 45,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
    });

    page.drawText('IMPORTANT INSTRUCTIONS:', { x: 45, y: 122, size: 8.5, font: fontBold, color: primaryRgb });
    page.drawText('1. Students must carry valid Student ID & Admit Card to all examination halls.', { x: 45, y: 110, size: 7.5, font, color: rgb(0.4, 0.4, 0.4) });
    page.drawText('2. Electronic gadgets & unauthorized materials are strictly prohibited.', { x: 45, y: 98, size: 7.5, font, color: rgb(0.4, 0.4, 0.4) });

    await QualityProfileManager.applyProfileAndDisclaimers(
      pdfDoc,
      page,
      data.qualityProfile,
      template.config.watermarkText
    );

    return pdfDoc.save();
  }
}

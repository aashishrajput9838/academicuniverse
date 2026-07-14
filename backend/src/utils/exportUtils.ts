import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, HeadingLevel } from 'docx';

export interface PaperData {
  topic?: string;
  abstract?: string;
  outline?: { title: string }[];
  content?: Record<string, string>;
  citations?: any[];
}

export async function generatePdfBuffer(paperData: PaperData): Promise<Buffer> {
  const doc = new jsPDF();
  const margin = 15;
  const maxLineWidth = 180;
  let cursorY = 20;

  const addText = (text: string, fontSize: number, isBold: boolean = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, maxLineWidth);
    lines.forEach((line: string) => {
      if (cursorY > 280) {
        doc.addPage();
        cursorY = 20;
      }
      doc.text(line, margin, cursorY);
      cursorY += fontSize * 0.5 + 2;
    });
    cursorY += 5;
  };

  addText(paperData.topic || 'Untitled Research Paper', 18, true);
  cursorY += 6;

  if (paperData.abstract) {
    addText('Abstract', 14, true);
    addText(paperData.abstract, 11);
  }

  (paperData.outline || []).forEach((section) => {
    addText(section.title, 14, true);
    if (paperData.content && paperData.content[section.title]) {
      addText(paperData.content[section.title], 11);
    } else {
      addText('Section content not yet drafted.', 11);
    }
  });

  if (paperData.citations && paperData.citations.length > 0) {
    addText('References', 14, true);
    paperData.citations.forEach((cite: any, i: number) => {
      addText(`[${i + 1}] ${cite.apa || ''}`.trim(), 10);
      if (cite.mla) addText(`    MLA: ${cite.mla}`, 9);
      if (cite.ieee) addText(`    IEEE: ${cite.ieee}`, 9);
    });
  }

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

export async function generateDocxBuffer(paperData: PaperData): Promise<Buffer> {
  const children: any[] = [];

  children.push(new Paragraph({
    text: paperData.topic || 'Untitled Research Paper',
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 400 }
  }));

  if (paperData.abstract) {
    children.push(new Paragraph({ text: 'Abstract', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 120 } }));
    children.push(new Paragraph({ text: paperData.abstract, spacing: { after: 200 } }));
  }

  (paperData.outline || []).forEach(section => {
    children.push(new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } }));
    if (paperData.content && paperData.content[section.title]) {
      const paragraphs = paperData.content[section.title].split('\n').filter(p => p.trim() !== '');
      paragraphs.forEach(p => children.push(new Paragraph({ text: p, spacing: { after: 120 } })));
    } else {
      children.push(new Paragraph({ text: 'Section content not yet drafted.', spacing: { after: 120 } }));
    }
  });

  if (paperData.citations && paperData.citations.length > 0) {
    children.push(new Paragraph({ text: 'References', heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 120 } }));
    paperData.citations.forEach((cite: any, i: number) => {
      children.push(new Paragraph({ text: `[${i + 1}] ${cite.apa || ''}` }));
      if (cite.mla) children.push(new Paragraph({ text: `MLA: ${cite.mla}` }));
      if (cite.ieee) children.push(new Paragraph({ text: `IEEE: ${cite.ieee}` }));
      children.push(new Paragraph({ text: '', spacing: { after: 120 } }));
    });
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

export default { generatePdfBuffer, generateDocxBuffer };

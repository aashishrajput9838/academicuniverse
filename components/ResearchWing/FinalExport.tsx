import React, { useState } from 'react';
import { ResearchPaperData } from '@shared-types/research';
import { FileText, Download, FileType2, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';

interface FinalExportProps {
    paperData: ResearchPaperData;
}

export default function FinalExport({ paperData }: FinalExportProps) {
    const { toast } = useToast();
    const [exportingPdf, setExportingPdf] = useState(false);
    const [exportingDocx, setExportingDocx] = useState(false);

    const exportToPDF = async () => {
        try {
            setExportingPdf(true);
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

            paperData.outline.forEach((section) => {
                addText(section.title, 14, true);
                if (paperData.content[section.title]) {
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

            const fileName = `${(paperData.topic || 'research_paper').substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
            const pdfBlob = doc.output('blob');
            saveAs(pdfBlob, fileName);
            toast({ title: 'PDF exported successfully' });
        } catch (error) {
            toast({ title: 'PDF Export Failed', variant: 'destructive' });
        } finally {
            setExportingPdf(false);
        }
    };

    const exportToDocx = async () => {
        try {
            setExportingDocx(true);
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

            paperData.outline.forEach(section => {
                children.push(new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } }));

                if (paperData.content[section.title]) {
                    const paragraphs = paperData.content[section.title].split('\n').filter(p => p.trim() !== '');
                    paragraphs.forEach(p => {
                        children.push(new Paragraph({ text: p, spacing: { after: 120 } }));
                    });
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

            const doc = new Document({
                sections: [{ properties: {}, children }]
            });

            const blob = await Packer.toBlob(doc);
            const fileName = `${(paperData.topic || 'research_paper').substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`;
            saveAs(blob, fileName);
            toast({ title: 'DOCX exported successfully' });
        } catch (error) {
            toast({ title: 'DOCX Export Failed', variant: 'destructive' });
        } finally {
            setExportingDocx(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-8 mb-8 text-center">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileText className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">Your Paper is Ready!</h2>
                <p className="text-slate-400 max-w-2xl mx-auto mb-8">
                    Congratulations on completing your research paper using the AI Research Wing. You can now download your fully formatted document in either PDF or Microsoft Word (DOCX) formats.
                </p>
                
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <button
                        onClick={exportToPDF}
                        disabled={exportingPdf}
                        className="flex items-center justify-center gap-3 px-8 py-4 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 rounded-xl font-medium transition disabled:opacity-60"
                    >
                        {exportingPdf ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileType2 className="w-5 h-5" />}
                        {exportingPdf ? 'Preparing PDF...' : 'Download as PDF'}
                    </button>
                    <button
                        onClick={exportToDocx}
                        disabled={exportingDocx}
                        className="flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 border border-blue-500 text-white rounded-xl font-medium transition shadow-lg shadow-blue-500/20 disabled:opacity-60"
                    >
                        {exportingDocx ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                        {exportingDocx ? 'Preparing DOCX...' : 'Download as Word (.docx)'}
                    </button>
                </div>
            </div>

            {/* Paper Preview */}
            <div className="bg-white text-black p-10 rounded-xl shadow-xl max-h-[600px] overflow-y-auto">
                <h1 className="text-2xl font-bold text-center mb-8">{paperData.topic || 'Untitled Document'}</h1>
                
                {paperData.abstract && (
                    <div className="mb-8">
                        <h2 className="text-lg font-bold mb-2">Abstract</h2>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{paperData.abstract}</p>
                    </div>
                )}

                {paperData.outline.map((section, idx) => (
                    <div key={idx} className="mb-6">
                        <h2 className="text-lg font-bold mb-2">{section.title}</h2>
                        {paperData.content[section.title] ? (
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{paperData.content[section.title]}</p>
                        ) : (
                            <p className="text-sm italic text-gray-400">[Section not written]</p>
                        )}
                    </div>
                ))}

                {paperData.citations && paperData.citations.length > 0 && (
                    <div className="mt-8 border-t pt-8">
                        <h2 className="text-lg font-bold mb-4">References</h2>
                        <ul className="list-decimal pl-5 space-y-2 text-sm text-gray-800">
                            {paperData.citations.map((cite: any, idx: number) => (
                                <li key={idx}>{cite.apa}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

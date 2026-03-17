import React from 'react';
import { ResearchPaperData } from '@/app/dashboard/student/research/page';
import { FileText, Download, FileType2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';

interface FinalExportProps {
    paperData: ResearchPaperData;
}

export default function FinalExport({ paperData }: FinalExportProps) {
    const { toast } = useToast();

    // Helper to extract plain text
    const compilePaperText = () => {
        let text = `Title: ${paperData.topic}\n\n`;
        
        if (paperData.abstract) {
            text += `Abstract\n${paperData.abstract}\n\n`;
        }

        // Add sections in order of outline
        paperData.outline.forEach(section => {
            text += `${section.title}\n`;
            if (paperData.content[section.title]) {
                text += `${paperData.content[section.title]}\n\n`;
            } else {
                text += `[Section not written yet]\n\n`;
            }
        });

        if (paperData.citations && paperData.citations.length > 0) {
            text += `References\n`;
            paperData.citations.forEach((cite: any, i: number) => {
                text += `[${i + 1}] ${cite.apa || cite.mla || cite.ieee}\n`;
            });
        }

        return text;
    };

    const exportToPDF = () => {
        try {
            const doc = new jsPDF();
            const margin = 15;
            const maxLineWidth = 180;
            let cursorY = 20;

            const addText = (text: string, fontSize: number, isBold: boolean = false) => {
                doc.setFontSize(fontSize);
                doc.setFont("helvetica", isBold ? "bold" : "normal");
                const lines = doc.splitTextToSize(text, maxLineWidth);
                
                lines.forEach((line: string) => {
                    if (cursorY > 280) {
                        doc.addPage();
                        cursorY = 20;
                    }
                    doc.text(line, margin, cursorY);
                    cursorY += fontSize * 0.5 + 2;
                });
                cursorY += 5; // Paragraph spacing
            };

            // Title
            addText(paperData.topic || 'Untitled Research Paper', 18, true);
            cursorY += 10;

            // Abstract
            if (paperData.abstract) {
                addText('Abstract', 14, true);
                addText(paperData.abstract, 11);
            }

            // Sections
            paperData.outline.forEach(section => {
                addText(section.title, 14, true);
                if (paperData.content[section.title]) {
                    addText(paperData.content[section.title], 11);
                } else {
                    addText('[Content missing]', 11);
                }
            });

            // References
            if (paperData.citations && paperData.citations.length > 0) {
                addText('References', 14, true);
                paperData.citations.forEach((cite: any, i: number) => {
                    addText(`[${i + 1}] ${cite.apa}`, 10);
                });
            }

            doc.save(`${paperData.topic.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'research_paper'}.pdf`);
            toast({ title: 'Exported as PDF' });
        } catch (error) {
            console.error(error);
            toast({ title: 'PDF Export Failed', variant: 'destructive' });
        }
    };

    const exportToDocx = () => {
        try {
            const children: any[] = [];

            // Title
            children.push(new Paragraph({
                text: paperData.topic || 'Untitled Research Paper',
                heading: HeadingLevel.HEADING_1,
                spacing: { after: 400 }
            }));

            // Abstract
            if (paperData.abstract) {
                children.push(new Paragraph({ text: 'Abstract', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 120 } }));
                children.push(new Paragraph({ text: paperData.abstract, spacing: { after: 200 } }));
            }

            // Outline Sections
            paperData.outline.forEach(section => {
                children.push(new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } }));
                
                if (paperData.content[section.title]) {
                    const paragraphs = paperData.content[section.title].split('\n').filter(p => p.trim() !== '');
                    paragraphs.forEach(p => {
                        children.push(new Paragraph({ text: p, spacing: { after: 120 } }));
                    });
                } else {
                    children.push(new Paragraph({ text: '[Section missing]', spacing: { after: 120 } }));
                }
            });

            // References
            if (paperData.citations && paperData.citations.length > 0) {
                children.push(new Paragraph({ text: 'References', heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 120 } }));
                paperData.citations.forEach((cite: any, i: number) => {
                    children.push(new Paragraph({ text: `[${i + 1}] ${cite.apa}`, spacing: { after: 120 } }));
                });
            }

            const doc = new Document({
                sections: [{ properties: {}, children }]
            });

            Packer.toBlob(doc).then((blob) => {
                saveAs(blob, `${paperData.topic.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'research_paper'}.docx`);
                toast({ title: 'Exported as DOCX' });
            });
        } catch (error) {
            console.error(error);
            toast({ title: 'DOCX Export Failed', variant: 'destructive' });
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
                        className="flex items-center justify-center gap-3 px-8 py-4 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 rounded-xl font-medium transition"
                    >
                        <FileType2 className="w-5 h-5" /> Download as PDF
                    </button>
                    <button 
                        onClick={exportToDocx}
                        className="flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 border border-blue-500 text-white rounded-xl font-medium transition shadow-lg shadow-blue-500/20"
                    >
                        <Download className="w-5 h-5" /> Download as Word (.docx)
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

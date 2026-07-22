import { DocxExtractionService } from '../docxExtraction.service';

jest.mock('pizzip', () => ({
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
        file: jest.fn().mockReturnValue(''),
    })),
}));

const PizZipMock = require('pizzip').default as jest.MockedFunction<any>;

function mockDocxXml(xml: string): void {
    PizZipMock.mockImplementation(() => ({
        file: jest.fn().mockReturnValue({
            asText: () => xml,
        }),
    }));
}

describe('DocxExtractionService', () => {
    let service: DocxExtractionService;

    beforeEach(() => {
        service = new DocxExtractionService();
        jest.clearAllMocks();
    });

    it('extracts paragraphs in order', async () => {
        const xml = `
            <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                <w:body>
                    <w:p><w:r><w:t>First</w:t></w:r></w:p>
                    <w:p><w:r><w:t>Second</w:t></w:r></w:p>
                    <w:p><w:r><w:t>Third</w:t></w:r></w:p>
                </w:body>
            </w:document>
        `;
        mockDocxXml(xml);
        const result = await service.extract(Buffer.from('docx'));

        expect(result.paragraphs).toHaveLength(3);
        expect(result.paragraphs[0].rawText).toBe('First');
        expect(result.paragraphs[1].rawText).toBe('Second');
        expect(result.paragraphs[2].rawText).toBe('Third');
    });

    it('extracts runs within paragraphs', async () => {
        const xml = `
            <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                <w:body>
                    <w:p>
                        <w:r><w:t>Hello</w:t></w:r>
                        <w:r><w:t>World</w:t></w:r>
                    </w:p>
                </w:body>
            </w:document>
        `;
        mockDocxXml(xml);
        const result = await service.extract(Buffer.from('docx'));

        expect(result.paragraphs).toHaveLength(1);
        expect(result.paragraphs[0].runs).toHaveLength(2);
        expect(result.paragraphs[0].runs[0].text).toBe('Hello');
        expect(result.paragraphs[0].runs[1].text).toBe('World');
    });

    it('detects bold formatting', async () => {
        const xml = `
            <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                <w:body>
                    <w:p>
                        <w:r><w:rPr><w:b/></w:rPr><w:t>Bold</w:t></w:r>
                    </w:p>
                </w:body>
            </w:document>
        `;
        mockDocxXml(xml);
        const result = await service.extract(Buffer.from('docx'));

        expect(result.runs[0].formatting.bold).toBe(true);
        expect(result.runs[0].formatting.italic).toBe(false);
        expect(result.runs[0].formatting.underline).toBe(false);
    });

    it('detects italic formatting', async () => {
        const xml = `
            <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                <w:body>
                    <w:p>
                        <w:r><w:rPr><w:i/></w:rPr><w:t>Italic</w:t></w:r>
                    </w:p>
                </w:body>
            </w:document>
        `;
        mockDocxXml(xml);
        const result = await service.extract(Buffer.from('docx'));

        expect(result.runs[0].formatting.italic).toBe(true);
    });

    it('extracts font and size', async () => {
        const xml = `
            <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                <w:body>
                    <w:p>
                        <w:r>
                            <w:rPr>
                                <w:rFonts w:ascii="Arial"/>
                                <w:sz w:val="24"/>
                            </w:rPr>
                            <w:t>Styled</w:t>
                        </w:r>
                    </w:p>
                </w:body>
            </w:document>
        `;
        mockDocxXml(xml);
        const result = await service.extract(Buffer.from('docx'));

        expect(result.runs[0].formatting.font).toBe('Arial');
        expect(result.runs[0].formatting.fontSize).toBe(12);
    });

    it('handles missing rPr', async () => {
        const xml = `
            <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                <w:body>
                    <w:p>
                        <w:r><w:t>Plain</w:t></w:r>
                    </w:p>
                </w:body>
            </w:document>
        `;
        mockDocxXml(xml);
        const result = await service.extract(Buffer.from('docx'));

        expect(result.runs[0].formatting.bold).toBe(false);
        expect(result.runs[0].formatting.italic).toBe(false);
        expect(result.runs[0].formatting.underline).toBe(false);
        expect(result.runs[0].formatting.font).toBeUndefined();
    });

    it('detects tables', async () => {
        const xml = `
            <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                <w:body>
                    <w:p><w:r><w:t>Before</w:t></w:r></w:p>
                    <w:p><w:tbl><w:tr><w:tc><w:t>Cell</w:t></w:tc></w:tr></w:tbl></w:p>
                    <w:p><w:r><w:t>After</w:t></w:r></w:p>
                </w:body>
            </w:document>
        `;
        mockDocxXml(xml);
        const result = await service.extract(Buffer.from('docx'));

        expect(result.hasTables).toBe(true);
    });

    it('detects images', async () => {
        const xml = `
            <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                <w:body>
                    <w:p>
                        <w:r>
                            <w:drawing>
                                <wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
                                    <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                                        <a:graphicData><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:blipFill/></pic:pic></a:graphicData>
                                    </a:graphic>
                                </wp:inline>
                            </w:drawing>
                            <w:t>Image text</w:t>
                        </w:r>
                    </w:p>
                </w:body>
            </w:document>
        `;
        mockDocxXml(xml);
        const result = await service.extract(Buffer.from('docx'));

        expect(result.hasImages).toBe(true);
    });

    it('counts placeholders', async () => {
        const xml = `
            <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                <w:body>
                    <w:p><w:r><w:t>Hello {{name}} and {{email}}</w:t></w:r></w:p>
                </w:body>
            </w:document>
        `;
        mockDocxXml(xml);
        const result = await service.extract(Buffer.from('docx'));

        expect(result.placeholderCount).toBe(2);
    });

    it('handles empty text nodes', async () => {
        const xml = `
            <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                <w:body>
                    <w:p>
                        <w:r><w:t></w:t></w:r>
                        <w:r><w:t>NonEmpty</w:t></w:r>
                    </w:p>
                </w:body>
            </w:document>
        `;
        mockDocxXml(xml);
        const result = await service.extract(Buffer.from('docx'));

        expect(result.paragraphs).toHaveLength(1);
        expect(result.paragraphs[0].runs).toHaveLength(2);
        expect(result.paragraphs[0].runs[0].text).toBe('');
        expect(result.paragraphs[0].runs[1].text).toBe('NonEmpty');
    });

    it('constructs structured location objects', async () => {
        const xml = `
            <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                <w:body>
                    <w:p>
                        <w:r><w:t>First</w:t></w:r>
                        <w:r><w:t>Second</w:t></w:r>
                    </w:p>
                    <w:p>
                        <w:r><w:t>Third</w:t></w:r>
                    </w:p>
                </w:body>
            </w:document>
        `;
        mockDocxXml(xml);
        const result = await service.extract(Buffer.from('docx'));

        expect(result.runs).toHaveLength(3);

        expect(result.runs[0].location).toEqual({
            paragraphIndex: 0,
            runIndex: 0,
            textIndex: 0,
            pathString: 'p[0]/r[0]/t[0]',
        });

        expect(result.runs[1].location).toEqual({
            paragraphIndex: 0,
            runIndex: 1,
            textIndex: 1,
            pathString: 'p[0]/r[1]/t[1]',
        });

        expect(result.runs[2].location).toEqual({
            paragraphIndex: 1,
            runIndex: 0,
            textIndex: 2,
            pathString: 'p[1]/r[0]/t[2]',
        });
    });

    it('handles special characters in text', async () => {
        const xml = `
            <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                <w:body>
                    <w:p>
                        <w:r><w:t>Kushagra &amp; Singh</w:t></w:r>
                    </w:p>
                </w:body>
            </w:document>
        `;
        mockDocxXml(xml);
        const result = await service.extract(Buffer.from('docx'));

        expect(result.paragraphs[0].rawText).toBe('Kushagra & Singh');
        expect(result.runs[0].text).toBe('Kushagra & Singh');
    });

    it('detects no placeholders when none exist', async () => {
        const xml = `
            <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                <w:body>
                    <w:p><w:r><w:t>Normal text without tags</w:t></w:r></w:p>
                </w:body>
            </w:document>
        `;
        mockDocxXml(xml);
        const result = await service.extract(Buffer.from('docx'));

        expect(result.placeholderCount).toBe(0);
    });

    it('never modifies the input buffer', async () => {
        const xml = `
            <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                <w:body>
                    <w:p><w:r><w:t>Test</w:t></w:r></w:p>
                </w:body>
            </w:document>
        `;
        const originalBuffer = Buffer.from('original-content');
        mockDocxXml(xml);

        await service.extract(originalBuffer);

        expect(originalBuffer.toString()).toBe('original-content');
    });

    it('extracts multiple formatting properties together', async () => {
        const xml = `
            <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                <w:body>
                    <w:p>
                        <w:r>
                            <w:rPr>
                                <w:b/>
                                <w:i/>
                                <w:u/>
                                <w:rFonts w:ascii="Times New Roman"/>
                                <w:sz w:val="28"/>
                                <w:color w:val="FF0000"/>
                            </w:rPr>
                            <w:t>Formatted</w:t>
                        </w:r>
                    </w:p>
                </w:body>
            </w:document>
        `;
        mockDocxXml(xml);
        const result = await service.extract(Buffer.from('docx'));

        expect(result.runs[0].formatting).toEqual({
            bold: true,
            italic: true,
            underline: true,
            font: 'Times New Roman',
            fontSize: 14,
            color: 'FF0000',
        });
    });
});

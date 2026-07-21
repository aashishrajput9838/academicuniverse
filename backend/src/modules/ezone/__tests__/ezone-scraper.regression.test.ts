import * as fs from 'fs';
import * as path from 'path';

const DIAGNOSTIC_DIR = path.join(__dirname, '../../../../tmp');

function getLatestDiagnosticDir(): string | null {
    if (!fs.existsSync(DIAGNOSTIC_DIR)) return null;
    
    const dirs = fs.readdirSync(DIAGNOSTIC_DIR)
        .filter(name => name.startsWith('ezone-diagnostic-'))
        .map(name => path.join(DIAGNOSTIC_DIR, name))
        .filter(p => fs.statSync(p).isDirectory())
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    
    return dirs[0] || null;
}

describe('Ezone Scraper Regression', () => {
    let diagnosticDir: string | null;

    beforeAll(() => {
        diagnosticDir = getLatestDiagnosticDir();
        if (!diagnosticDir) {
            console.warn('No diagnostic directory found. Run ezone sync first.');
        }
    });

    it('should have captured dashboard.html', () => {
        expect(diagnosticDir).not.toBeNull();
        const filePath = path.join(diagnosticDir!, 'dashboard.html');
        expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should have captured attendance.html', () => {
        expect(diagnosticDir).not.toBeNull();
        const filePath = path.join(diagnosticDir!, 'attendance.html');
        expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should have captured timetable.html', () => {
        expect(diagnosticDir).not.toBeNull();
        const filePath = path.join(diagnosticDir!, 'timetable.html');
        expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should have report.json with discovered URLs', () => {
        expect(diagnosticDir).not.toBeNull();
        const reportPath = path.join(diagnosticDir!, 'report.json');
        expect(fs.existsSync(reportPath)).toBe(true);
        
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
        expect(report.pages).toBeDefined();
        expect(report.pages.length).toBeGreaterThanOrEqual(3);
    });

    it('dashboard should contain profile data', () => {
        expect(diagnosticDir).not.toBeNull();
        const html = fs.readFileSync(path.join(diagnosticDir!, 'dashboard.html'), 'utf-8');
        expect(html).toContain('System ID');
        expect(html).toContain('Department');
        expect(html).toContain('School');
        expect(html).toContain('Program');
        expect(html).toContain('Semester');
    });

    it('attendance should contain System ID and course data', () => {
        expect(diagnosticDir).not.toBeNull();
        const html = fs.readFileSync(path.join(diagnosticDir!, 'attendance.html'), 'utf-8');
        expect(html).toContain('System ID');
        expect(html).toContain('Course Name');
    });

    it('timetable should contain time slots', () => {
        expect(diagnosticDir).not.toBeNull();
        const html = fs.readFileSync(path.join(diagnosticDir!, 'timetable.html'), 'utf-8');
        expect(html).toContain('Time Table');
        expect(html).toContain('09:00');
    });

    it('marks page should NOT use hardcoded /admin/marks URL if present', () => {
        expect(diagnosticDir).not.toBeNull();
        const report = JSON.parse(fs.readFileSync(path.join(diagnosticDir!, 'report.json'), 'utf-8'));
        const marksPage = report.pages.find((p: any) => p.filename === 'marks');
        if (marksPage) {
            expect(marksPage.url).not.toBe('https://student.sharda.ac.in/admin/marks');
        }
    });

    it('dashboard should contain semester value', () => {
        expect(diagnosticDir).not.toBeNull();
        const html = fs.readFileSync(path.join(diagnosticDir!, 'dashboard.html'), 'utf-8');
        expect(html).toContain('Semester');
        expect(html).toMatch(/<strong>\s*Semester\s*<\/strong>\s*S7/i);
    });

    it('attendance page should contain per-course attendance cards with progress bars', () => {
        expect(diagnosticDir).not.toBeNull();
        const html = fs.readFileSync(path.join(diagnosticDir!, 'attendance.html'), 'utf-8');
        expect(html).toContain('subjectcard');
        expect(html).toContain('attendence_li');
        expect(html).toContain('aria-valuenow');
        expect(html).toContain('Machine Learning');
    });

    it('dashboard should contain CGPA chart or script', () => {
        expect(diagnosticDir).not.toBeNull();
        const html = fs.readFileSync(path.join(diagnosticDir!, 'dashboard.html'), 'utf-8');
        expect(html).toContain('cgpa');
        expect(html).toMatch(/chartcgpa|var\s+cgpa/i);
    });
});

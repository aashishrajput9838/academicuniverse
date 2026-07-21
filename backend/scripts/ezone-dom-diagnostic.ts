/**
 * RB-007 — Ezone DOM Diagnostic Capture Script
 *
 * Performs a fresh OTP flow against the Sharda University Ezone portal,
 * then captures dashboard/attendance/marks/timetable pages as HTML + PNG.
 *
 * This script does NOT modify any application data.
 *
 * Usage:
 *   npx ts-node backend/scripts/ezone-dom-diagnostic.ts \
 *     --system-id 2023329421 \
 *     --otp 123456 \
 *     --userId 6a58b65d816b680ebffb8b89 \
 *     --organizationId 6a58b59aa8c379340d290b31
 *
 * Output:
 *   backend/tmp/ezone-diagnostic-<timestamp>/
 *     dashboard.html, dashboard.png
 *     attendance.html, attendance.png
 *     marks.html, marks.png
 *     timetable.html, timetable.png
 *     report.json
 */

import { EzoneSessionProvider } from '../src/modules/ezone/providers/ezone-session.provider';
import { EzoneScraper } from '../src/modules/ezone/scrapers/ezone.scraper';
import { Logger } from '../src/shared/utils';
import * as fs from 'fs';
import * as path from 'path';

const logger = new Logger('EzoneDomDiagnostic');

interface CaptureOptions {
    systemId: string;
    otp: string;
    userId: string;
    organizationId: string;
    firebaseUid?: string;
}

function parseArgs(): CaptureOptions {
    const args = process.argv.slice(2);
    const options: CaptureOptions = {
        systemId: '',
        otp: '',
        userId: '',
        organizationId: ''
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--system-id' && args[i + 1]) options.systemId = args[++i];
        else if (arg === '--otp' && args[i + 1]) options.otp = args[++i];
        else if (arg === '--userId' && args[i + 1]) options.userId = args[++i];
        else if (arg === '--organizationId' && args[i + 1]) options.organizationId = args[++i];
        else if (arg === '--firebaseUid' && args[i + 1]) options.firebaseUid = args[++i];
    }

    if (!options.systemId || !options.otp || !options.userId || !options.organizationId) {
        console.error('Missing required arguments. All of the following are required:');
        console.error('  --system-id <systemId>');
        console.error('  --otp <otp>');
        console.error('  --userId <userId>');
        console.error('  --organizationId <organizationId>');
        console.error('');
        console.error('Example:');
        console.error('  npx ts-node backend/scripts/ezone-dom-diagnostic.ts \\');
        console.error('    --system-id 2023329421 \\');
        console.error('    --otp 123456 \\');
        console.error('    --userId 6a58b65d816b680ebffb8b89 \\');
        console.error('    --organizationId 6a58b59aa8c379340d290b31');
        process.exit(1);
    }

    return options;
}

async function ensureAuthenticated(options: CaptureOptions): Promise<{ sessionId: string; page: any }> {
    const sessionProvider = EzoneSessionProvider.getInstance();

    logger.info('Starting fresh OTP flow...');
    const sessionId = await sessionProvider.triggerOtp(
        options.systemId,
        options.userId,
        options.organizationId,
        options.firebaseUid
    );

    await sessionProvider.verifyOtp(
        sessionId,
        options.otp,
        options.userId,
        options.organizationId,
        options.firebaseUid
    );

    const page = await sessionProvider.getAuthenticatedPage(sessionId);

    logger.info(`Authenticated successfully. Session ID: ${sessionId}`);
    return { sessionId, page };
}

async function capturePage(
    page: any,
    url: string,
    outputDir: string,
    filename: string
): Promise<any> {
    logger.info(`Capturing: ${url}`);

    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    const title = await page.title();
    const currentUrl = page.url();

    const html = await page.content();

    const screenshotPath = path.join(outputDir, `${filename}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const htmlPath = path.join(outputDir, `${filename}.html`);
    fs.writeFileSync(htmlPath, html, 'utf-8');

    // Extract metadata
    const metadata = await page.evaluate(() => {
        const clean = (text: string) => text?.trim().replace(/\s+/g, ' ') || '';

        const findLabelValue = (label: string) => {
            const elements = Array.from(document.querySelectorAll('td, th, span, div, p, strong, b, label'));
            const target = elements.find((el: any) => {
                const text = el.textContent?.trim().toUpperCase() || '';
                return text === label.toUpperCase() || text === (label.toUpperCase() + ':');
            });
            if (!target) return 'N/A';
            if (target.nextElementSibling) return clean(target.nextElementSibling.textContent || 'N/A');
            const parent = target.parentElement;
            if (parent && parent.nextElementSibling) return clean(parent.nextElementSibling.textContent || 'N/A');
            return 'N/A';
        };

        const getTableHeaders = () => {
            const tables = Array.from(document.querySelectorAll('table'));
            return tables.map((table) => {
                const headers = Array.from(table.querySelectorAll('th, tr:first-child td'))
                    .map((th) => clean(th.textContent || ''));
                return { headers, count: headers.length };
            });
        };

        const getProfileSelectors = () => {
            const ids: string[] = [];
            const classes: string[] = [];
            const keywords = ['student', 'profile', 'system', 'department', 'semester', 'program', 'school'];

            document.querySelectorAll('[id], [class]').forEach((el) => {
                const id = (el as HTMLElement).id?.toLowerCase() || '';
                const className = Array.from((el as HTMLElement).classList)
                    .filter((c) => keywords.some((k) => c.toLowerCase().includes(k)))
                    .join(' ');

                if (id && keywords.some((k) => id.includes(k))) ids.push(id);
                if (className) classes.push(className);
            });

            return { ids: Array.from(new Set(ids)), classes: Array.from(new Set(classes)) };
        };

        return {
            title: document.title,
            url: window.location.href,
            tableHeaders: getTableHeaders(),
            profileSelectors: getProfileSelectors(),
            studentName: (() => {
                const selectors = ['.user-name', '.profile-name', '.student-name', '#student_name', '.navbar-user .name'];
                for (const s of selectors) {
                    const el = document.querySelector(s);
                    if (el) return clean(el.textContent || '');
                }
                return 'N/A';
            })(),
            systemId: findLabelValue('System ID'),
            department: findLabelValue('Department'),
            school: findLabelValue('School'),
            program: findLabelValue('Program'),
            semester: findLabelValue('Semester'),
            status: findLabelValue('Status')
        };
    });

    logger.info(`Captured: ${filename} (${(html.length / 1024).toFixed(1)} KB)`);

    return {
        filename,
        title,
        url: currentUrl,
        htmlPath,
        screenshotPath,
        metadata
    };
}

async function main() {
    const options = parseArgs();
    const outputBase = path.join(process.cwd(), 'backend', 'tmp');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(outputBase, `ezone-diagnostic-${timestamp}`);

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    logger.info(`Output directory: ${outputDir}`);

    const { sessionId, page } = await ensureAuthenticated(options);

    const pagesToCapture = [
        { url: 'https://student.sharda.ac.in/admin/home', filename: 'dashboard' },
        { url: 'https://student.sharda.ac.in/admin/attendance', filename: 'attendance' },
        { url: 'https://student.sharda.ac.in/admin/marks', filename: 'marks' },
        { url: 'https://student.sharda.ac.in/admin/timetable', filename: 'timetable' }
    ];

    const results: any[] = [];
    for (const pageConfig of pagesToCapture) {
        try {
            const result = await capturePage(page, pageConfig.url, outputDir, pageConfig.filename);
            results.push(result);
        } catch (err) {
            logger.error(`Failed to capture ${pageConfig.filename}:`, err);
            results.push({
                filename: pageConfig.filename,
                url: pageConfig.url,
                error: (err as Error).message
            });
        }
    }

    // Save summary report
    const report = {
        sessionId,
        outputDir,
        capturedAt: new Date().toISOString(),
        pages: results
    };

    const reportPath = path.join(outputDir, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

    logger.info(`Diagnostic complete. Report saved to: ${reportPath}`);
    logger.info(`Output directory: ${outputDir}`);

    // Print summary
    console.log('\n=== Ezone DOM Diagnostic Summary ===');
    console.log(`Session ID: ${sessionId}`);
    console.log(`Output: ${outputDir}`);
    results.forEach((r) => {
        if (r.error) {
            console.log(`  ${r.filename}: FAILED - ${r.error}`);
        } else {
            console.log(`  ${r.filename}: OK (${(fs.statSync(r.htmlPath).size / 1024).toFixed(1)} KB)`);
        }
    });

    // Do NOT cleanup session — allow inspection
    logger.info('Session preserved for inspection. Manual cleanup required if needed.');
    process.exit(0);
}

main().catch((err) => {
    logger.error('Diagnostic script failed:', err);
    process.exit(1);
});

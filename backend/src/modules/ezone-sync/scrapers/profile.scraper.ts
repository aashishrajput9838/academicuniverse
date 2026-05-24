import { Page } from 'playwright';
import { EzoneScraper } from './ezone.scraper';

export class ProfileScraper extends EzoneScraper {
    async scrape(page: Page): Promise<any> {
        const html = await this.getHtml(page, 'https://ezone.sharda.ac.in/student/profile');
        const $ = this.loadCheerio(html);

        // Example selectors - these MUST be updated based on actual Ezone HTML
        return {
            fullName: $('.student-name').text().trim(),
            ezoneStudentId: $('.student-id').text().trim(),
            semester: parseInt($('.current-semester').text().trim()) || 1,
            department: $('.department').text().trim(),
            cgpa: parseFloat($('.cgpa-value').text().trim()) || 0,
        };
    }
}

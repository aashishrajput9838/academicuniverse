import { Page } from 'playwright';
import * as cheerio from 'cheerio';
import { Logger } from '../../../shared/utils';

const logger = new Logger('EzoneScraper');

export abstract class EzoneScraper {
    protected async getHtml(page: Page, url: string): Promise<string> {
        await page.goto(url, { waitUntil: 'networkidle' });
        return await page.content();
    }

    protected loadCheerio(html: string): cheerio.CheerioAPI {
        return cheerio.load(html);
    }
}

import { Page, Request, Response } from 'playwright';
import { Logger } from '../../../shared/utils';
import * as fs from 'fs';
import * as path from 'path';

const logger = new Logger('EzoneExplorer');

interface DiscoveryRoute {
    name: string;
    url: string;
    heading: string;
    tables: any[];
    cards: any[];
    apis: { url: string; method: string; status: number }[];
    suggestedSchema: any;
}

export class EzoneExplorer {
    private report: DiscoveryRoute[] = [];
    private capturedRequests: { url: string; method: string; status: number }[] = [];

    /**
     * Launch Explorer Mode to discover all available data routes
     */
    async explore(page: Page, userId: string): Promise<string> {
        try {
            logger.info('🚀 Launching Ezone Explorer Mode...');
            
            // 1. Setup Request Interception for API discovery
            page.on('request', request => {
                if (request.resourceType() === 'fetch' || request.resourceType() === 'xhr') {
                    this.capturedRequests.push({
                        url: request.url(),
                        method: request.method(),
                        status: 0 // Will be updated on response
                    });
                }
            });

            page.on('response', response => {
                const req = response.request();
                const captured = this.capturedRequests.find(r => r.url === req.url() && r.method === req.method());
                if (captured) captured.status = response.status();
            });

            // 2. Discover Sidebar Routes
            logger.info('Scanning sidebar for available modules...');
            const routes = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a[href*="/admin/"], .sidebar-menu a, .nav-link'));
                return links
                    .map(a => ({
                        name: a.textContent?.trim() || 'Unknown',
                        href: (a as HTMLAnchorElement).href
                    }))
                    .filter(link => 
                        link.href.includes('/admin/') && 
                        !link.href.includes('logout') && 
                        !link.href.includes('javascript') &&
                        link.name.length > 2
                    );
            });

            logger.info(`Found ${routes.length} unique routes to explore.`);

            // 3. Visit each route and collect data
            for (const route of routes) {
                try {
                    logger.info(`Exploring: ${route.name} (${route.href})`);
                    this.capturedRequests = []; // Clear for this route
                    
                    await page.goto(route.href, { waitUntil: 'networkidle', timeout: 30000 });
                    await page.waitForTimeout(3000); // Allow JS to render components

                    const routeData = await page.evaluate((rName) => {
                        const getTables = () => {
                            return Array.from(document.querySelectorAll('table')).map(table => {
                                const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent?.trim());
                                const rows = Array.from(table.querySelectorAll('tr')).slice(0, 3).map(tr => 
                                    Array.from(tr.querySelectorAll('td')).map(td => td.textContent?.trim())
                                );
                                return { headers, sampleRows: rows.filter(r => r.length > 0) };
                            });
                        };

                        const getCards = () => {
                            return Array.from(document.querySelectorAll('.card, .widget, .box, .panel')).map(card => ({
                                title: card.querySelector('.card-title, .box-title, h3, h4')?.textContent?.trim() || 'Untitled Card',
                                content: card.textContent?.trim().substring(0, 100) + '...'
                            }));
                        };

                        const suggestSchema = (tables: any[]) => {
                            if (tables.length === 0) return { type: 'GenericWidget', fields: [] };
                            const mainTable = tables[0];
                            return {
                                type: 'Collection',
                                fields: mainTable.headers.map((h: string) => h?.toLowerCase().replace(/\s+/g, '_') || 'field')
                            };
                        };

                        const tables = getTables();
                        return {
                            name: rName,
                            url: window.location.href,
                            heading: document.querySelector('h1, h2, .page-header')?.textContent?.trim() || 'N/A',
                            tables: tables,
                            cards: getCards(),
                            suggestedSchema: suggestSchema(tables)
                        };
                    }, route.name);

                    this.report.push({
                        ...routeData,
                        apis: [...this.capturedRequests]
                    });

                } catch (routeErr) {
                    logger.error(`Failed to explore route ${route.name}:`, routeErr);
                }
            }

            // 4. Save Discovery Report
            const reportName = `ezone-discovery-report-${userId}-${Date.now()}.json`;
            const reportPath = path.join(process.cwd(), reportName);
            fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2));
            
            logger.info(`✅ Explorer Mode Finished. Report saved to ${reportName}`);
            return reportName;

        } catch (error: any) {
            logger.error('Explorer Mode Fatal Error:', error);
            throw error;
        }
    }
}

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
    async explore(page: Page, userId: string, organizationId: string, sessionId: string, firebaseUid?: string): Promise<string> {
        const ezoneLogger = (await import('../services/ezone-logger.service')).EzoneLogger.getInstance();
        
        try {
            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'action', '🚀 Launching Ezone Explorer Mode...', { category: 'DISCOVERY', progress: 0 }, firebaseUid);
            
            // 1. Setup Request Interception for API discovery
            let apisFound = 0;
            page.on('request', request => {
                if (request.resourceType() === 'fetch' || request.resourceType() === 'xhr') {
                    apisFound++;
                    this.capturedRequests.push({
                        url: request.url(),
                        method: request.method(),
                        status: 0 // Will be updated on response
                    });
                }
            });

            // 2. Discover Sidebar Routes
            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'action', 'Scanning sidebar for available modules...', { category: 'DISCOVERY', actionType: 'page.evaluate', progress: 10 }, firebaseUid);
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

            await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'success', `Found ${routes.length} unique routes to explore.`, { category: 'DISCOVERY', routesDiscovered: routes.length, progress: 20 }, firebaseUid);

            // 3. Visit each route and collect data
            let currentRouteIdx = 0;
            for (const route of routes) {
                try {
                    currentRouteIdx++;
                    const progress = Math.round(20 + (currentRouteIdx / routes.length) * 70);
                    
                    await ezoneLogger.logSyncStep(userId, organizationId, sessionId, 'action', `[${currentRouteIdx}/${routes.length}] Exploring: ${route.name}...`, { 
                        category: 'DISCOVERY', 
                        actionType: 'page.goto', 
                        progress,
                        routesDiscovered: routes.length,
                        apisFound
                    }, firebaseUid);

                    this.capturedRequests = []; // Clear for this route
                    
                    await page.goto(route.href, { waitUntil: 'networkidle', timeout: 30000 });
                    await page.waitForTimeout(2000);

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

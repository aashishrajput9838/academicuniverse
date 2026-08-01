import { google } from 'googleapis';
import { Logger } from '../../../shared/utils';

const logger = new Logger('GoogleSheetsService');

export class GoogleSheetsService {
    private static instance: GoogleSheetsService;
    private sheets: any = null;
    private drive: any = null;
    private spreadsheetId: string | null = null;
    private readonly SPREADSHEET_NAME = 'AcademicUniverse_EzoneSync';
    private isAvailable: boolean = false;

    private constructor() {
        try {
            // Check if required credentials are available and not empty
            const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
            const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
            const projectId = process.env.GOOGLE_PROJECT_ID;

            if (!clientEmail || !privateKey || !projectId || 
                clientEmail.trim() === '' || privateKey.trim() === '' || projectId.trim() === '') {
                logger.warn('Google Sheets integration disabled: Missing or empty required credentials');
                this.isAvailable = false;
                return;
            }

            const credentials = {
                type: 'service_account',
                project_id: projectId,
                private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
                private_key: (() => {
                    const raw = privateKey.replace(/\\n/g, '\n');
                    return raw;
                })(),
                client_email: clientEmail,
                client_id: process.env.GOOGLE_CLIENT_ID,
                auth_uri: 'https://accounts.google.com/o/oauth2/auth',
                token_uri: 'https://oauth2.googleapis.com/token',
                auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
                client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL
            };

            // Validate that private_key and client_email are present in credentials object
            if (!credentials.private_key || !credentials.client_email) {
                logger.warn('Google Sheets integration disabled: Missing private_key or client_email in credentials');
                this.isAvailable = false;
                return;
            }

            const auth = new google.auth.GoogleAuth({
                credentials,
                scopes: [
                    'https://www.googleapis.com/auth/spreadsheets',
                    'https://www.googleapis.com/auth/drive.file'
                ],
            });
            this.sheets = google.sheets({ version: 'v4', auth });
            this.drive = google.drive({ version: 'v3', auth });
            this.isAvailable = true;
            logger.info('Google Sheets integration initialized successfully');
        } catch (error) {
            logger.warn('Google Sheets integration disabled due to initialization error:', error);
            this.isAvailable = false;
        }
    }

    public static getInstance(): GoogleSheetsService {
        if (!GoogleSheetsService.instance) {
            GoogleSheetsService.instance = new GoogleSheetsService();
        }
        return GoogleSheetsService.instance;
    }

    public isEnabled(): boolean {
        return this.isAvailable;
    }

    /**
     * Ensures the spreadsheet exists and has the required sheets
     */
    public async initialize(): Promise<string | null> {
        if (!this.isAvailable) return null;
        if (this.spreadsheetId) return this.spreadsheetId;

        if (process.env.GOOGLE_SHEET_ID) {
            this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
            logger.info(`Using provided Google Sheet ID: ${this.spreadsheetId}`);
            try {
                await this.ensureSheetsExist();
            } catch (err: any) {
                logger.warn('Failed to ensure sheets exist, disabling Google Sheets integration:', err.message);
                this.isAvailable = false;
                return null;
            }
            return this.spreadsheetId;
        }

        try {
            const response = await this.drive.files.list({
                q: `name = '${this.SPREADSHEET_NAME}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
                fields: 'files(id, name)',
                spaces: 'drive',
            });

            if (response.data.files && response.data.files.length > 0) {
                this.spreadsheetId = response.data.files[0].id;
                logger.info(`Found existing spreadsheet: ${this.spreadsheetId}`);
            } else {
                const resource = {
                    properties: {
                        title: this.SPREADSHEET_NAME,
                    },
                };
                const spreadsheet = await this.sheets.spreadsheets.create({
                    resource,
                    fields: 'spreadsheetId',
                });
                this.spreadsheetId = spreadsheet.data.spreadsheetId;
                logger.info(`Created new spreadsheet: ${this.spreadsheetId}`);

                await this.ensureSheetsExist();
            }

            return this.spreadsheetId!;
        } catch (error: any) {
            logger.warn('Failed to initialize Google Sheets, disabling integration:', error.message);
            this.isAvailable = false;
            return null;
        }
    }

    private async ensureSheetsExist(): Promise<void> {
        if (!this.isAvailable || !this.spreadsheetId) return;
        try {
            const requiredSheets = [
                'StudentProfile', 'Attendance', 'Subjects', 'CAMarks', 
                'Timetable', 'Holidays', 'SyncLogs'
            ];

            const spreadsheet = await this.sheets.spreadsheets.get({
                spreadsheetId: this.spreadsheetId,
            });

            const existingSheets = spreadsheet.data.sheets.map((s: any) => s.properties.title);
            const requests = [];

            for (const sheetName of requiredSheets) {
                if (!existingSheets.includes(sheetName)) {
                    requests.push({
                        addSheet: {
                            properties: { title: sheetName }
                        }
                    });
                }
            }

            if (requests.length > 0) {
                await this.sheets.spreadsheets.batchUpdate({
                    spreadsheetId: this.spreadsheetId,
                    resource: { requests },
                });
                
                for (const sheetName of requiredSheets) {
                    if (!existingSheets.includes(sheetName)) {
                        await this.initializeSheetHeaders(sheetName);
                    }
                }
            }
        } catch (error: any) {
            logger.warn('ensureSheetsExist failed, disabling Google Sheets:', error.message);
            this.isAvailable = false;
        }
    }

    private async initializeSheetHeaders(sheetName: string): Promise<void> {
        if (!this.isAvailable || !this.spreadsheetId) return;
        try {
            const headers: Record<string, string[]> = {
                StudentProfile: ['organizationId', 'userId', 'systemId', 'studentName', 'email', 'department', 'program', 'school', 'semester', 'status', 'syncTime'],
                Attendance: ['organizationId', 'userId', 'systemId', 'totalClasses', 'presentClasses', 'absentClasses', 'attendancePercentage', 'syncTime'],
                Subjects: ['organizationId', 'userId', 'systemId', 'courseCode', 'courseName', 'faculty', 'courseType', 'credits', 'attendancePercentage', 'syncTime'],
                CAMarks: ['organizationId', 'userId', 'systemId', 'courseCode', 'courseName', 'assignment1', 'assignment2', 'assessment1', 'assessment2', 'total', 'syncTime'],
                Timetable: ['day', 'time', 'courseName', 'faculty', 'room', 'syncTime'],
                Holidays: ['holidayName', 'holidayDate', 'syncTime'],
                SyncLogs: ['timestamp', 'step', 'status', 'message']
            };

            if (headers[sheetName]) {
                await this.sheets.spreadsheets.values.update({
                    spreadsheetId: this.spreadsheetId,
                    range: `${sheetName}!A1`,
                    valueInputOption: 'RAW',
                    resource: { values: [headers[sheetName]] },
                });
            }
        } catch (error: any) {
            logger.warn('initializeSheetHeaders failed, disabling Google Sheets:', error.message);
            this.isAvailable = false;
        }
    }

    /**
     * Appends data to a specific sheet
     */
    public async appendRows(sheetName: string, rows: any[][]): Promise<void> {
        if (!this.isAvailable) return;
        try {
            await this.initialize();
            if (!this.spreadsheetId || !this.isAvailable) return;
            await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: `${sheetName}!A:A`,
                valueInputOption: 'RAW',
                resource: { values: rows },
            });
        } catch (error: any) {
            logger.warn('appendRows failed, disabling Google Sheets integration:', error.message);
            this.isAvailable = false;
        }
    }

    /**
     * Reads all data from a specific sheet
     */
    public async readRows(sheetName: string): Promise<any[][]> {
        if (!this.isAvailable) return [];
        try {
            await this.initialize();
            if (!this.spreadsheetId || !this.isAvailable) return [];
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: `${sheetName}!A:Z`,
            });
            return response.data.values || [];
        } catch (error: any) {
            logger.warn('readRows failed, disabling Google Sheets integration:', error.message);
            this.isAvailable = false;
            return [];
        }
    }

    /**
     * Specialized logging to SyncLogs sheet
     */
    public async logSync(step: string, status: 'SUCCESS' | 'FAILED' | 'PENDING', message: string): Promise<void> {
        if (!this.isAvailable) return;
        try {
            const row = [new Date().toISOString(), step, status, message];
            await this.appendRows('SyncLogs', [row]);
        } catch (error: any) {
            logger.warn('logSync failed, disabling Google Sheets integration:', error.message);
            this.isAvailable = false;
        }
    }
}

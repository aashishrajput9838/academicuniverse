import { google } from 'googleapis';
import { Logger } from '../../../shared/utils';
import * as path from 'path';

const logger = new Logger('GoogleSheetsService');

export class GoogleSheetsService {
    private static instance: GoogleSheetsService;
    private sheets: any;
    private drive: any;
    private spreadsheetId: string | null = null;
    private readonly SPREADSHEET_NAME = 'AcademicUniverse_EzoneSync';

    private constructor() {
        const auth = new google.auth.GoogleAuth({
            keyFile: path.join(process.cwd(), 'serviceAccountKey.json'),
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive.file'
            ],
        });
        this.sheets = google.sheets({ version: 'v4', auth });
        this.drive = google.drive({ version: 'v3', auth });
    }

    public static getInstance(): GoogleSheetsService {
        if (!GoogleSheetsService.instance) {
            GoogleSheetsService.instance = new GoogleSheetsService();
        }
        return GoogleSheetsService.instance;
    }

    /**
     * Ensures the spreadsheet exists and has the required sheets
     */
    public async initialize(): Promise<string> {
        if (this.spreadsheetId) return this.spreadsheetId;

        try {
            // 1. Search for existing spreadsheet
            const response = await this.drive.files.list({
                q: `name = '${this.SPREADSHEET_NAME}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
                fields: 'files(id, name)',
                spaces: 'drive',
            });

            if (response.data.files && response.data.files.length > 0) {
                this.spreadsheetId = response.data.files[0].id;
                logger.info(`Found existing spreadsheet: ${this.spreadsheetId}`);
            } else {
                // 2. Create new spreadsheet
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

                // 3. Create initial sheets
                await this.ensureSheetsExist();
            }

            return this.spreadsheetId!;
        } catch (error) {
            logger.error('Failed to initialize Google Sheets:', error);
            throw error;
        }
    }

    private async ensureSheetsExist(): Promise<void> {
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
            
            // Add headers for new sheets
            for (const sheetName of requiredSheets) {
                if (!existingSheets.includes(sheetName)) {
                    await this.initializeSheetHeaders(sheetName);
                }
            }
        }
    }

    private async initializeSheetHeaders(sheetName: string): Promise<void> {
        const headers: Record<string, string[]> = {
            StudentProfile: ['SystemId', 'StudentName', 'Email', 'Department', 'Program', 'Semester', 'School', 'Status', 'SyncTime'],
            Attendance: ['SystemId', 'TotalClasses', 'PresentClasses', 'AbsentClasses', 'AttendancePercentage', 'SyncTime'],
            Subjects: ['SystemId', 'CourseCode', 'CourseName', 'Faculty', 'CourseType', 'Credits', 'AttendancePercentage', 'SyncTime'],
            CAMarks: ['SystemId', 'CourseCode', 'CourseName', 'Assignment1', 'Assignment2', 'Assessment1', 'Assessment2', 'Total', 'SyncTime'],
            Timetable: ['SystemId', 'Subject', 'Faculty', 'Room', 'Time', 'SyncTime'],
            Holidays: ['HolidayName', 'HolidayDate', 'SyncTime'],
            SyncLogs: ['Timestamp', 'Step', 'Status', 'Message']
        };

        if (headers[sheetName]) {
            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: `${sheetName}!A1`,
                valueInputOption: 'RAW',
                resource: { values: [headers[sheetName]] },
            });
        }
    }

    /**
     * Appends data to a specific sheet
     */
    public async appendRows(sheetName: string, rows: any[][]): Promise<void> {
        await this.initialize();
        await this.sheets.spreadsheets.values.append({
            spreadsheetId: this.spreadsheetId,
            range: `${sheetName}!A:A`,
            valueInputOption: 'RAW',
            resource: { values: rows },
        });
    }

    /**
     * Reads all data from a specific sheet
     */
    public async readRows(sheetName: string): Promise<any[][]> {
        await this.initialize();
        const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: `${sheetName}!A:Z`,
        });
        return response.data.values || [];
    }

    /**
     * Specialized logging to SyncLogs sheet
     */
    public async logSync(step: string, status: 'SUCCESS' | 'FAILED' | 'PENDING', message: string): Promise<void> {
        const row = [new Date().toLocaleString(), step, status, message];
        await this.appendRows('SyncLogs', [row]);
    }
}

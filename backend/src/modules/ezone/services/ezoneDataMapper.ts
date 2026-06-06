import { Logger } from '../../../shared/utils';

const logger = new Logger('EzoneDataMapper');

export class EzoneDataMapper {
    private static instance: EzoneDataMapper;

    public static getInstance(): EzoneDataMapper {
        if (!EzoneDataMapper.instance) {
            EzoneDataMapper.instance = new EzoneDataMapper();
        }
        return EzoneDataMapper.instance;
    }

    /**
     * Sanitizes raw text by removing HTML tags and technical fragments
     */
    public sanitize(text: string): string {
        if (!text || typeof text !== 'string') return '';
        
        // 1. Remove common HTML tags
        let clean = text.replace(/<[^>]*>?/gm, ' ');
        
        // 2. Remove technical fragments and CSS-like patterns
        const blacklist = [
            /\.apexcharts[a-z-]*/gi,
            /iframe/gi,
            /script/gi,
            /style/gi,
            /translateY\([^)]*\)/gi,
            /display\s*:\s*[a-z-]+/gi,
            /position\s*:\s*[a-z-]+/gi,
            /color\s*:\s*#[0-9a-f]+/gi,
            /background\s*:\s*[a-z]+/gi,
            /padding\s*:\s*[0-9]+px/gi,
            /!important/gi,
            /\{[\s\S]*?\}/g, // CSS blocks
            /\s\s+/g // Multiple spaces
        ];

        blacklist.forEach(pattern => {
            clean = clean.replace(pattern, ' ');
        });

        return clean.trim();
    }

    /**
     * Maps raw scraper data to structured Google Sheets format
     */
    public toSheets(data: any, systemId: string): Record<string, any[]> {
        const syncTime = new Date().toISOString();

        return {
            StudentProfile: [[
                systemId,
                data.studentName || 'N/A',
                data.email || 'N/A',
                data.school || 'N/A', // Department
                data.program || 'N/A',
                data.semester || 'N/A',
                data.school || 'N/A', // School
                data.status || 'Active',
                syncTime
            ]],
            Attendance: [[
                systemId,
                data.totalClasses || 0,
                data.presentClasses || 0,
                data.absentClasses || 0,
                data.attendancePercentage || 0,
                syncTime
            ]],
            Subjects: (data.subjects || []).map((s: any) => [
                systemId,
                s.courseCode || 'N/A',
                s.courseName || 'N/A',
                s.faculty || 'N/A',
                s.courseType || 'N/A',
                s.credits || 0,
                s.attendancePercentage || 0,
                syncTime
            ]),
            CAMarks: (data.caMarks || []).map((m: any) => [
                systemId,
                m.courseCode || 'N/A',
                m.courseName || 'N/A',
                m.assignment1 || m.assignmentMarks || '0',
                m.assignment2 || '0',
                m.assessment1 || m.assessmentMarks || '0',
                m.assessment2 || '0',
                m.total || '0',
                syncTime
            ]),
            Timetable: (data.timetable || []).map((t: any) => [
                systemId,
                t.subject || 'N/A',
                t.faculty || 'N/A',
                t.room || 'N/A',
                t.time || 'N/A',
                syncTime
            ]),
            Holidays: (data.holidays || []).map((h: any) => [
                h.name || 'N/A',
                h.date || 'N/A',
                syncTime
            ])
        };
    }

    /**
     * Maps Google Sheets rows back to MongoDB schema
     */
    public fromSheetsToMongo(sheetsData: Record<string, any[]>): any {
        const profileRow = sheetsData.StudentProfile?.[0] || [];
        const attendanceRow = sheetsData.Attendance?.[0] || [];

        return {
            studentName: profileRow[1],
            systemId: profileRow[0],
            program: profileRow[4],
            school: profileRow[6],
            status: profileRow[7],
            
            attendancePercentage: parseFloat(attendanceRow[4]) || 0,
            totalClasses: parseInt(attendanceRow[1]) || 0,
            presentClasses: parseInt(attendanceRow[2]) || 0,
            absentClasses: parseInt(attendanceRow[3]) || 0,

            caMarks: (sheetsData.CAMarks || []).map(row => ({
                courseCode: row[1],
                courseName: row[2],
                assignment1: row[3],
                assignment2: row[4],
                assessment1: row[5],
                assessment2: row[6],
                total: row[7]
            })),

            subjects: (sheetsData.Subjects || []).map(row => ({
                courseCode: row[1],
                courseName: row[2],
                faculty: row[3],
                courseType: row[4],
                credits: parseFloat(row[5]) || 0,
                attendancePercentage: parseFloat(row[6]) || 0
            })),

            timetable: (sheetsData.Timetable || []).map(row => ({
                subject: row[1],
                faculty: row[2],
                room: row[3],
                time: row[4]
            })),

            holidays: (sheetsData.Holidays || []).map(row => ({
                name: row[0],
                date: row[1]
            })),
            
            lastSyncedAt: new Date()
        };
    }
}

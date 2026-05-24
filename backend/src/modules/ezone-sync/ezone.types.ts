/**
 * Ezone Sync Types
 */

export interface IEzoneProfile {
    organizationId: string;
    userId: string;
    ezoneStudentId: string;
    fullName: string;
    attendance: number;
    cgpa: number;
    semester: number;
    department: string;
    subjects: any[];
    attendanceRecords: any[];
    lastSyncedAt: Date;
    syncStatus: 'SUCCESS' | 'FAILED' | 'PENDING';
    rawSnapshot?: any;
}

export interface IEzoneSession {
    systemId: string;
    cookies: any[];
    createdAt: Date;
}

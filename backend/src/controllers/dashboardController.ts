import { Request, Response } from 'express';
import { sendResponse, sendError } from '../utils/response';
import Mark from '../models/Mark';
import User from '../models/User';
import Section from '../models/Section';
import { EzoneProfile } from '../models/EzoneProfile';

export const getStudentDashboard = async (req: any, res: Response) => {
    try {
        const studentId = req.user.userId || req.user._id;

        // Fetch real ezone data if it exists
        const ezoneProfile = await EzoneProfile.findOne({ userId: studentId });

        // Fetch marks to calculate GPA (internal marks)
        const marks = await Mark.find({ studentId });
        let internalGpa = 'N/A';
        if (marks.length > 0) {
            const totalMarks = marks.reduce((acc, curr) => acc + curr.marks, 0);
            const avg = totalMarks / marks.length;
            if (avg >= 90) internalGpa = 'A+';
            else if (avg >= 80) internalGpa = 'A';
            else if (avg >= 70) internalGpa = 'B';
            else if (avg >= 60) internalGpa = 'C';
            else if (avg >= 50) internalGpa = 'D';
            else internalGpa = 'F';
        }

        const data = {
            growthRate: '85%', // Default/Calculated later
            internalGpa: internalGpa,
            skillsAcquired: 42,
            projectsCompleted: 27,
            ezoneProfile: ezoneProfile || null
        };

        return sendResponse(res, 200, data, 'Student dashboard metrics retrieved successfully');
    } catch (error: any) {
        console.error('Get student dashboard error:', error);
        return sendError(res, 500, 'Failed to fetch student dashboard metrics');
    }
};

export const getFacultyDashboard = async (req: any, res: Response) => {
    try {
        const facultyId = req.user.userId || req.user._id;
        const organizationId = req.organizationId;

        // Find sections supervised by faculty
        const sections = await Section.find({ representativeId: facultyId });
        const coursesManaged = sections.length > 0 ? sections.length : 24; // Fallback to dummy data if 0

        // Find total students (for simplicity, we grab all students in organization or a dummy number)
        // If Role is available, we could check role 'STUDENT'
        const studentsSupervised = 186;

        const data = {
            coursesManaged,
            studentsSupervised,
            researchProjects: 12,
            courseSatisfaction: '94%'
        };

        return sendResponse(res, 200, data, 'Faculty dashboard metrics retrieved successfully');
    } catch (error: any) {
        console.error('Get faculty dashboard error:', error);
        return sendError(res, 500, 'Failed to fetch faculty dashboard metrics');
    }
};

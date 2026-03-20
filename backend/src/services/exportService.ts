import * as xlsx from 'xlsx';
import User from '../models/User';
import StudentResume from '../models/StudentResume';
import Role from '../models/Role';

// MODULAR CONFIGURATION
// Add or remove fields here easily in the future without touching the core mapping logic.
export const STUDENT_EXCEL_CONFIG = [
    { header: 'Name', key: 'name' },
    { header: 'Email', key: 'email' },
    { header: 'System ID', key: 'systemId' },
    { header: 'Section', key: 'section' },
    { header: 'Program', key: 'program' },
    { header: 'GitHub Link', key: 'githubUsername' },
    { header: 'LinkedIn Link', key: 'linkedin' },
    { header: 'Resume Link', key: 'resumeUrl' },
];

export const generateStudentExcelInfo = async (organizationId: string): Promise<Buffer> => {
    // 1. Identify what constitutes a "student" role in the current tenant DB
    const studentRole = await Role.findOne({ name: { $regex: /^student$/i } });
    
    // 2. Fetch all student users within the faculty's organization
    let query: any = { organizationId: organizationId };
    if (studentRole) {
        query.roleId = studentRole._id;
    } else {
        // Fallback heuristic if Role collection is populated differently
        query.email = { $not: { $regex: /fa\./i } }; 
    }
    
    const students = await User.find(query).lean();
    
    // 3. Fetch interconnected data (like Resumes) to populate requested links
    const userIds = students.map(s => s._id);
    const resumes = await StudentResume.find({ userId: { $in: userIds } }).lean();
    
    const resumeMap = new Map();
    resumes.forEach(r => {
        if (r.generatedDocxUrl) {
            resumeMap.set(r.userId.toString(), r.generatedDocxUrl);
        }
    });
    
    // 4. Transform data into the flat structure mapping configured above
    const excelData = students.map(student => {
        const row: any = {};
        
        // Native data aggregation
        const rawData = {
            name: student.name || '',
            email: student.email || '',
            systemId: '', // Placeholder for future schema updates
            section: '',  // Placeholder for future schema updates
            program: '',  // Placeholder for future schema updates
            githubUsername: student.githubUsername ? `https://github.com/${student.githubUsername}` : '',
            linkedin: '', // Placeholder for future schema updates
            resumeUrl: resumeMap.get(student._id.toString()) || ''
        };
        
        // Build final row aligning exactly to the modular configuration headers
        STUDENT_EXCEL_CONFIG.forEach(col => {
            row[col.header] = (rawData as any)[col.key] || '';
        });
        
        return row;
    });
    
    // 5. Generate Excel Binary Buffer via SheetJS
    const worksheet = xlsx.utils.json_to_sheet(excelData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Students');
    
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer as Buffer;
};

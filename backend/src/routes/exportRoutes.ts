import { Router } from 'express';
import { authenticateUser } from '../middleware/auth';
import { generateStudentExcelInfo } from '../services/exportService';

const router = Router();

router.get('/students', authenticateUser, async (req: any, res) => {
    try {
        // Strict Authorization: Reject non-faculty/admin users
        const role = req.user?.role?.toUpperCase() || '';
        if (!['FACULTY', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Forbidden: Only faculty and administrators can export sensitive student data.' 
            });
        }
        
        const orgId = req.user.organizationId;
        
        // Generate binary excel buffer
        const excelBuffer = await generateStudentExcelInfo(orgId);
        
        // Instruct the browser to download the file directly
        res.setHeader('Content-Disposition', 'attachment; filename="students.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        
        return res.send(excelBuffer);
    } catch (error) {
        console.error('[Export API] Error generating student Excel export:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to generate Excel file due to an internal server error.' 
        });
    }
});

export default router;

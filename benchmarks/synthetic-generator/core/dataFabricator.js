"use strict";
/**
 * Academic Universe — Realistic Academic Data Fabricator
 * Generates coherent, realistic Indian academic records and student profiles.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataFabricator = void 0;
const FIRST_NAMES = [
    'Aashish', 'Aarav', 'Aditya', 'Ananya', 'Anushka', 'Arjun', 'Bhavya', 'Devansh',
    'Diya', 'Esha', 'Gaurav', 'Harsh', 'Isha', 'Ishaan', 'Kabir', 'Kavya', 'Karan',
    'Khushi', 'Manish', 'Meera', 'Neha', 'Nikhil', 'Pooja', 'Pranav', 'Priya',
    'Rahul', 'Rohan', 'Riya', 'Siddharth', 'Sneha', 'Tanya', 'Utkarsh', 'Varun',
    'Vedant', 'Yash', 'Zoya', 'Aakash', 'Abhinav', 'Alok', 'Deepak', 'Komal', 'Mohit',
];
const LAST_NAMES = [
    'Rajput', 'Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Joshi',
    'Mehta', 'Shah', 'Rao', 'Reddy', 'Nair', 'Agarwal', 'Bansal', 'Chopra',
    'Deshmukh', 'Mishra', 'Pandey', 'Saxena', 'Tiwari', 'Yadav', 'Malhotra',
    'Bhatia', 'Jain', 'Kulkarni', 'Sinha', 'Chaudhary', 'Kapoor', 'Tripathi',
];
const BRANCHES = [
    { code: 'CSE', name: 'Computer Science and Engineering' },
    { code: 'ECE', name: 'Electronics and Communication Engineering' },
    { code: 'ME', name: 'Mechanical Engineering' },
    { code: 'CE', name: 'Civil Engineering' },
    { code: 'EE', name: 'Electrical Engineering' },
    { code: 'IT', name: 'Information Technology' },
    { code: 'AI_DS', name: 'Artificial Intelligence and Data Science' },
];
const COURSES_BY_BRANCH = {
    CSE: [
        { code: 'CS101', name: 'Data Structures and Algorithms', credits: 4 },
        { code: 'CS102', name: 'Object Oriented Programming in Java', credits: 4 },
        { code: 'CS103', name: 'Database Management Systems', credits: 3 },
        { code: 'CS104', name: 'Computer Networks', credits: 3 },
        { code: 'CS105', name: 'Operating Systems', credits: 4 },
        { code: 'CS106', name: 'Theory of Computation', credits: 3 },
        { code: 'CS107', name: 'Compiler Design', credits: 4 },
        { code: 'CS108', name: 'Software Engineering', credits: 3 },
    ],
    ECE: [
        { code: 'EC101', name: 'Digital Signal Processing', credits: 4 },
        { code: 'EC102', name: 'Microprocessors and Microcontrollers', credits: 4 },
        { code: 'EC103', name: 'Analog Electronic Circuits', credits: 3 },
        { code: 'EC104', name: 'Electromagnetic Field Theory', credits: 3 },
        { code: 'EC105', name: 'VLSI Design', credits: 4 },
        { code: 'EC106', name: 'Wireless Communication', credits: 3 },
    ],
    ME: [
        { code: 'ME101', name: 'Thermodynamics', credits: 4 },
        { code: 'ME102', name: 'Fluid Mechanics', credits: 4 },
        { code: 'ME103', name: 'Manufacturing Processes', credits: 3 },
        { code: 'ME104', name: 'Heat and Mass Transfer', credits: 4 },
        { code: 'ME105', name: 'Kinematics of Machinery', credits: 3 },
    ],
    DEFAULT: [
        { code: 'MA101', name: 'Engineering Mathematics I', credits: 4 },
        { code: 'PH101', name: 'Engineering Physics', credits: 3 },
        { code: 'CH101', name: 'Engineering Chemistry', credits: 3 },
        { code: 'HS101', name: 'Professional Communication', credits: 2 },
        { code: 'ME100', name: 'Engineering Graphics', credits: 3 },
    ],
};
const CITIES = ['New Delhi', 'Mumbai', 'Bengaluru', 'Pune', 'Hyderabad', 'Noida', 'Lucknow', 'Jaipur', 'Indore', 'Ahmedabad'];
class DataFabricator {
    constructor(rng) {
        this.rng = rng;
    }
    /** Generate a complete student profile */
    generateStudentProfile() {
        const fn = this.rng.pick(FIRST_NAMES);
        const ln = this.rng.pick(LAST_NAMES);
        const name = `${fn} ${ln}`;
        const fatherName = `${this.rng.pick(FIRST_NAMES)} ${ln}`;
        const motherName = `${this.rng.pick(FIRST_NAMES)} ${ln}`;
        const branch = this.rng.pick(BRANCHES);
        const startYear = this.rng.nextInt(2020, 2023);
        const rollNo = `${startYear}${this.rng.nextInt(100000, 999999)}`;
        const enrollNo = `EN${startYear}${this.rng.nextInt(10000, 99999)}`;
        const city = this.rng.pick(CITIES);
        return {
            studentName: name,
            rollNumber: rollNo,
            enrollmentNumber: enrollNo,
            degreeName: 'Bachelor of Technology (B.Tech)',
            branchName: branch.name,
            batchYears: `${startYear} - ${startYear + 4}`,
            fatherName: `Shri ${fatherName}`,
            motherName: `Smt ${motherName}`,
            dob: this.rng.nextDate(2001, 2004),
            email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.ac.in`,
            phone: `+91 ${this.rng.nextInt(7000000000, 9999999999)}`,
            address: `House No. ${this.rng.nextInt(1, 400)}, Sector ${this.rng.nextInt(1, 50)}, ${city}`,
            bloodGroup: this.rng.pick(['A+', 'B+', 'O+', 'AB+', 'A-', 'B-']),
        };
    }
    /** Generate course marks for a given semester */
    generateSemesterRecord(semNumber, branchCode = 'CSE') {
        const courseList = COURSES_BY_BRANCH[branchCode] || COURSES_BY_BRANCH.DEFAULT;
        const coursesToPick = this.rng.pickMultiple(courseList, 5);
        let totalPoints = 0;
        let totalCredits = 0;
        const courseMarks = coursesToPick.map((c) => {
            const marksObtained = this.rng.nextInt(60, 98);
            const gradeInfo = this.marksToGrade(marksObtained);
            totalPoints += gradeInfo.gradePoint * c.credits;
            totalCredits += c.credits;
            return {
                courseCode: c.code,
                courseName: c.name,
                credits: c.credits,
                grade: gradeInfo.grade,
                gradePoint: gradeInfo.gradePoint,
                marksObtained,
                maxMarks: 100,
            };
        });
        const sgpa = parseFloat((totalPoints / totalCredits).toFixed(2));
        return {
            semesterName: `Semester ${semNumber}`,
            sgpa,
            creditsEarned: totalCredits,
            courseMarks,
        };
    }
    /** Map marks out of 100 to letter grade and grade points */
    marksToGrade(marks) {
        if (marks >= 90)
            return { grade: 'O', gradePoint: 10 };
        if (marks >= 80)
            return { grade: 'A+', gradePoint: 9 };
        if (marks >= 70)
            return { grade: 'A', gradePoint: 8 };
        if (marks >= 60)
            return { grade: 'B+', gradePoint: 7 };
        if (marks >= 50)
            return { grade: 'B', gradePoint: 6 };
        return { grade: 'C', gradePoint: 5 };
    }
}
exports.DataFabricator = DataFabricator;

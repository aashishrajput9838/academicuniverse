const fs = require('fs');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, HeadingLevel, TextRun, AlignmentType } = require('docx');

const students = [
    {
        name: "Aashish",
        role: "Backend & API Integration",
        entries: [
            ["W1", "28 Jan - 03 Feb", "Project ideation: Defining the 'Holistic Growth' concept and backend scope."],
            ["W2", "04 Feb - 10 Feb", "Researching Tech Stack: Choosing Node.js/Express 5 and MongoDB for primary storage."],
            ["W3", "11 Feb - 17 Feb", "Designing ER Diagrams: Mapping User, Organization, and Timetable relationships."],
            ["W4", "18 Feb - 24 Feb", "Architecture Planning: Deciding on the Modular Backend pattern for feature isolation."],
            ["W5", "25 Feb - 03 Mar", "Multi-tenancy Design: Planning the 'organizationId' isolation strategy for data security."],
            ["W6", "04 Mar - 10 Mar", "Environment Setup: Configuring TypeScript, ESLint, and the Express server boilerplate."],
            ["W7", "11 Mar - 17 Mar", "Auth Strategy: Planning the Hybrid Auth flow (Firebase + Custom JWT RBAC)."],
            ["W8", "18 Mar - 24 Mar", "External API Research: Studying Gmail API OAuth scopes for event detection."],
            ["W9", "25 Mar - 31 Mar", "GitHub Integration Plan: Defining logic for periodic (6h) repo analytics syncing."],
            ["W10", "01 Apr - 07 Apr", "Database Schema Finalization: Defining Mongoose models for student profiles and marks."],
            ["W11", "08 Apr - 14 Apr", "Overlap Engine Logic: Designing the algorithm for multi-section conflict detection."],
            ["W12", "15 Apr - 21 Apr", "AI Integration Research: Selecting Gemini-2.5-flash and planning prompt structures."],
            ["W13", "22 Apr - 28 Apr", "Real-time Data Strategy: Designing Firestore collections for event streaming."],
            ["W14", "29 Apr - 05 May", "Security Planning: Designing CSP headers and API rate-limiting middleware."],
            ["W15", "06 May - 12 May", "Documentation: Writing the AI_CONTEXT.txt for backend architectural clarity."],
            ["W16", "13 May - 19 May", "Integration Testing Plan: Mapping API endpoints for front-to-back connectivity."],
            ["W17", "20 May - 22 May", "Final Review: Preparing backend documentation and system flow for Zeroth Evaluation."]
        ]
    },
    {
        name: "Kushagra",
        role: "Frontend & UI/UX",
        entries: [
            ["W1", "28 Jan - 03 Feb", "UI Ideation: Creating mood boards for the 'Academic Universe' Glassmorphism theme."],
            ["W2", "04 Feb - 10 Feb", "Tech Stack Selection: Opting for Next.js 16 (App Router) and Tailwind CSS 4."],
            ["W3", "11 Feb - 17 Feb", "Wireframing: Designing low-fidelity layouts for Student and Faculty dashboards."],
            ["W4", "18 Feb - 24 Feb", "UI Component Planning: Identifying reusable Radix UI primitives for the project."],
            ["W5", "25 Feb - 03 Mar", "Prototype Design: Creating high-fidelity Figma designs for the growth tracking charts."],
            ["W6", "04 Mar - 10 Mar", "Frontend Initialization: Setting up Next.js with Turbopack and folder structure."],
            ["W7", "11 Mar - 17 Mar", "Role-Based Routing: Planning dynamic routes for /dashboard/[role]."],
            ["W8", "18 Mar - 24 Mar", "Theme Implementation: Configuring Tailwind 4 colors and Glassmorphism utility classes."],
            ["W9", "25 Mar - 31 Mar", "Component Architecture: Designing the shared UI library in /components/."],
            ["W10", "01 Apr - 07 Apr", "Data Visualization Plan: Selecting Recharts for IQ/EQ trend analysis display."],
            ["W11", "08 Apr - 14 Apr", "Layout Design: Implementing the main navigation and sidebar with Lucide icons."],
            ["W12", "15 Apr - 21 Apr", "Responsive Strategy: Ensuring dashboard compatibility across tablet and mobile views."],
            ["W13", "22 Apr - 28 Apr", "State Management Plan: Deciding on React Hooks and context for real-time updates."],
            ["W14", "29 Apr - 05 May", "Performance Planning: Strategizing Zero-Flicker Hydration for SEO and speed."],
            ["W15", "06 May - 12 May", "Visual Polishing: Finalizing animations and hover effects for the 'Elegant' UI feel."],
            ["W16", "13 May - 19 May", "Frontend Audit: Checking accessibility (a11y) and color contrast compliance."],
            ["W17", "20 May - 22 May", "Final Presentation: Preparing the UI walkthrough for the Zeroth Evaluation."]
        ]
    },
    {
        name: "Avdesh",
        role: "Testing & QA",
        entries: [
            ["W1", "28 Jan - 03 Feb", "Testing Strategy: Defining the scope of Unit, Integration, and E2E testing."],
            ["W2", "04 Feb - 10 Feb", "Tool Selection: Choosing Playwright for automation and Vitest for unit tests."],
            ["W3", "11 Feb - 17 Feb", "Test Plan Creation: Identifying critical user journeys (Login, Sync, Dashboard)."],
            ["W4", "18 Feb - 24 Feb", "Security Audit Planning: Defining checks for RBAC and Organization isolation."],
            ["W5", "25 Feb - 03 Mar", "Environment Prep: Setting up test databases (MongoDB Atlas test cluster)."],
            ["W6", "04 Mar - 10 Mar", "CI/CD Research: Planning GitHub Actions for automated test runs on PRs."],
            ["W7", "11 Mar - 17 Mar", "Auth Flow Testing: Writing test cases for domain-based role assignment."],
            ["W8", "18 Mar - 24 Mar", "API Mocking Strategy: Planning MSW (Mock Service Worker) for frontend testing."],
            ["W9", "25 Mar - 31 Mar", "Database Integrity Checks: Planning tests for multi-tenancy leakage."],
            ["W10", "01 Apr - 07 Apr", "Firestore Rule Auditing: Designing test scripts to verify security rules."],
            ["W11", "08 Apr - 14 Apr", "Load Testing Research: Selecting tools for benchmarking the Overlap Engine."],
            ["W12", "15 Apr - 21 Apr", "Vulnerability Assessment: Planning scans for sensitive API keys and secrets."],
            ["W13", "22 Apr - 28 Apr", "Browser Compatibility: Setting up Playwright for Chrome, Firefox, and Safari."],
            ["W14", "29 Apr - 05 May", "Error Handling Review: Testing system resilience against API failures (Gmail/GitHub)."],
            ["W15", "06 May - 12 May", "Documentation Audit: Verifying that README.md matches the system behavior."],
            ["W16", "13 May - 19 May", "Regression Testing: Running a full suite of tests before the Zeroth Evaluation."],
            ["W17", "20 May - 22 May", "QA Sign-off: Preparing the testing report and coverage metrics for evaluation."]
        ]
    }
];

const createTable = (entries) => {
    return new Table({
        width: {
            size: 100,
            type: WidthType.PERCENTAGE,
        },
        rows: [
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Week", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Dates", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Planning & Development Activity", bold: true })] })] }),
                ],
            }),
            ...entries.map(entry => new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph(entry[0])] }),
                    new TableCell({ children: [new Paragraph(entry[1])] }),
                    new TableCell({ children: [new Paragraph(entry[2])] }),
                ],
            })),
        ],
    });
};

const sections = [];

students.forEach(student => {
    sections.push({
        properties: {},
        children: [
            new Paragraph({
                text: `Student Diary: ${student.name}`,
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
                text: `Role: ${student.role}`,
                heading: HeadingLevel.HEADING_2,
                alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: "" }), // Spacer
            createTable(student.entries),
            new Paragraph({ text: "", pageBreakBefore: true }), // Page break after each student
        ],
    });
});

const doc = new Document({
    sections: sections,
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("Student_Diaries_Zeroth_Eval.docx", buffer);
    console.log("Document created successfully: Student_Diaries_Zeroth_Eval.docx");
}).catch(err => {
    console.error("Error creating document:", err);
});

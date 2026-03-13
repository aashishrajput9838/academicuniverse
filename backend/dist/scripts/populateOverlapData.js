"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Read the service account key directly
const serviceAccountPath = path_1.default.join(__dirname, '../../serviceAccountKey.json.json');
const serviceAccount = JSON.parse(fs_1.default.readFileSync(serviceAccountPath, 'utf8'));
// Initialize Firebase Admin SDK
if (firebase_admin_1.default.apps.length === 0) {
    firebase_admin_1.default.initializeApp({
        credential: firebase_admin_1.default.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
    });
}
const db = firebase_admin_1.default.firestore();
async function populateSampleData() {
    const organizationId = 'demo-org-123';
    // Sample sections
    const sections = [
        {
            sectionName: 'Section Alpha',
            representativeUid: 'user-alpha-123',
            organizationId: organizationId,
        },
        {
            sectionName: 'Section Beta',
            representativeUid: 'user-beta-456',
            organizationId: organizationId,
        },
        {
            sectionName: 'Section Gamma',
            representativeUid: 'user-gamma-789',
            organizationId: organizationId,
        },
        {
            sectionName: 'Section Delta',
            representativeUid: 'user-delta-101',
            organizationId: organizationId,
        },
        {
            sectionName: 'Section Epsilon',
            representativeUid: 'user-epsilon-202',
            organizationId: organizationId,
        }
    ];
    console.log('Starting to populate sample data...');
    try {
        // Add sections to Firestore and corresponding free slots
        for (const section of sections) {
            const docRef = await db.collection('sections').add(section);
            console.log(`Added section: ${section.sectionName} with ID: ${docRef.id}`);
            // Add corresponding free slots for this section
            // Using different patterns for each section to demonstrate overlap calculation
            let weeklyFreeSlots = {};
            switch (section.sectionName) {
                case 'Section Alpha':
                    weeklyFreeSlots = {
                        'Monday': [0, 1, 2], // 09:00-09:50, 09:50-10:40, 10:40-11:30
                        'Tuesday': [3, 4], // 11:35-12:25, 12:25-13:15
                        'Wednesday': [6, 7, 8], // 14:10-15:00, 15:00-15:50, 15:50-16:40
                        'Thursday': [1, 5], // 09:50-10:40, 13:15-14:05
                        'Friday': [2, 4, 7] // 10:40-11:30, 12:25-13:15, 15:00-15:50
                    };
                    break;
                case 'Section Beta':
                    weeklyFreeSlots = {
                        'Monday': [1, 2, 3], // 09:50-10:40, 10:40-11:30, 11:35-12:25
                        'Tuesday': [4, 5], // 12:25-13:15, 13:15-14:05
                        'Wednesday': [5, 6, 7], // 13:15-14:05, 14:10-15:00, 15:00-15:50
                        'Thursday': [2, 6], // 10:40-11:30, 14:10-15:00
                        'Friday': [3, 5, 8] // 11:35-12:25, 13:15-14:05, 15:50-16:40
                    };
                    break;
                case 'Section Gamma':
                    weeklyFreeSlots = {
                        'Monday': [2, 3, 4], // 10:40-11:30, 11:35-12:25, 12:25-13:15
                        'Tuesday': [5, 6], // 13:15-14:05, 14:10-15:00
                        'Wednesday': [4, 5, 6], // 12:25-13:15, 13:15-14:05, 14:10-15:00
                        'Thursday': [3, 7], // 11:35-12:25, 15:00-15:50
                        'Friday': [1, 6, 8] // 09:50-10:40, 14:10-15:00, 15:50-16:40
                    };
                    break;
                case 'Section Delta':
                    weeklyFreeSlots = {
                        'Monday': [0, 4, 8], // 09:00-09:50, 12:25-13:15, 15:50-16:40
                        'Tuesday': [1, 7], // 09:50-10:40, 15:00-15:50
                        'Wednesday': [2, 8], // 10:40-11:30, 15:50-16:40
                        'Thursday': [0, 4, 8], // 09:00-09:50, 12:25-13:15, 15:50-16:40
                        'Friday': [0, 3, 7] // 09:00-09:50, 11:35-12:25, 15:00-15:50
                    };
                    break;
                case 'Section Epsilon':
                    weeklyFreeSlots = {
                        'Monday': [1, 5, 8], // 09:50-10:40, 13:15-14:05, 15:50-16:40
                        'Tuesday': [2, 6], // 10:40-11:30, 14:10-15:00
                        'Wednesday': [0, 3, 7], // 09:00-09:50, 11:35-12:25, 15:00-15:50
                        'Thursday': [1, 5], // 09:50-10:40, 13:15-14:05
                        'Friday': [2, 4, 6] // 10:40-11:30, 12:25-13:15, 14:10-15:00
                    };
                    break;
            }
            const freeSlots = {
                organizationId: organizationId,
                weeklyFreeSlots: weeklyFreeSlots,
                lastUpdated: firebase_admin_1.default.firestore.FieldValue.serverTimestamp()
            };
            await db.collection('freeSlots').doc(docRef.id).set(freeSlots);
            console.log(`Added free slots for section: ${docRef.id}`);
        }
        console.log('\nSample data populated successfully!');
        console.log('\nYou now have 5 sections with different free time patterns:');
        console.log('- Section Alpha');
        console.log('- Section Beta');
        console.log('- Section Gamma');
        console.log('- Section Delta');
        console.log('- Section Epsilon');
        console.log('\nThe Overlap Engine will now use real data from Firestore instead of mock data.');
    }
    catch (error) {
        console.error('Error during data population:', error);
        throw error;
    }
}
populateSampleData()
    .then(() => {
    console.log('\nSample data population completed successfully!');
    process.exit(0);
})
    .catch(error => {
    console.error('Error populating sample data:', error);
    process.exit(1);
});

export type EventCategory = 
  | 'All' 
  | 'Internship' 
  | 'Hackathon' 
  | 'Admission' 
  | 'Workshop' 
  | 'Placement' 
  | 'Exam' 
  | 'Scholarship' 
  | 'Other';

interface DetectedEvent {
    id: string;
    title: string;
    date: string;
    location: string;
    registrationLink: string;
    organizer: string;
    emailId: string;
    detectedAt: string;
}

const CATEGORY_KEYWORDS: Record<Exclude<EventCategory, 'All' | 'Other'>, string[]> = {
  Internship: ['internship', 'intern', 'summer internship', 'winter internship', 'trainee'],
  Hackathon: ['hackathon', 'coding challenge', 'innovation challenge', 'buildathon'],
  Admission: ['admission', 'enrollment', 'enrolment', 'apply now', 'application open', 'counselling'],
  Workshop: ['workshop', 'webinar', 'seminar', 'bootcamp', 'training session'],
  Placement: ['placement', 'recruitment', 'hiring', 'campus drive', 'job drive', 'interview drive'],
  Exam: ['exam', 'examination', 'assessment', 'test', 'viva', 'backlog', 'end term', 'mid term'],
  Scholarship: ['scholarship', 'fellowship', 'grant', 'financial aid']
};

// Define deterministic precedence (order matters)
const CATEGORY_PRECEDENCE: Exclude<EventCategory, 'All' | 'Other'>[] = [
  'Internship', 'Hackathon', 'Admission', 'Workshop', 'Placement', 'Exam', 'Scholarship'
];

export function classifyEvent(event: DetectedEvent): Exclude<EventCategory, 'All'> {
  const searchText = `${event.title} ${event.organizer}`.toLowerCase();

  for (const category of CATEGORY_PRECEDENCE) {
    const keywords = CATEGORY_KEYWORDS[category];
    if (keywords.some(keyword => searchText.includes(keyword))) {
      return category;
    }
  }

  return 'Other';
}

export function categorizeAllEvents(events: DetectedEvent[]): Record<EventCategory, DetectedEvent[]> {
  const categorized: Record<EventCategory, DetectedEvent[]> = {
    All: events,
    Internship: [],
    Hackathon: [],
    Admission: [],
    Workshop: [],
    Placement: [],
    Exam: [],
    Scholarship: [],
    Other: []
  };

  for (const event of events) {
    const category = classifyEvent(event);
    categorized[category].push(event);
  }

  return categorized;
}

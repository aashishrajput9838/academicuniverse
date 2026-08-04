export interface StudentSearchResult {
  id: string;
  userId: string;
  studentName: string;
  systemId: string;
  department: string;
  semester: string;
  program: string;
  school: string;
  syncStatus: 'SYNCED' | 'NEVER_SYNCED' | 'SYNCING' | 'SYNC_FAILED';
  isSelectable: boolean;
  unselectableReason?: string;
  avatarUrl?: string;
}

export interface RecommendationSlot {
  day: string;
  start: string;
  end: string;
  durationMinutes: number;
  score: number;
  reason: string;
  participantCount: number;
  collaborationTag?: string;
}

export interface StudentOverlapData {
  bestRecommendation: RecommendationSlot | null;
  otherRecommendations: RecommendationSlot[];
  totalParticipants: number;
  participantNames: string[];
  message?: string;
}

export interface StudentOverlapResponse {
  success: boolean;
  message?: string;
  data: StudentOverlapData;
}

export interface Section {
  _id: string;
  sectionName: string;
  representativeUid: string;
  organizationId: string;
  hasTimetable?: boolean;
  timetableUrl?: string;
}

export interface TimeRange {
  start: string;
  end: string;
}

export interface OverlapResult {
  [day: string]: TimeRange[];
}

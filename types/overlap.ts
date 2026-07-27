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

export interface OverlapResponse {
  success: boolean;
  message: string;
  data: {
    sections: string[];
    organizationId: string;
    overlapSlots: OverlapResult;
    totalDays: number;
    timestamp: string;
  };
}

export interface SectionsResponse {
  success: boolean;
  message: string;
  data: {
    sections: Section[];
    organizationId: string;
    count: number;
  };
}

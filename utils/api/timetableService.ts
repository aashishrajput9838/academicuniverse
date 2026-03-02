import { getFirebaseAuth } from '@/lib/firebase';

interface UploadTimetableResponse {
  success: boolean;
  message: string;
  data: {
    sectionId: string;
    fileName: string;
    uploadTime: string;
  };
}

// Helper function to get auth headers
async function getAuthHeaders() {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const token = await user.getIdToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export class TimetableService {
  static async uploadTimetable(sectionId: string, file: File): Promise<UploadTimetableResponse> {
    const headers = await getAuthHeaders();
    
    const formData = new FormData();
    formData.append('timetable', file);
    formData.append('sectionId', sectionId);
    
    const response = await fetch('/api/timetable/upload', {
      method: 'POST',
      headers: {
        'Authorization': headers['Authorization'],
        // Note: Don't set Content-Type for FormData, let browser set it
      },
      body: formData,
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to upload timetable');
    }
    
    return result;
  }
  
  static async getSectionTimetableStatus(sectionId: string): Promise<any> {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`/api/timetable/status/${sectionId}`, {
      method: 'GET',
      headers: {
        'Authorization': headers['Authorization'],
        'Content-Type': headers['Content-Type'],
      },
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch timetable status');
    }
    
    return result;
  }
}
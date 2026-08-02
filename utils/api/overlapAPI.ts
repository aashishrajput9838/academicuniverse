import { getFirebaseAuth } from '@/lib/firebase';
import type { StudentSearchResult, StudentOverlapResponse } from '@/types/overlap';

class OverlapAPIService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
  }

  /**
   * Get Firebase ID token for authentication
   */
  private async getAuthToken(): Promise<string> {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    return await user.getIdToken();
  }

  /**
   * Search active students in the authenticated user's organization.
   * organizationId is derived by backend from the auth token.
   */
  async searchStudents(query: string): Promise<{ success: boolean; data: StudentSearchResult[]; count: number }> {
    try {
      const token = await this.getAuthToken();
      const encodedQuery = encodeURIComponent(query || '');
      
      const response = await fetch(
        `${this.baseUrl}/api/overlap-engine/search-students?q=${encodedQuery}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error searching students:', error);
      throw new Error(`Failed to search students: ${error.message}`);
    }
  }

  /**
   * Calculate AI meeting recommendations for selected students using synchronized E-Zone schedules.
   */
  async findStudentOverlap(studentIds: string[]): Promise<StudentOverlapResponse> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(
        `${this.baseUrl}/api/overlap-engine/find`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            studentIds
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error calculating student meeting overlap:', error);
      throw new Error(`Failed to calculate meeting recommendations: ${error.message}`);
    }
  }

  /**
   * Legacy section fetch (backward compatibility)
   */
  async getAvailableSections(organizationId?: string): Promise<any> {
    return { success: true, data: { sections: [], count: 0 } };
  }

  /**
   * Legacy overlap calculation (backward compatibility)
   */
  async calculateOverlapSlots(sections: string[], organizationId?: string): Promise<any> {
    return { success: true, data: { overlapSlots: {} } };
  }

  /**
   * Test backend connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      return response.ok;
    } catch (error) {
      console.error('Backend connection test failed:', error);
      return false;
    }
  }
}

export const overlapAPI = new OverlapAPIService();
export default overlapAPI;
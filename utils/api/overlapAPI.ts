import { getFirebaseAuth } from '@/lib/firebase';

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
   * Fetch available sections for an organization
   */
  async getAvailableSections(organizationId: string): Promise<any> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(
        `${this.baseUrl}/api/overlap-engine/sections?organizationId=${organizationId}`,
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
      console.error('Error fetching available sections:', error);
      throw new Error(`Failed to fetch sections: ${error.message}`);
    }
  }

  /**
   * Calculate overlap slots for selected sections
   */
  async calculateOverlapSlots(sections: string[], organizationId: string): Promise<any> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(
        `${this.baseUrl}/api/overlap-engine/sections`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sections,
            organizationId
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error calculating overlap slots:', error);
      throw new Error(`Failed to calculate overlap: ${error.message}`);
    }
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

// Export singleton instance
export const overlapAPI = new OverlapAPIService();

export default overlapAPI;
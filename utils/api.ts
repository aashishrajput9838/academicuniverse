// API utility functions for consistent error handling
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    // Check if response is actually HTML (error page)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      throw new Error(`Received HTML response instead of JSON. Server might be down or route not found. Status: ${response.status}`);
    }

    // Handle non-JSON responses
    if (!response.ok) {
      // Try to parse error response as JSON
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        // If we can't parse as JSON, get text content
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    // Parse JSON response
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error occurred');
  }
};

// Wrapper functions for common API calls
export const loginWithFirebaseToken = async (idToken: string) => {
  return apiRequest('/api/auth/firebase-login', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
};

export const fetchUserData = async (token: string) => {
  return apiRequest('/api/auth/user', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
};
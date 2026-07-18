// API utility functions for consistent error handling
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5003';
export { API_BASE_URL };

export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const fullUrl = `${API_BASE_URL}${endpoint}`;

  const providedHeaders = options.headers ? { ...(options.headers as Record<string, string>) } : {};
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

  if (authToken && !providedHeaders.Authorization) {
    providedHeaders.Authorization = `Bearer ${authToken}`;
  }

  if (providedHeaders.Authorization && providedHeaders.Authorization.toLowerCase() === 'bearer null') {
    delete providedHeaders.Authorization;
  }

  const headers = {
    'Content-Type': 'application/json',
    ...providedHeaders,
  };

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {}),
      },
    });

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      throw new Error(`Received HTML response instead of JSON. Server might be down or route not found. Status: ${response.status}`);
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Network error occurred');
  }
};

// Wrapper functions for common API calls
export const loginWithFirebaseToken = async (idToken: string) => {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ provider: 'google', idToken }),
  });
};

export const fetchUserData = async (token: string) => {
  return apiRequest('/api/auth/user', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
};
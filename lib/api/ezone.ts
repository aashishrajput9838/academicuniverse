import { apiRequest } from '@/utils/api';

/**
 * Helper to get authentication headers
 */
const getAuthHeaders = (): HeadersInit => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };

    if (typeof window === 'undefined') return headers;

    const token = localStorage.getItem('authToken') || localStorage.getItem('backendToken');
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return headers;
};

export const ezoneApi = {
    sendOtp: async (systemId: string) => {
        return await apiRequest('/api/ezone/send-otp', {
            method: 'POST',
            body: JSON.stringify({ systemId }),
            headers: getAuthHeaders()
        });
    },

    verifyOtp: async (systemId: string, otp: string, sessionId: string) => {
        return await apiRequest('/api/ezone/verify-otp', {
            method: 'POST',
            body: JSON.stringify({ systemId, otp, sessionId }),
            headers: getAuthHeaders()
        });
    },

    getProfile: async () => {
        return await apiRequest('/api/ezone/profile', {
            method: 'GET',
            headers: getAuthHeaders()
        });
    },

    webscrap: async () => {
        return await apiRequest('/api/ezone/webscrap', {
            method: 'POST',
            headers: getAuthHeaders()
        });
    }
};

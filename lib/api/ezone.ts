import { apiRequest } from '@/utils/api';

/**
 * Helper to get authentication headers
 */
const getAuthHeaders = () => {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('authToken');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

export const ezoneApi = {
    sendOtp: async (systemId: string) => {
        return await apiRequest('/api/ezone/send-otp', {
            method: 'POST',
            body: JSON.stringify({ systemId }),
            headers: getAuthHeaders()
        });
    },

    verifyOtp: async (systemId: string, otp: string) => {
        return await apiRequest('/api/ezone/verify-otp', {
            method: 'POST',
            body: JSON.stringify({ systemId, otp }),
            headers: getAuthHeaders()
        });
    },

    getProfile: async () => {
        return await apiRequest('/api/ezone/profile', {
            method: 'GET',
            headers: getAuthHeaders()
        });
    }
};

import { apiRequest } from '@/utils/api';

export const ezoneApi = {
    sendOtp: async (systemId: string) => {
        return await apiRequest('/api/ezone/send-otp', {
            method: 'POST',
            body: JSON.stringify({ systemId }),
            headers: { 'Content-Type': 'application/json' }
        });
    },

    verifyOtp: async (systemId: string, otp: string) => {
        return await apiRequest('/api/ezone/verify-otp', {
            method: 'POST',
            body: JSON.stringify({ systemId, otp }),
            headers: { 'Content-Type': 'application/json' }
        });
    },

    getProfile: async () => {
        return await apiRequest('/api/ezone/profile', {
            method: 'GET'
        });
    }
};

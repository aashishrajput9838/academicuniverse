import { GrowthResponse } from './types/growth';

// Duplicate type definitions to keep the contract identical to the page implementation


/**
 * Fetch growth data for the logged‑in student.
 * Mirrors the exact request/response contract used in the page component.
 */
export async function fetchGrowthData(backendToken: string): Promise<GrowthResponse> {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
  const response = await fetch(`${API_BASE_URL}/api/growth/me`, {
    headers: {
      Authorization: `Bearer ${backendToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('growth-request-failed');
  }

  const payload = await response.json();
  if (!payload?.success || !payload?.data?.metrics) {
    throw new Error('growth-response-invalid');
  }

  // The payload structure matches GrowthResponse exactly
  return payload.data as GrowthResponse;
}

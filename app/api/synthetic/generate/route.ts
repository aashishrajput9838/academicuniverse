/**
 * Academic Universe — Synthetic Generation API Route (Thin Proxy)
 * POST /api/synthetic/generate
 * Delegates dataset generation to the backend service (Railway).
 */

import { NextResponse } from 'next/server';

function getBackendUrl(): string {
  const url = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
  return url.replace(/\/+$/, '');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const backendUrl = getBackendUrl();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      headers['authorization'] = authHeader;
    }

    const response = await fetch(`${backendUrl}/api/synthetic/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Synthetic generation proxy request failed' },
      { status: 500 }
    );
  }
}

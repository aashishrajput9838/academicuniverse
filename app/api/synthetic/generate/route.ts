/**
 * Academic Universe — Synthetic Generation API Route
 * POST /api/synthetic/generate
 *
 * ARCHITECTURAL DESIGN: Lightweight REST proxy delegating to the backend engine.
 * Eliminates serverless function bundle bloat (reduces Vercel bundle size from 2.03GB to <10KB).
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const backendUrl =
      process.env.BACKEND_API_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      'http://localhost:5000/api';

    const res = await fetch(`${backendUrl}/synthetic/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorPayload = await res.json().catch(() => ({
        error: `Backend error (status ${res.status})`,
      }));
      return NextResponse.json(errorPayload, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Synthetic generation failed' },
      { status: 500 }
    );
  }
}

/**
 * Universal Academic Intelligence Pipeline — File Upload Proxy Route
 * POST /api/uaip/upload
 * Forwards multipart file uploads to Railway Express backend.
 */

import { NextRequest, NextResponse } from "next/server";

function getBackendUrl(): string {
  const url = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
  return url.replace(/\/+$/, "");
}

export async function POST(req: NextRequest) {
  try {
    const backendUrl = getBackendUrl();
    const headers: Record<string, string> = {};

    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      headers["authorization"] = authHeader;
    }

    const contentType = req.headers.get("content-type");
    if (contentType) {
      headers["content-type"] = contentType;
    }

    // Pass body stream/buffer directly to backend
    const bodyBuffer = await req.arrayBuffer();

    const response = await fetch(`${backendUrl}/api/uaip/upload`, {
      method: "POST",
      headers,
      body: bodyBuffer,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "UAIP upload proxy request failed" },
      { status: 500 }
    );
  }
}

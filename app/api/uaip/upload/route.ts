import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/backend/src/utils/jwt";
import { UploadService } from "@/backend/src/services/upload-service";
import { connectDB } from "@/backend/src/config/database";
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "No token provided. Please log in." },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err: any) {
      return NextResponse.json(
        { success: false, message: "Invalid token or authentication failed", error: err.message },
        { status: 401 }
      );
    }

    if (!decoded.userId || !decoded.organizationId) {
      return NextResponse.json(
        { success: false, message: "Invalid token payload: missing userId or organizationId" },
        { status: 401 }
      );
    }

    // 2. Parse multipart form data
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (err) {
      return NextResponse.json(
        { success: false, message: "Failed to parse multipart/form-data" },
        { status: 400 }
      );
    }

    const file = formData.get("file") as File | null;
    
    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file provided" },
        { status: 400 }
      );
    }

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Ensure Database connection
    await connectDB();

    // 4. Delegate to UploadService
    const uploadService = new UploadService();
    const processingId = await uploadService.uploadFile({
      buffer,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      userId: decoded.userId,
      organizationId: decoded.organizationId,
    });

    // 5. Return success
    return NextResponse.json({
      success: true,
      processingId,
    }, { status: 201 });

  } catch (error: any) {
    console.error("UAIP Upload Error:", error);
    
    // Map known errors to HTTP status codes
    const message = error.message || "Upload failed";
    let status = 500;

    if (message.includes("File size exceeds")) {
      status = 413;
    } else if (message.includes("Unsupported file type")) {
      status = 415;
    } else if (message.includes("context is required") || message.includes("userId is required")) {
      status = 401;
    }

    return NextResponse.json({
      success: false,
      message,
    }, { status });
  }
}

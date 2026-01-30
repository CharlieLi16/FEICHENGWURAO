import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;

    console.log("[Upload API] Received:", { fileName: file?.name, fileSize: file?.size, fileType: file?.type, hasToken: !!process.env.BLOB_READ_WRITE_TOKEN });

    if (!file) {
      console.log("[Upload API] Error: No file provided");
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    
    if (!isImage && !isVideo) {
      console.log("[Upload API] Error: Invalid file type", file.type);
      return NextResponse.json(
        { error: "Invalid file type. Please upload an image or video." },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      console.log("[Upload API] Error: File too large", file.size);
      return NextResponse.json(
        { error: "File size exceeds 50MB limit" },
        { status: 400 }
      );
    }

    // Create a unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const sanitizedName = (name || "unknown").replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_");
    const extension = file.name.split(".").pop() || "";
    const uniqueFileName = `${sanitizedName}_${timestamp}.${extension}`;

    // Check if we have Vercel Blob token (production) or running locally
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      // Local development mode - return a placeholder
      console.log("Local dev mode: file upload simulated for", uniqueFileName);
      return NextResponse.json({ 
        fileUrl: `[本地测试] ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`, 
        success: true 
      });
    }

    // Upload to Vercel Blob (production)
    console.log("[Upload API] Uploading to Vercel Blob:", uniqueFileName);
    const blob = await put(uniqueFileName, file, {
      access: "public",
    });
    console.log("[Upload API] Upload success:", blob.url);

    return NextResponse.json({ 
      fileUrl: blob.url, 
      success: true 
    });
  } catch (error) {
    console.error("[Upload API] Upload error:", error);
    return NextResponse.json(
      { error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

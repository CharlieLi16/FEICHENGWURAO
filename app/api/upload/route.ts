import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

// Supported file types
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv'];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;

    console.log("[Upload API] Received:", { 
      fileName: file?.name, 
      fileSize: file?.size, 
      fileType: file?.type, 
      hasToken: !!process.env.BLOB_READ_WRITE_TOKEN 
    });

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
    
    // Also check by file extension for videos (some browsers report wrong MIME type)
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const videoExtensions = ['mp4', 'webm', 'mov', 'avi', 'wmv', 'm4v'];
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const isVideoByExtension = videoExtensions.includes(extension);
    const isImageByExtension = imageExtensions.includes(extension);
    
    if (!isImage && !isVideo && !isVideoByExtension && !isImageByExtension) {
      console.log("[Upload API] Error: Invalid file type", file.type, extension);
      return NextResponse.json(
        { error: `不支持的文件类型: ${file.type || extension}。请上传图片(jpg/png/gif/webp)或视频(mp4/webm/mov)。` },
        { status: 400 }
      );
    }

    // Different size limits for images and videos
    const isVideoFile = isVideo || isVideoByExtension;
    const maxSize = isVideoFile ? 100 * 1024 * 1024 : 10 * 1024 * 1024; // 100MB for videos, 10MB for images
    const maxSizeMB = isVideoFile ? 100 : 10;
    
    if (file.size > maxSize) {
      console.log("[Upload API] Error: File too large", file.size);
      return NextResponse.json(
        { error: `文件大小超过限制 (${maxSizeMB}MB)。当前: ${(file.size / 1024 / 1024).toFixed(1)}MB。视频建议使用 YouTube/Bilibili 链接。` },
        { status: 400 }
      );
    }

    // Create a unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const sanitizedName = (name || "unknown").replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_");
    const fileExtension = file.name.split(".").pop() || "";
    const uniqueFileName = `${sanitizedName}_${timestamp}.${fileExtension}`;

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

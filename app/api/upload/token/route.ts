import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

// This route generates upload tokens for client-side direct upload
// Bypasses the 4.5MB serverless function limit
export async function POST(request: NextRequest) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Validate file type by extension
        const ext = pathname.split('.').pop()?.toLowerCase() || '';
        const allowedExtensions = [
          'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',  // images
          'mp4', 'webm', 'mov', 'avi', 'wmv', 'm4v'    // videos
        ];
        
        if (!allowedExtensions.includes(ext)) {
          throw new Error(`不支持的文件类型: .${ext}`);
        }

        return {
          allowedContentTypes: [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
            'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv'
          ],
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('[Upload Token] Upload completed:', blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('[Upload Token] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 400 }
    );
  }
}

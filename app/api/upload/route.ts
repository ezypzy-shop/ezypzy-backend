/**
 * Upload API route - Hybrid Upload Solution
 * 
 * PREVIEW (AppGen): Uses AppGen's upload service (app-cdn.appgen.com)
 * PRODUCTION (Vercel): Uses Vercel Blob storage when BLOB_READ_WRITE_TOKEN is set
 * 
 * Automatically detects environment and uses the appropriate service.
 * Mobile app doesn't need any changes - same /api/upload endpoint works everywhere.
 */

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

// AppGen's upload service endpoint
const APPGEN_UPLOAD_URL = 'https://app-cdn.appgen.com/upload';

// File size limit (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Environment detection: If Vercel Blob token exists, we're in production
const isProduction = !!process.env.BLOB_READ_WRITE_TOKEN;

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    console.log('[Upload API] Environment:', isProduction ? 'PRODUCTION (Vercel Blob)' : 'PREVIEW (AppGen)');
    console.log('[Upload API] Content-Type:', contentType);

    // Handle FormData uploads (files and React Native assets)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      console.log('[Upload API] File name:', file.name);
      console.log('[Upload API] File size:', file.size, 'bytes');
      console.log('[Upload API] File type:', file.type);

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: 'File too large. Maximum size is 10MB.' },
          { status: 413 }
        );
      }

      // PRODUCTION: Use Vercel Blob Storage
      if (isProduction) {
        try {
          console.log('[Upload API] Uploading to Vercel Blob...');
          
          const blob = await put(file.name, file, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN,
          });

          console.log('[Upload API] ✅ Vercel Blob upload successful:', blob.url);
          return NextResponse.json({ url: blob.url });
        } catch (error) {
          console.error('[Upload API] ❌ Vercel Blob upload failed:', error);
          return NextResponse.json(
            { error: 'Vercel Blob upload failed', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
          );
        }
      }

      // PREVIEW: Use AppGen's upload service
      const appId = process.env.APP_ID;
      const uploadSecret = process.env.APP_UPLOAD_SECRET;

      if (!appId || !uploadSecret) {
        console.error('[Upload API] Missing required environment variables: APP_ID or APP_UPLOAD_SECRET');
        return NextResponse.json(
          { error: 'Server configuration error: Missing upload credentials' },
          { status: 500 }
        );
      }

      console.log('[Upload API] Uploading to AppGen service...');

      // Forward the file to AppGen's upload service
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const uploadResponse = await fetch(APPGEN_UPLOAD_URL, {
        method: 'POST',
        headers: {
          'x-app-id': appId,
          'x-upload-secret': uploadSecret,
        },
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('[Upload API] ❌ AppGen upload service error:', errorText);
        return NextResponse.json(
          { error: 'Upload failed', details: errorText },
          { status: uploadResponse.status }
        );
      }

      const result = await uploadResponse.json();
      console.log('[Upload API] ✅ AppGen upload successful:', result.url);
      return NextResponse.json({ url: result.url });
    }

    // Handle JSON uploads (URL or base64) - Always use AppGen for these
    if (contentType.includes('application/json')) {
      const appId = process.env.APP_ID;
      const uploadSecret = process.env.APP_UPLOAD_SECRET;

      if (!appId || !uploadSecret) {
        console.error('[Upload API] Missing required environment variables: APP_ID or APP_UPLOAD_SECRET');
        return NextResponse.json(
          { error: 'Server configuration error: Missing upload credentials' },
          { status: 500 }
        );
      }

      const body = await request.json();

      // Handle URL upload
      if (body.url) {
        console.log('[Upload API] Uploading from URL:', body.url);
        
        const uploadResponse = await fetch(APPGEN_UPLOAD_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-app-id': appId,
            'x-upload-secret': uploadSecret,
          },
          body: JSON.stringify({ url: body.url }),
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('[Upload API] Upload service error:', errorText);
          return NextResponse.json(
            { error: 'Upload failed', details: errorText },
            { status: uploadResponse.status }
          );
        }

        const result = await uploadResponse.json();
        console.log('[Upload API] ✅ URL upload successful:', result.url);
        return NextResponse.json({ url: result.url });
      }

      // Handle base64 upload
      if (body.base64) {
        console.log('[Upload API] Uploading base64 data...');
        
        const uploadResponse = await fetch(APPGEN_UPLOAD_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-app-id': appId,
            'x-upload-secret': uploadSecret,
          },
          body: JSON.stringify({
            base64: body.base64,
            fileName: body.fileName || 'file',
            mimeType: body.mimeType || 'application/octet-stream',
          }),
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('[Upload API] Upload service error:', errorText);
          return NextResponse.json(
            { error: 'Upload failed', details: errorText },
            { status: uploadResponse.status }
          );
        }

        const result = await uploadResponse.json();
        console.log('[Upload API] ✅ Base64 upload successful:', result.url);
        return NextResponse.json({ url: result.url });
      }

      return NextResponse.json(
        { error: 'Invalid request body. Provide "url" or "base64".' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Invalid content type. Use multipart/form-data or application/json.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Upload API] Exception:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

// Optional: Handle GET requests (for testing/status check)
export async function GET() {
  const appId = process.env.APP_ID;
  const uploadSecret = process.env.APP_UPLOAD_SECRET;
  const hasVercelBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

  return NextResponse.json({
    message: 'Upload endpoint is working. Use POST to upload files.',
    environment: hasVercelBlob ? 'PRODUCTION (Vercel Blob)' : 'PREVIEW (AppGen)',
    configured: {
      appgen: !!appId && !!uploadSecret,
      vercelBlob: hasVercelBlob,
    },
    accepts: ['multipart/form-data', 'application/json'],
    methods: {
      file: 'POST with FormData containing a "file" field (uses Vercel Blob in production)',
      url: 'POST with JSON { "url": "https://..." } (uses AppGen)',
      base64: 'POST with JSON { "base64": "...", "fileName": "...", "mimeType": "..." } (uses AppGen)',
    },
    limits: {
      maxFileSize: '10MB',
    },
  });
}

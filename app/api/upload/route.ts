/**
 * Upload API route
 * Handles file uploads from the mobile app and forwards to AppGen's upload service
 */

import { NextRequest, NextResponse } from 'next/server';

// AppGen's upload service endpoint
const APPGEN_UPLOAD_URL = 'https://app-cdn.appgen.com/upload';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Handle FormData uploads (files and React Native assets)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      // Forward the file to AppGen's upload service
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const uploadResponse = await fetch(APPGEN_UPLOAD_URL, {
        method: 'POST',
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        return NextResponse.json(
          { error: errorText || 'Upload failed' },
          { status: uploadResponse.status }
        );
      }

      const result = await uploadResponse.json();
      return NextResponse.json({ url: result.url });
    }

    // Handle JSON uploads (URL or base64)
    if (contentType.includes('application/json')) {
      const body = await request.json();

      // Handle URL upload
      if (body.url) {
        const uploadResponse = await fetch(APPGEN_UPLOAD_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: body.url }),
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          return NextResponse.json(
            { error: errorText || 'Upload failed' },
            { status: uploadResponse.status }
          );
        }

        const result = await uploadResponse.json();
        return NextResponse.json({ url: result.url });
      }

      // Handle base64 upload
      if (body.base64) {
        const uploadResponse = await fetch(APPGEN_UPLOAD_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64: body.base64,
            fileName: body.fileName || 'file',
            mimeType: body.mimeType || 'application/octet-stream',
          }),
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          return NextResponse.json(
            { error: errorText || 'Upload failed' },
            { status: uploadResponse.status }
          );
        }

        const result = await uploadResponse.json();
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
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

// Optional: Handle GET requests (for testing)
export async function GET() {
  return NextResponse.json({
    message: 'Upload endpoint is working. Use POST to upload files.',
    accepts: ['multipart/form-data', 'application/json'],
    methods: {
      file: 'POST with FormData containing a "file" field',
      url: 'POST with JSON { "url": "https://..." }',
      base64: 'POST with JSON { "base64": "...", "fileName": "...", "mimeType": "..." }',
    },
  });
}

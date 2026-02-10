import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

async function proxyToBackend(request: NextRequest, params: { path: string[] }) {
  const path = params.path.join('/');
  const backendUrl = `${BACKEND_URL}/api/${path}`;

  // Copy search params
  const url = new URL(backendUrl);
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  // Prepare headers
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    // Skip host header to avoid issues
    if (key.toLowerCase() !== 'host') {
      headers.set(key, value);
    }
  });

  try {
    // Get request body if present
    let body: BodyInit | null = null;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.text();
    }

    // Forward request to backend
    const response = await fetch(url.toString(), {
      method: request.method,
      headers,
      body,
    });

    // Copy response headers
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      responseHeaders.set(key, value);
    });

    // Return proxied response
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Error proxying to backend:', error);
    return NextResponse.json(
      { error: 'Backend unavailable' },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyToBackend(request, params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyToBackend(request, params);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyToBackend(request, params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyToBackend(request, params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyToBackend(request, params);
}

export async function OPTIONS(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyToBackend(request, params);
}

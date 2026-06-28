import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);
const FORWARDED_HEADERS = new Set([
  'forwarded',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-port',
  'x-forwarded-proto',
  'x-real-ip',
]);

function safePath(path: string[]): string {
  return path.map((segment) => encodeURIComponent(segment)).join('/');
}

async function proxyToBackend(request: NextRequest, params: { path: string[] }) {
  const backendUrl = `${BACKEND_URL}/api/${safePath(params.path)}`;

  // Copy search params
  const url = new URL(backendUrl);
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  // Prepare headers: forward app headers/cookies, strip hop-by-hop and spoofable proxy headers.
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    if (
      normalizedKey === 'host' ||
      HOP_BY_HOP_HEADERS.has(normalizedKey) ||
      FORWARDED_HEADERS.has(normalizedKey)
    ) {
      return;
    }
    headers.set(key, value);
  });

  const host = request.headers.get('host');
  if (host && /^[a-z0-9.-]+(?::\d+)?$/i.test(host)) {
    headers.set('x-forwarded-host', host);
  }
  headers.set('x-forwarded-proto', request.nextUrl.protocol.replace(':', '') || 'https');

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
      redirect: 'manual',
    });

    // Copy response headers, except hop-by-hop headers.
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
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

import { NextRequest, NextResponse } from 'next/server';

/**
 * GRN API Proxy
 *
 * Proxies requests to the Global Recordings Network API.
 * GRN API is public and does not require an API key.
 *
 * Query Parameters:
 * - endpoint: The GRN API endpoint (e.g., 'feeds/language/23', 'feeds/set/23040')
 * - All other query params are forwarded to the GRN API
 *
 * Examples:
 * - GET /api/grn?endpoint=feeds/language/23
 * - GET /api/grn?endpoint=feeds/set/23040
 * - GET /api/grn?endpoint=files/track/23040/1
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);

    // Get the endpoint from query params
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Missing endpoint parameter' },
        { status: 400 }
      );
    }

    // Build GRN API URL
    const grnBaseUrl = 'https://api.globalrecordings.net';
    const grnUrl = new URL(`${grnBaseUrl}/${endpoint}`);

    // Forward all query params except 'endpoint' to GRN API
    searchParams.forEach((value, key) => {
      if (key !== 'endpoint') {
        grnUrl.searchParams.set(key, value);
      }
    });

    // Check if this is a file endpoint (returns redirect to binary file)
    const isFileEndpoint = endpoint.startsWith('files/');

    // Fetch from GRN API
    const response = await fetch(grnUrl.toString(), {
      method: 'GET',
      headers: {
        Accept: isFileEndpoint ? '*/*' : 'application/json',
      },
      redirect: isFileEndpoint ? 'follow' : 'manual', // Follow redirects for file endpoints
      // Cache for 24 hours (GRN data is static)
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GRN API error: ${response.status} - ${errorText}`);

      return NextResponse.json(
        {
          error: 'Failed to fetch from GRN API',
          status: response.status,
        },
        { status: response.status }
      );
    }

    // For file endpoints, return the redirect URL or stream the file
    if (isFileEndpoint) {
      // If we got a redirect, return the location header
      if (
        response.status === 303 ||
        response.status === 301 ||
        response.status === 302
      ) {
        const location = response.headers.get('location');
        if (location) {
          return NextResponse.redirect(location, {
            headers: {
              'Cache-Control':
                'public, s-maxage=86400, stale-while-revalidate=172800',
            },
          });
        }
      }

      // Otherwise, stream the file content
      const contentType = response.headers.get('content-type') || 'audio/mpeg';
      const fileBuffer = await response.arrayBuffer();

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control':
            'public, s-maxage=86400, stale-while-revalidate=172800',
        },
      });
    }

    // For JSON endpoints, parse and return JSON
    const data = await response.json();

    // Return the data with long cache headers (GRN data is static)
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control':
          'public, s-maxage=86400, stale-while-revalidate=172800',
      },
    });
  } catch (error) {
    console.error('GRN API proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

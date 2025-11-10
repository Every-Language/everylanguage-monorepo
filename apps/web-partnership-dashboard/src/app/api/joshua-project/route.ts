import { NextRequest, NextResponse } from 'next/server';
import { serverEnv } from '@/lib/env';

/**
 * Joshua Project API Proxy
 * 
 * Proxies requests to the Joshua Project API to keep the API key secure on the server.
 * 
 * Query Parameters:
 * - endpoint: The JP API endpoint (e.g., 'countries', 'languages', 'people_groups')
 * - All other query params are forwarded to the JP API
 * 
 * Examples:
 * - GET /api/joshua-project?endpoint=countries/URY
 * - GET /api/joshua-project?endpoint=languages/anu
 * - GET /api/joshua-project?endpoint=people_groups&ROG3=URY&limit=10
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

    // Validate API key is configured
    if (!serverEnv.JOSHUA_PROJECT_API_KEY) {
      console.error('JOSHUA_PROJECT_API_KEY is not configured');
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      );
    }

    // Build Joshua Project API URL
    const jpBaseUrl = 'https://api.joshuaproject.net/v1';
    const jpUrl = new URL(`${jpBaseUrl}/${endpoint}.json`);
    
    // Forward all query params except 'endpoint' to JP API
    searchParams.forEach((value, key) => {
      if (key !== 'endpoint') {
        jpUrl.searchParams.set(key, value);
      }
    });
    
    // Add API key
    jpUrl.searchParams.set('api_key', serverEnv.JOSHUA_PROJECT_API_KEY);

    // Fetch from Joshua Project API
    const response = await fetch(jpUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Cache for 10 minutes
      next: { revalidate: 600 },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Joshua Project API error: ${response.status} - ${errorText}`);
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch from Joshua Project API',
          status: response.status,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return the data with CORS headers
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
      },
    });
  } catch (error) {
    console.error('Joshua Project API proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



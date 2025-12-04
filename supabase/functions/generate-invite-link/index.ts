import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  createSuccessResponse,
  createErrorResponse,
  createCorsResponse,
} from '../_shared/response-utils.ts';
import {
  authenticateRequest,
  isAuthError,
  createAuthErrorResponse,
} from '../_shared/auth-middleware.ts';

interface GenerateInviteLinkRequest {
  userId?: string;
  email?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return createCorsResponse();
  }

  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    // Authenticate the request - only logged-in admins can generate invite links
    const authCtx = await authenticateRequest(req);
    if (isAuthError(authCtx)) {
      return createAuthErrorResponse(authCtx);
    }

    let body: GenerateInviteLinkRequest;
    try {
      body = await req.json();
    } catch {
      return createErrorResponse('Invalid JSON', 400);
    }

    const { userId, email } = body;

    if (!userId && !email) {
      return createErrorResponse('Either userId or email is required', 400);
    }

    // Use service role key for Admin API operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let targetEmail: string;

    // If userId provided, fetch email from public.users
    if (userId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();

      if (fetchError || !user) {
        return createErrorResponse(
          `User not found: ${fetchError?.message || 'Unknown error'}`,
          404
        );
      }

      if (!user.email) {
        return createErrorResponse('User does not have an email address', 400);
      }

      targetEmail = user.email;
    } else {
      targetEmail = email!;
    }

    // Get partnership dashboard URL based on environment
    // Priority: 1. PARTNERSHIP_DASHBOARD_URL env var (allows override)
    //           2. Auto-detect based on Supabase URL
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const env = (Deno.env.get('ENV') ?? '').toLowerCase();

    // Detect environment
    const isLocalDev =
      supabaseUrl.includes('localhost') ||
      supabaseUrl.includes('127.0.0.1') ||
      env === 'development' ||
      env === 'dev';

    // Extract project ref from Supabase URL to detect dev vs prod
    // Format: https://<project-ref>.supabase.co
    const projectRefMatch = supabaseUrl.match(
      /https?:\/\/([^.]+)\.supabase\.co/
    );
    const projectRef = projectRefMatch ? projectRefMatch[1] : '';

    // Determine if this is a dev project (you can customize this logic)
    // Common patterns: dev projects might have 'dev' in the name or different refs
    // For now, we'll use an environment variable or check project ref
    const isDevProject =
      projectRef.includes('dev') ||
      projectRef.includes('staging') ||
      env === 'development' ||
      env === 'dev';

    // Allow PARTNERSHIP_DASHBOARD_URL to override defaults
    let partnershipDashboardUrl = Deno.env.get('PARTNERSHIP_DASHBOARD_URL');

    if (!partnershipDashboardUrl) {
      if (isLocalDev) {
        partnershipDashboardUrl = 'http://localhost:5173';
      } else if (isDevProject) {
        partnershipDashboardUrl = 'https://everylanguage-map-portal.vercel.app';
      } else {
        partnershipDashboardUrl = 'https://map.everylanguage.com';
      }
    }

    const redirectTo = `${partnershipDashboardUrl}/api/auth/confirm`;

    // Use 'recovery' type for existing users
    // Since users are created via create-user before generating links, they always exist
    // Recovery links work for both password setup (if no password) and password reset
    console.error('DEBUG: About to generate invite link:', {
      email: targetEmail.trim(),
      redirectTo,
      linkType: 'recovery',
      isLocalDev,
      isDevProject,
      projectRef,
      partnershipDashboardUrl,
      hasPartnershipDashboardUrlEnv: !!Deno.env.get(
        'PARTNERSHIP_DASHBOARD_URL'
      ),
      supabaseUrlPrefix: supabaseUrl.substring(0, 30) + '...', // Truncate for security
      hasServiceRoleKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    });

    const generateLinkOptions = {
      type: 'recovery' as const,
      email: targetEmail.trim(),
      options: {
        redirectTo,
      },
    };

    console.error('DEBUG: Calling generateLink with options:', {
      type: generateLinkOptions.type,
      email: generateLinkOptions.email,
      redirectTo: generateLinkOptions.options.redirectTo,
    });

    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink(generateLinkOptions);

    console.error('DEBUG: generateLink response:', {
      hasError: !!linkError,
      hasLinkData: !!linkData,
      linkDataPreview: linkData
        ? JSON.stringify(linkData).substring(0, 200)
        : null,
    });

    console.error('DEBUG: generateLink result:', {
      hasError: !!linkError,
      errorMessage: linkError?.message,
      errorCode: linkError?.status,
      hasLinkData: !!linkData,
      linkDataType: typeof linkData,
      linkDataKeys: linkData ? Object.keys(linkData) : [],
      hasProperties: !!linkData?.properties,
      propertiesKeys: linkData?.properties
        ? Object.keys(linkData.properties)
        : [],
      hasActionLink: !!linkData?.properties?.action_link,
      hasDirectActionLink: !!linkData?.action_link,
    });

    if (linkError) {
      console.error('Error generating invite link:', linkError);
      const errorDetails = {
        message: linkError.message,
        status: linkError.status,
        name: linkError.name,
      };
      return createErrorResponse(
        `Failed to generate invite link: ${linkError.message}`,
        500,
        JSON.stringify(errorDetails)
      );
    }

    // Check multiple possible response structures for the action link
    // Recovery links may have different structure than invite links
    const actionLink =
      linkData?.properties?.action_link ||
      linkData?.action_link ||
      (linkData?.properties && typeof linkData.properties === 'string'
        ? linkData.properties
        : null);

    if (!actionLink) {
      const debugInfo = {
        hasLinkData: !!linkData,
        linkDataType: typeof linkData,
        linkDataKeys: linkData ? Object.keys(linkData) : [],
        hasProperties: !!linkData?.properties,
        propertiesType: typeof linkData?.properties,
        propertiesValue: linkData?.properties,
        propertiesKeys:
          linkData?.properties && typeof linkData.properties === 'object'
            ? Object.keys(linkData.properties)
            : [],
        fullLinkData: linkData,
      };
      console.error('No action_link in response:', debugInfo);
      return createErrorResponse(
        'Failed to generate invite link - no link returned',
        500,
        JSON.stringify(debugInfo)
      );
    }

    return createSuccessResponse({
      inviteLink: actionLink,
    });
  } catch (error) {
    console.error('Unexpected error in generate-invite-link:', error);
    console.error(
      'Full error details:',
      JSON.stringify(
        {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : typeof error,
        },
        null,
        2
      )
    );
    return createErrorResponse(
      'Internal server error',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});

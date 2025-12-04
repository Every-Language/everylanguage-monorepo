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

interface CreateUserRequest {
  email: string;
  first_name?: string;
  last_name?: string;
}

Deno.serve(async (req: Request) => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/b21c1bbc-918b-4be7-8e62-e18feb341829', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'create-user/index.ts:20',
      message: 'Edge Function called',
      data: {
        method: req.method,
        hasAuthHeader: !!req.headers.get('Authorization'),
        authHeaderPrefix: req.headers.get('Authorization')?.substring(0, 20),
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'B',
    }),
  }).catch(() => {});
  // #endregion

  if (req.method === 'OPTIONS') {
    return createCorsResponse();
  }

  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    // Authenticate the request - only logged-in admins can create users
    // Note: When verify_jwt=false in config, gateway doesn't validate JWT,
    // but we still need to authenticate via middleware
    const authCtx = await authenticateRequest(req);
    // #region agent log
    console.error('DEBUG: Auth check result:', {
      isAuthError: isAuthError(authCtx),
      authErrorStatus: isAuthError(authCtx) ? authCtx.status : null,
      authErrorMsg: isAuthError(authCtx) ? authCtx.error : null,
      hasUserId: !isAuthError(authCtx) ? !!authCtx.publicUserId : false,
      authHeader: req.headers.get('Authorization')?.substring(0, 30),
    });
    // #endregion

    if (isAuthError(authCtx)) {
      console.error(
        'DEBUG: Auth error details:',
        JSON.stringify(authCtx, null, 2)
      );
      return createAuthErrorResponse(authCtx);
    }

    let body: CreateUserRequest;
    try {
      body = await req.json();
    } catch {
      return createErrorResponse('Invalid JSON', 400);
    }

    const { email, first_name, last_name } = body;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b21c1bbc-918b-4be7-8e62-e18feb341829', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'create-user/index.ts:43',
        message: 'Request body parsed',
        data: { email, hasFirstName: !!first_name, hasLastName: !!last_name },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'A',
      }),
    }).catch(() => {});
    // #endregion

    if (!email || typeof email !== 'string' || !email.trim()) {
      return createErrorResponse('Email is required', 400);
    }

    // Use service role key for Admin API operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b21c1bbc-918b-4be7-8e62-e18feb341829', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'create-user/index.ts:52',
        message: 'Environment check',
        data: {
          hasSupabaseUrl: !!supabaseUrl,
          hasServiceRoleKey: !!serviceRoleKey,
          urlLength: supabaseUrl.length,
          keyLength: serviceRoleKey.length,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'D',
      }),
    }).catch(() => {});
    // #endregion

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing environment variables:', {
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceRoleKey: !!serviceRoleKey,
      });
      return createErrorResponse(
        'Server configuration error - missing environment variables',
        500
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Create auth.users record via Admin API
    // This will trigger the handle_new_auth_user trigger which creates public.users
    console.error('DEBUG: About to call admin.createUser with:', {
      email: email.trim(),
      hasFirstName: !!first_name,
      hasLastName: !!last_name,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRoleKey: !!serviceRoleKey,
    });

    const { data: authUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: email.trim(),
        email_confirm: true, // Skip email confirmation since admin-invited
        user_metadata: {
          first_name: first_name?.trim() || null,
          last_name: last_name?.trim() || null,
        },
      });

    // #region agent log
    console.error('DEBUG: Admin API createUser result:', {
      hasError: !!createError,
      errorMessage: createError?.message,
      errorCode: createError?.status,
      errorDetails: createError ? JSON.stringify(createError, null, 2) : null,
      hasUser: !!authUser?.user,
      userId: authUser?.user?.id,
      userEmail: authUser?.user?.email,
    });
    // #endregion

    if (createError) {
      console.error('Error creating auth user:', createError);
      console.error(
        'Full error details:',
        JSON.stringify(createError, null, 2)
      );
      return createErrorResponse(
        `Failed to create user: ${createError.message}`,
        500
      );
    }

    if (!authUser.user) {
      console.error(
        'No user returned from createUser:',
        JSON.stringify(authUser, null, 2)
      );
      return createErrorResponse(
        'User creation failed - no user returned',
        500
      );
    }

    // Wait a moment for the trigger to create public.users record
    // Then update it with any additional profile data if needed
    await new Promise(resolve => setTimeout(resolve, 500));

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Update public.users with profile data if provided
    if (first_name || last_name) {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          first_name: first_name?.trim() || null,
          last_name: last_name?.trim() || null,
        })
        .eq('id', authUser.user.id);

      if (updateError) {
        console.error('Error updating public.users:', updateError);
        // Don't fail the request - user was created successfully
      }
    }

    return createSuccessResponse({
      userId: authUser.user.id,
      email: authUser.user.email,
    });
  } catch (error) {
    console.error('Unexpected error in create-user:', error);
    // #region agent log
    console.error(
      'DEBUG: Full error details:',
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
    // #endregion
    return createErrorResponse(
      'Internal server error',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});

# Edge Functions Authentication

Edge functions use shared authentication middleware to validate requests and extract user context.

## Authentication Middleware

The `authenticateRequest()` function in `supabase/functions/_shared/auth-middleware.ts` handles:

1. **CORS handling** - Sets appropriate CORS headers
2. **User authentication** - Validates Supabase Auth token
3. **User ID extraction** - Gets authenticated user ID

## Usage

```typescript
import {
  authenticateRequest,
  isAuthError,
} from '../_shared/auth-middleware.ts';

Deno.serve(async (req: Request) => {
  // Authenticate request
  const authResult = await authenticateRequest(req);

  if (isAuthError(authResult)) {
    return new Response(JSON.stringify({ error: authResult.error }), {
      status: authResult.status,
    });
  }

  // authResult contains:
  // - supabaseClient: Authenticated Supabase client
  // - user: Supabase Auth user object
  // - publicUserId: User ID (same as user.id)

  const { supabaseClient, user, publicUserId } = authResult;

  // Use authenticated client for database operations
  const { data } = await supabaseClient.from('projects').select('*');

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

## User ID Optimization

**Important**: `user.id` equals `public.users.id`, so you can use `user.id` directly:

```typescript
// ✅ Use user.id directly
const { data } = await supabaseClient
  .from('projects')
  .select('*')
  .eq('created_by', user.id);

// ❌ Don't look up public.users.id separately
```

## Error Handling

The middleware returns structured errors:

```typescript
interface AuthError {
  status: number;
  error: string;
  details?: string;
}
```

Common errors:

- `401` - Authentication required (no token or invalid token)
- `400` - Invalid user ID
- `500` - Authentication failed

## Public Endpoints

For endpoints that don't require authentication, skip the middleware:

```typescript
Deno.serve(async (req: Request) => {
  // Public endpoint - no auth required
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? ''
  );

  // Use unauthenticated client
});
```

## Best Practices

1. **Always authenticate** - Use middleware for protected endpoints
2. **Handle errors** - Check `isAuthError()` before proceeding
3. **Use authenticated client** - Use `supabaseClient` from auth result
4. **Use user.id directly** - No need to look up public user ID
5. **Set CORS headers** - Middleware handles this automatically

# Frontend Authentication

Each app in the monorepo implements authentication using Supabase Auth with React Context for state management.

## Architecture

### Auth Context

Each app has an `AuthContext` that provides:

- Current user and session
- Loading state
- Auth methods (sign in, sign out, etc.)
- User roles (admin dashboard only)

### Auth Service

The `AuthService` class wraps Supabase Auth methods:

- `getCurrentUser()` - Get current authenticated user
- `getCurrentSession()` - Get current session
- `signIn()` - Sign in with email/password
- `signOut()` - Sign out
- `resetPassword()` - Request password reset
- Additional methods vary by app (phone auth, OAuth, etc.)

## Usage Patterns

### Accessing Auth State

```typescript
import { useAuth } from '@/features/auth/context/AuthContext';

function MyComponent() {
  const { user, session, loading } = useAuth();

  if (loading) return <Loading />;
  if (!user) return <LoginPrompt />;

  return <div>Welcome, {user.email}</div>;
}
```

### Protected Routes

Wrap routes that require authentication:

```typescript
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
```

### Signing In

```typescript
const { signIn } = useAuth();

try {
  await signIn(email, password);
  // Auth state updates automatically via listener
} catch (error) {
  // Handle error
}
```

### Signing Out

```typescript
const { signOut } = useAuth();

await signOut();
// User is redirected to login page
```

## App-Specific Differences

### Admin Dashboard

- Fetches user roles on auth state change
- Uses `getUserRoles()` RPC function
- Provides `userRoles` in auth context

### Project & Partnership Dashboards

- Optimized to not fetch profile data automatically
- Use dedicated hooks for profile data when needed
- Support phone authentication (OTP)

## Auth State Management

### State Updates

Auth state updates automatically via Supabase's `onAuthStateChange` listener. The context listens for:

- `SIGNED_IN` - User signs in
- `SIGNED_OUT` - User signs out
- `TOKEN_REFRESHED` - Session token refreshed
- `USER_UPDATED` - User metadata updated

### Loading States

The auth context manages loading states:

- `loading: true` - Initial load or during auth operations
- `loading: false` - Auth state resolved

## Best Practices

1. **Don't fetch profile data in auth context** - Use dedicated hooks/queries
2. **Handle loading states** - Show loading UI while `loading === true`
3. **Use ProtectedRoute** - Don't manually check auth in components
4. **Handle errors gracefully** - Auth operations can fail
5. **Listen to auth changes** - Don't manually refresh user state

## User Roles (Admin Dashboard)

The admin dashboard fetches user roles:

```typescript
const { userRoles } = useAuth();

// Check if user has specific role
const isAdmin = userRoles.some(role => role.role_key === 'system_admin');
```

Roles are fetched via the `get_user_roles()` RPC function, which bypasses RLS to prevent recursion issues.

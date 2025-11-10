# User Management

## User Creation

Users are automatically created when they sign up through Supabase Auth. A database trigger (`on_auth_user_created`) handles the creation:

- **Authenticated users**: Creates record in `public.users` table
- **Anonymous users**: Creates record in `public.users_anon` table

The trigger extracts profile data from `auth.users` and `raw_user_meta_data`:

- Email from `auth.users.email`
- Phone from `auth.users.phone` (with fallback to metadata)
- First name, last name from `raw_user_meta_data`

## User ID Synchronization

**Important**: `auth.users.id` equals `public.users.id`. This eliminates the need for an `auth_uid` foreign key column.

When referencing users in your code:

- Use `user.id` directly for `created_by` fields
- No need to look up `public.users.id` separately
- Edge functions can use `user.id` directly as the public user ID

## User Profile

### Fetching Profile Data

Avoid fetching profile data automatically on auth state changes. Instead:

```typescript
// ❌ Don't fetch profile in auth context
const { data: dbUser } = await supabase
  .from('users')
  .select('*')
  .eq('id', user.id)
  .single();

// ✅ Use dedicated hooks/queries when needed
const { data: profile } = useUserProfile(user.id);
```

### Updating Profile

Use the auth service's `updateProfile` method:

```typescript
await authService.updateProfile({
  firstName: 'John',
  lastName: 'Doe',
  phone: '+1234567890',
});
```

This updates both `auth.users` (for phone) and `public.users` (for profile fields).

## Phone Number Normalization

Phone numbers are normalized before storage using the `normalizePhoneNumber` utility. This ensures consistent formatting across the system.

# User & RBAC Functions & Triggers

Functions and triggers related to user management and RBAC.

## Functions

### `get_user_roles(target_user_id UUID)`

**RPC function** - Safely retrieves user roles without triggering RLS recursion.

- Returns: Table of role assignments with `role_key`, `role_name`, `resource_type`, `context_type`, `context_id`
- Security: Uses `SECURITY DEFINER` to bypass RLS
- Validation: Users can only fetch their own roles

See [RBAC System](../../auth/rbac.md) for details.

### `search_partner_orgs(search_query TEXT, max_results INTEGER DEFAULT 10)`

Fuzzy search for public partner organizations.

- Returns: Partner orgs with similarity scores
- Uses: Trigram similarity matching
- Filters: Only public, non-deleted orgs
- Used for: Partner org selection/search

## Triggers

### `handle_new_auth_user()`

**Trigger function** - Automatically creates `public.users` or `users_anon` records when a user signs up via Supabase Auth.

- Fires on: `INSERT` on `auth.users`
- Creates authenticated user records in `public.users`
- Creates anonymous user records in `users_anon` (when `is_anonymous = true`)
- Extracts profile data from `raw_user_meta_data`

See [User Management](../../auth/user-management.md) for details.

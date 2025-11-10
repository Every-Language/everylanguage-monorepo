# Authentication & Authorization Overview

This monorepo uses **Supabase Auth** for authentication and a custom **Role-Based Access Control (RBAC)** system with **Row Level Security (RLS)** for authorization.

## Architecture

- **Authentication**: Handled by Supabase Auth (email/password, phone/OTP, OAuth)
- **Authorization**: Custom RBAC system with permission inheritance across resources
- **Security**: RLS policies enforce permissions at the database level

## Key Components

### User Management

- Users are automatically created in `public.users` when they sign up via Supabase Auth
- User IDs are synchronized: `auth.users.id` = `public.users.id`
- See [User Management](./user-management.md) for details

### RBAC System

- Scoped roles (team, project, base, partner, global)
- Explicit permissions mapped to roles
- Permission inheritance across relationships
- See [RBAC](./rbac.md) for details

### RLS Policies

- Database-level security enforced via PostgreSQL RLS
- Uses `has_permission()` function to check access
- See [RLS Policies](./rls-policies.md) for details

## Frontend Integration

Each app (`web-admin-dashboard`, `web-project-dashboard`, `web-partnership-dashboard`) has its own auth implementation:

- **Auth Context**: React context for auth state management
- **Auth Service**: Service layer wrapping Supabase Auth
- **Protected Routes**: Route guards for authenticated pages

See [Frontend Auth](./frontend-auth.md) for implementation details.

## Edge Functions

Edge functions use middleware to authenticate requests and extract user context.

See [Edge Functions Auth](./edge-functions-auth.md) for details.

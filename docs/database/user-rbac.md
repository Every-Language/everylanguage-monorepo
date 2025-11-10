# User & RBAC Domain

User and RBAC domain manages authentication, authorization, and organizational structure.

## Purpose

This domain stores:

- User accounts and profiles
- Role-based access control (RBAC) system
- Organizational structure (teams, bases, partner orgs)
- Role assignments and permissions

## User Management

### `users`

User profiles linked to Supabase Auth. Stores name, email, phone.

## RBAC System

### `roles`

Role definitions with `role_key` and `resource_type`. Examples: `project_admin`, `team_member`, `system_admin`.

### `user_roles`

Role assignments to users with context (team, project, base, partner, global).

### `role_permissions`

Permissions granted to roles. Maps roles to permission keys (e.g., `project.read`, `project.write`).

## Organizational Structure

### `teams`

Teams of users working together (translation teams, technical teams, etc.).

### `bases`

Physical locations/bases where teams operate. Includes PostGIS location data.

### `partner_orgs`

Partner organizations that collaborate on projects.

### `bases_teams`

Junction table linking bases to teams.

### `projects_teams`

Junction table linking projects to teams. Includes optional `project_role_id` for team-wide project permissions.

## Notes

- RBAC system supports scoped roles (team, project, base, partner, global)
- Permissions inherit across relationships (team → project, base → project, partner → project)
- See [RBAC documentation](../auth/rbac.md) for detailed permission evaluation logic
- All organizational tables use `created_by` indicating shared resources

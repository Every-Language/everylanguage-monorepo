# RBAC System

The backend uses a **scoped role-based access control** system with explicit permissions and inheritance across relationships.

## Core Concepts

### Resource Types

Resources are categorized by type:

- `global` - System-wide permissions
- `team` - Team-scoped permissions
- `project` - Project-scoped permissions
- `base` - Base/location-scoped permissions
- `partner` - Partner organization-scoped permissions

### Permission Keys

Permissions follow a pattern: `{resource}.{action}`

Common permissions:

- `system.admin` - Full system access
- `team.read`, `team.write`, `team.delete`, `team.invite`, `team.manage_roles`
- `project.read`, `project.write`, `project.delete`, `project.invite`, `project.manage_roles`
- `base.read`, `base.write`, `base.delete`, `base.manage_roles`
- `partner.read`, `partner.manage_roles`
- `budget.read`, `budget.write`, `contribution.read`, `contribution.write`

## Database Schema

### Core Tables

**roles**

- `id` - UUID primary key
- `name` - Human-readable role name
- `role_key` - Unique identifier (e.g., `project_admin`)
- `resource_type` - The resource type this role applies to

**user_roles**

- `user_id` - References `public.users.id`
- `role_id` - References `roles.id`
- `context_type` - Resource type (`team`, `project`, `base`, `partner`)
- `context_id` - ID of the specific resource

**role_permissions**

- `role_id` - References `roles.id`
- `resource_type` - Resource type the permission applies to
- `permission_key` - The permission being granted/denied
- `is_allowed` - Boolean (true = allow, false = deny)

### Relationship Tables

**projects_teams**

- Links teams to projects
- `project_role_id` - Optional override role all team members inherit for this project
- `assigned_at` / `unassigned_at` - Soft history tracking

**bases_teams**

- Links bases to teams
- `assigned_at` / `unassigned_at` - Soft history tracking

**partner_orgs_projects**

- Links partner organizations to projects
- `assigned_at` / `unassigned_at` - Soft history tracking

## Permission Evaluation

The `has_permission()` function checks permissions in this order:

1. **System admin shortcut** - If user has `system.admin`, grant all permissions
2. **Ownership** - Resource owners get read/write (but not delete) automatically
3. **Direct role** - Check if user has a role directly on the resource
4. **Team inheritance** - User's team roles → project permissions (via `projects_teams`)
5. **Base inheritance** - User's base roles → team → project (via `bases_teams` + `projects_teams`)
6. **Partner inheritance** - User's partner roles → project (via `partner_orgs_projects`)

### Example: Team → Project Inheritance

A user with `team_member` role on Team A automatically gets project permissions when Team A is assigned to a project. If `projects_teams.project_role_id` is set, all team members inherit that specific project role instead.

## Standard Roles

### Team Roles

- `team_member` - Basic team access
- `team_leader` - Team leadership
- `team_admin` - Full team management

### Project Roles

- `project_viewer` - Read-only access
- `project_editor` - Read and write access
- `project_admin` - Full project management (including delete)

### Base Roles

- `base_member` - Basic base access
- `base_staff` - Base staff privileges
- `base_leader` - Base leadership
- `base_admin` - Full base management

### Partner Roles

- `partner_member` - Basic partner access
- `partner_leader` - Partner leadership
- `partner_admin` - Full partner management

### Global Roles

- `system_admin` - Full system access

## Important Notes

- **Delete permissions**: Only `project_admin` has `project.delete` by default. Team/base admins don't automatically get delete permissions.
- **Soft history**: Relationship tables use `assigned_at`/`unassigned_at` for history. Current assignments have `unassigned_at IS NULL`.
- **Type safety**: `resource_type` is stored alongside `permission_key` to enable future migration to generic keys without breaking changes.

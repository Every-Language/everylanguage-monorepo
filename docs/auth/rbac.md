# RBAC System

The backend uses a **scoped role-based access control** system with explicit permissions and inheritance across relationships. All authorization is enforced at the database level through Row Level Security (RLS) policies.

## Core Concepts

### Resource Types

Resources are categorized by type:

- `global` - System-wide permissions
- `project` - Project-scoped permissions
- `base` - Base/location-scoped permissions
- `partner` - Partner organization-scoped permissions

**Note:** The `team` resource type was removed in favor of direct base-project relationships.

### Permission Keys

Permissions follow a pattern: `{resource}.{action}`

Common permissions:

- `system.admin` - Full system access
- `project.read`, `project.write`, `project.delete`, `project.manage_roles`
- `base.read`, `base.write`, `base.delete`, `base.manage_roles`
- `partner.read`, `partner.manage_roles`
- `budget.read`, `budget.write`, `contribution.read`, `contribution.write`
- `verse_feedback.read`, `verse_feedback.write`, `verse_feedback.delete` - Special permissions for verse feedback

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
- `project_id` - References `projects.id` (NULL if not a project-scoped role)
- `base_id` - References `bases.id` (NULL if not a base-scoped role)
- `partner_org_id` - References `partner_orgs.id` (NULL if not a partner-scoped role)
- `is_global` - Boolean flag indicating a global/system-wide role (TRUE for global roles)
- Exactly one of `project_id`, `base_id`, `partner_org_id`, or `is_global` must be set

**role_permissions**

- `role_id` - References `roles.id`
- `resource_type` - Resource type the permission applies to
- `permission_key` - The permission being granted/denied
- `is_allowed` - Boolean (true = allow, false = deny)

### Relationship Tables

**bases_projects**

- Links bases to projects for permission inheritance
- `base_id` - References `bases.id`
- `project_id` - References `projects.id`
- `assigned_at` / `unassigned_at` - Soft history tracking (current assignments have `unassigned_at IS NULL`)

**partner_orgs_projects**

- Links partner organizations to projects
- `partner_org_id` - References `partner_orgs.id`
- `project_id` - References `projects.id`
- `assigned_at` / `unassigned_at` - Soft history tracking

## Permission Evaluation

The `has_permission()` function checks permissions in this order:

1. **System admin shortcut** - If user has `system.admin`, grant all permissions
2. **Project permissions** - For project resources or project child entities:
   - Direct role on project
   - Base-project inheritance (via `bases_projects`)
   - Partner-project inheritance (via `partner_orgs_projects`)
3. **Direct role on resource** - Check if user has a role directly on the resource

### Helper Functions

**`resolve_project_id(table_name, record_id)`**

Resolves the parent project ID for any project child entity. Supports:

- `projects`, `audio_versions`, `text_versions`, `sequences`, `project_updates`
- `media_files`, `media_files_verses`, `verse_texts`, `project_updates_media`
- `sequences_segments`, `verse_feedback`, `segments`

**`check_project_permission(user_id, action, project_id)`**

Checks project permissions through three paths:

1. Direct role on project
2. Base-project inheritance (user's base role → base → project)
3. Partner-project inheritance (user's partner role → partner → project)

### Example: Base → Project Inheritance

A user with `base_admin` role on Base A automatically gets project permissions for all projects linked to Base A via `bases_projects`. The inheritance follows the role's permissions - if `base_admin` has `project.write`, the user gets `project.write` on linked projects.

### Example: Verse Feedback Permissions

The `project_checker` role has special permissions:

- `project.read` - Can read projects
- `verse_feedback.read`, `verse_feedback.write`, `verse_feedback.delete` - Full CRUD on verse feedback

This allows checkers to review and manage feedback without full project edit access.

## Standard Roles

### Project Roles

- `project_viewer` - Read-only access (`project.read`, `budget.read`, `contribution.read`)
- `project_editor` - Read and write access (`project.read`, `project.write`, `budget.read`, `contribution.read`)
- `project_admin` - Full project management (`project.read`, `project.write`, `project.delete`, `project.manage_roles`, `budget.read`, `budget.write`, `contribution.read`)
- `project_checker` - Read projects, full verse feedback access (`project.read`, `verse_feedback.read`, `verse_feedback.write`, `verse_feedback.delete`)

### Base Roles

- `base_member` - Basic base access (`base.read`)
- `base_leader` - Base leadership (`base.read`, `base.write`)
- `base_staff` - Base staff privileges (`base.read`, `base.write`)
- `base_admin` - Full base management (`base.read`, `base.write`, `base.delete`, `base.manage_roles`)

### Partner Roles

- `partner_member` - Basic partner access (`partner.read`, `contribution.read`)
- `partner_leader` - Partner leadership (`partner.read`, `contribution.read`, `contribution.write`)
- `partner_admin` - Full partner management (`partner.read`, `partner.manage_roles`, `contribution.read`, `contribution.write`)

### Global Roles

- `system_admin` - Full system access (`system.admin`)

## Inheritance Patterns

### Base → Project Inheritance

When a base is linked to a project via `bases_projects`:

- Users with base roles inherit corresponding project permissions
- The inheritance is based on the role's `role_permissions` entries
- Only active links (`unassigned_at IS NULL`) are considered

### Partner → Project Inheritance

When a partner organization is linked to a project via `partner_orgs_projects`:

- Users with partner roles inherit corresponding project permissions
- Similar to base inheritance, follows role permissions

### Project Child Entities

All project child entities (e.g., `audio_versions`, `text_versions`, `media_files`, `verse_feedback`) inherit permissions from their parent project. The `resolve_project_id()` function handles the relationship traversal.

## Query Examples

### Querying user roles with new column structure

```sql
-- Get all project roles for a user
SELECT * FROM user_roles
WHERE user_id = '...' AND project_id IS NOT NULL;

-- Get all base roles for a user
SELECT * FROM user_roles
WHERE user_id = '...' AND base_id IS NOT NULL;

-- Get all partner org roles for a user
SELECT * FROM user_roles
WHERE user_id = '...' AND partner_org_id IS NOT NULL;

-- Get global roles for a user
SELECT * FROM user_roles
WHERE user_id = '...' AND is_global = TRUE;
```

### Frontend query examples

```typescript
// Query project roles
const { data } = await supabase
  .from('user_roles')
  .select('*')
  .eq('project_id', projectId)
  .not('project_id', 'is', null);

// Query base roles
const { data } = await supabase
  .from('user_roles')
  .select('*')
  .eq('base_id', baseId)
  .not('base_id', 'is', null);

// Query partner org roles
const { data } = await supabase
  .from('user_roles')
  .select('*')
  .eq('partner_org_id', partnerOrgId)
  .not('partner_org_id', 'is', null);
```

## Important Notes

- **Delete permissions**: Only `project_admin` has `project.delete` by default. Base/partner admins don't automatically get delete permissions.
- **Column structure**: The `user_roles` table uses explicit columns (`project_id`, `base_id`, `partner_org_id`, `is_global`) instead of the polymorphic `context_type`/`context_id` pattern for better type safety and query performance.
- **Soft history**: Relationship tables use `assigned_at`/`unassigned_at` for history. Current assignments have `unassigned_at IS NULL`.
- **Type safety**: `resource_type` is stored alongside `permission_key` to enable future migration to generic keys without breaking changes.
- **No ownership shortcut**: The system no longer grants automatic permissions based on resource ownership. All access must be through explicit roles.
- **Security definer**: The `has_permission()` function uses `SECURITY DEFINER` to bypass RLS when checking permissions, preventing infinite recursion.

## Usage in Application Code

When checking permissions in application code:

```typescript
// Check if user can read a project
const canRead = await hasPermission(
  userId,
  'project.read',
  'project',
  projectId
);

// Check if user can write to a project
const canWrite = await hasPermission(
  userId,
  'project.write',
  'project',
  projectId
);
```

The function automatically handles:

- System admin bypass
- Inheritance paths (base → project, partner → project)
- Project child entity resolution

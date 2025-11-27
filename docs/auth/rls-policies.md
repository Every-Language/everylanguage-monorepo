# Row Level Security (RLS) Policies

RLS policies enforce authorization at the database level, ensuring users can only access and modify data they're permitted to see. All policies use the `has_permission()` function for consistent permission checking.

## How RLS Works

RLS policies are SQL expressions that evaluate to `true` or `false`:

- `USING` clause: Controls SELECT, UPDATE, DELETE visibility (what rows can be seen/modified)
- `WITH CHECK` clause: Controls INSERT and UPDATE data validation (what data can be inserted/updated)

## The `has_permission()` Function

All RLS policies use the `has_permission()` function to check permissions:

```sql
has_permission(
  user_id UUID,
  action permission_key,
  resource_type resource_type,
  resource_id UUID
) RETURNS boolean
```

### Security Definer

The function uses `SECURITY DEFINER` to bypass RLS when checking permissions. This prevents infinite recursion when RLS policies call `has_permission()`, which queries tables (`user_roles`, `role_permissions`) that have their own RLS policies.

## Common RLS Patterns

### Public Read with Permission-Based Write

Most project resources follow this pattern with `publish_status` checks:

```sql
-- Public read if published, otherwise check permission
CREATE POLICY projects_select_public ON public.projects FOR SELECT
  USING (
    (publish_status = 'published') OR
    public.has_permission(auth.uid(), 'project.read', 'project', id)
  );

-- Only users with write permission can insert
CREATE POLICY projects_insert_with_permission ON public.projects FOR insert
WITH CHECK (
  created_by = auth.uid() AND
  public.has_permission(auth.uid(), 'project.write', 'project', id)
);

-- Only users with write permission can update
CREATE POLICY projects_update_with_permission ON public.projects
FOR UPDATE
  USING (
    public.has_permission(auth.uid(), 'project.write', 'project', id)
  )
WITH CHECK (
  public.has_permission(auth.uid(), 'project.write', 'project', id)
);

-- Only users with delete permission can delete
CREATE POLICY projects_delete_with_permission ON public.projects
FOR DELETE USING (
  public.has_permission(auth.uid(), 'project.delete', 'project', id)
);
```

### Project Child Entities

Child resources inherit parent project permissions and use `resolve_project_id()`:

```sql
-- Audio versions inherit project permissions
CREATE POLICY audio_versions_select_inherit_project ON public.audio_versions FOR SELECT
  USING (
    (publish_status = 'published') OR
    public.has_permission(
      auth.uid(),
      'project.read',
      'project',
      public.resolve_project_id('audio_versions', id)
    )
  );

-- Insert requires permission AND created_by check
CREATE POLICY audio_versions_ins_with_project_write ON public.audio_versions FOR insert
WITH CHECK (
  created_by = auth.uid() AND
  public.has_permission(
    auth.uid(),
    'project.write',
    'project',
    project_id
  )
);
```

### Publish Status Pattern

Resources with `publish_status` columns use this pattern for public visibility:

```sql
-- Published content is publicly visible, otherwise check permission
CREATE POLICY text_versions_select_inherit_project ON public.text_versions FOR SELECT
  USING (
    (publish_status = 'published') OR
    public.has_permission(
      auth.uid(),
      'project.read',
      'project',
      public.resolve_project_id('text_versions', id)
    )
  );
```

**Tables with publish_status:**

- `projects`
- `audio_versions`
- `text_versions`
- `verse_texts`
- `media_files`
- `project_updates`

**Inherited publish_status:**

- `media_files_verses` inherits from `media_files`
- `project_updates_media` inherits from `project_updates`

### Ownership Enforcement (`created_by`)

All INSERT policies enforce that `created_by = auth.uid()`:

```sql
CREATE POLICY segments_insert ON public.segments FOR insert
WITH CHECK (
  created_by = auth.uid() AND
  public.has_permission(
    auth.uid(),
    'project.write',
    'project',
    public.resolve_project_id('segments', id)
  )
);
```

This prevents users from creating records with someone else's `created_by` value, even if they have write permissions.

### System Admin Only

Reference tables and system configuration:

```sql
CREATE POLICY ref_table_admin_only ON public.ref_table
  FOR ALL USING (
    public.has_permission(auth.uid(), 'system.admin', 'global', NULL::UUID)
  );
```

### Special Permissions: Verse Feedback

Verse feedback uses special permissions that allow granular control:

```sql
-- Check verse_feedback permissions OR project permissions
CREATE POLICY verse_feedback_select ON public.verse_feedback FOR SELECT
  USING (
    public.has_permission(
      auth.uid(),
      'verse_feedback.read',
      'project',
      public.resolve_project_id('verse_feedback', id)
    ) OR
    public.has_permission(
      auth.uid(),
      'project.read',
      'project',
      public.resolve_project_id('verse_feedback', id)
    )
  );

-- Insert requires verse_feedback.write OR project.write
CREATE POLICY verse_feedback_insert ON public.verse_feedback FOR insert
WITH CHECK (
  created_by = auth.uid() AND
  EXISTS (
    SELECT 1
    FROM public.media_files mf
    JOIN public.audio_versions av ON av.id = mf.audio_version_id
    WHERE mf.id = verse_feedback.media_files_id
      AND (
        public.has_permission(auth.uid(), 'verse_feedback.write', 'project', av.project_id) OR
        public.has_permission(auth.uid(), 'project.write', 'project', av.project_id)
      )
  )
);
```

This allows roles like `project_checker` to have full verse feedback access while only read access to projects.

## Helper Functions in RLS

### `resolve_project_id(table_name, record_id)`

Resolves the parent project ID for any project child entity. Used in SELECT/UPDATE/DELETE policies when the table doesn't have a direct `project_id` column.

```sql
-- Example: Resolve project_id for a segment
public.resolve_project_id('segments', id)
```

### `check_project_permission(user_id, action, project_id)`

Checks project permissions through all inheritance paths. Used internally by `has_permission()` for project resources.

## Policy Naming Conventions

Policies follow consistent naming patterns:

- `{table}_select_{description}` - SELECT policies
- `{table}_insert` or `{table}_ins_with_{permission}` - INSERT policies
- `{table}_update` or `{table}_upd_with_{permission}` - UPDATE policies
- `{table}_delete` or `{table}_del_with_{permission}` - DELETE policies

Examples:

- `projects_select_public`
- `audio_versions_ins_with_project_write`
- `verse_feedback_insert`

## Best Practices

1. **Always use `has_permission()`** - Don't write custom permission logic in RLS
2. **Check `created_by` on INSERT** - Always enforce `created_by = auth.uid()` in INSERT policies
3. **Use `resolve_project_id()` for child entities** - Don't manually traverse relationships
4. **Publish status for public content** - Use `publish_status = 'published'` OR permission check pattern
5. **Inherit publish_status** - Child entities inherit visibility from parents
6. **System admin shortcut** - `has_permission()` handles system admin automatically
7. **Consistent naming** - Follow the naming conventions for maintainability

## Testing RLS

When testing RLS policies:

1. Create test users with specific roles
2. Test each permission level (read, write, delete)
3. Test inheritance paths (base → project, partner → project)
4. Test `created_by` enforcement (can't create with wrong creator)
5. Test publish_status visibility (public vs. private)
6. Test special permissions (e.g., `verse_feedback` permissions)
7. Verify system admin bypass works correctly

## Migration History

- **20251226**: Refactored RBAC system to remove teams, add `bases_projects` table, add helper functions, add `publish_status` checks, add `created_by` enforcement
- **20251209**: Added `verse_feedback` special permissions
- **20250913**: Initial RBAC core implementation

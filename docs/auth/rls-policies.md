# Row Level Security (RLS) Policies

RLS policies enforce authorization at the database level, ensuring users can only access data they're permitted to see.

## How RLS Works

RLS policies are SQL expressions that evaluate to `true` or `false`:

- `USING` clause: Controls SELECT, UPDATE, DELETE visibility
- `WITH CHECK` clause: Controls INSERT and UPDATE data validation

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

The function uses `SECURITY DEFINER` to bypass RLS when checking permissions. This prevents infinite recursion when RLS policies call `has_permission()`, which queries tables with their own RLS policies.

## Common RLS Patterns

### Public Read, Permission-Based Write

Most shared resources (projects, bases, teams) follow this pattern:

```sql
-- Anyone can read
CREATE POLICY projects_select_public ON projects
  FOR SELECT USING (TRUE);

-- Only users with write permission can insert/update
CREATE POLICY projects_write_with_permission ON projects
  FOR INSERT WITH CHECK (
    has_permission(auth.uid(), 'project.write', 'project', id)
  );

CREATE POLICY projects_update_with_permission ON projects
  FOR UPDATE
  USING (has_permission(auth.uid(), 'project.write', 'project', id))
  WITH CHECK (has_permission(auth.uid(), 'project.write', 'project', id));

-- Only users with delete permission can delete
CREATE POLICY projects_delete_with_permission ON projects
  FOR DELETE USING (
    has_permission(auth.uid(), 'project.delete', 'project', id)
  );
```

### System Admin Only

Reference tables and system configuration:

```sql
CREATE POLICY ref_table_admin_only ON ref_table
  FOR ALL USING (
    has_permission(auth.uid(), 'system.admin', 'global', NULL::UUID)
  );
```

### User-Owned Data

For tables with a direct `user_id` column:

```sql
CREATE POLICY user_data_own ON user_table
  FOR ALL USING (user_id = auth.uid());
```

## Permission Checks in RLS

### Reading Resources

```sql
-- Check read permission
has_permission(auth.uid(), 'project.read', 'project', id)
```

### Writing Resources

```sql
-- Check write permission
has_permission(auth.uid(), 'project.write', 'project', id)
```

### Deleting Resources

```sql
-- Check delete permission
has_permission(auth.uid(), 'project.delete', 'project', id)
```

## Child Resource Policies

Child resources (e.g., `audio_versions`, `text_versions`) inherit parent permissions:

```sql
-- Child resources check parent permissions
CREATE POLICY audio_versions_read ON audio_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = audio_versions.project_id
        AND has_permission(auth.uid(), 'project.read', 'project', projects.id)
    )
  );
```

## Best Practices

1. **Always use `has_permission()`** - Don't write custom permission logic in RLS
2. **Public read for shared resources** - Most resources are readable by all authenticated users
3. **Explicit write/delete checks** - Use permission checks for mutations
4. **Child resources inherit** - Check parent permissions, not child-specific permissions
5. **System admin shortcut** - `has_permission()` handles system admin automatically

## Testing RLS

When testing RLS policies:

1. Create test users with specific roles
2. Test each permission level (read, write, delete)
3. Test inheritance paths (team → project, base → project, etc.)
4. Verify system admin bypass works correctly

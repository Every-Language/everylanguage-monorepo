# Seeding Test Users for Admin Dashboard

## Summary of Changes

I've updated both seed files to work with your existing database by querying role IDs dynamically instead of using hardcoded UUIDs. This solves the `duplicate key value violates unique constraint "roles_name_key"` error you were experiencing.

## How to Use

### Option 1: Run Both Seed Files Sequentially (Recommended)

In the Supabase SQL Editor, run these files in order:

1. **First**: Run `01_seed_test_users.sql`
   - This creates basic test users (sarah.johnson@example.com, etc.)
   - Sets up teams, bases, projects, and partner orgs
   - Assigns roles using dynamic lookups

2. **Second**: Run `02_seed_rbac_test_users.sql` ✨ **THIS CREATES YOUR ADMIN USERS**
   - Creates RBAC-specific test users including:
     - **systemadmin@everylanguage.com** - System Admin (what you need!)
     - partneradmin@everylanguage.com - Partner Admin
     - partnerleader@everylanguage.com - Partner Leader
     - partnermember@everylanguage.com - Partner Member
     - projectadmin@everylanguage.com - Project Admin
     - projecteditor@everylanguage.com - Project Editor
     - projectviewer@everylanguage.com - Project Viewer
     - teamleader@everylanguage.com - Team Leader
     - teammember@everylanguage.com - Team Member

### Login Credentials

**System Admin User:**

- Email: `systemadmin@everylanguage.com`
- Password: `systemadmin@everylanguage.com` (password matches email for all test users)

**All other RBAC test users:**

- Password matches their email address

## What Changed

### Before (causing errors):

```sql
-- Hardcoded role IDs that didn't match your database
INSERT INTO user_roles (user_id, role_id, context_type, context_id)
VALUES ('user-uuid', '550e8400-e29b-41d4-a716-446655440200', 'global', NULL)
```

### After (working):

```sql
-- Dynamic lookup based on role_key
INSERT INTO user_roles (user_id, role_id, context_type, context_id)
SELECT 'user-uuid', (SELECT id FROM roles WHERE role_key = 'system_admin'), 'global', NULL
```

## Verifying System Admin Was Created

After running the second seed file, you can verify the system admin was created by running this query in the Supabase SQL Editor:

```sql
-- Check that system admin user exists and has the system_admin role
SELECT
  au.email,
  r.name as role_name,
  r.role_key,
  ur.context_type
FROM auth.users au
JOIN public.users u ON u.id = au.id
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.role_id
WHERE au.email = 'systemadmin@everylanguage.com';
```

You should see:

- email: `systemadmin@everylanguage.com`
- role_name: `System Admin`
- role_key: `system_admin`
- context_type: `global`

## Current Database State

Your database currently has:

- ✅ Roles already created (from migrations)
- ✅ Some test users already exist (sarah.johnson@example.com, michael.chen@example.com, etc.)
- ❌ RBAC test users DO NOT exist yet (systemadmin@everylanguage.com, etc.)

So you're safe to run the second seed file (`02_seed_rbac_test_users.sql`) without conflicts!

## Notes

- The seed files use `ON CONFLICT ... DO NOTHING` so they're safe to run multiple times
- If a user already exists, it won't be duplicated
- Role assignments that already exist won't cause errors
- All passwords for test users match their email addresses for easy testing

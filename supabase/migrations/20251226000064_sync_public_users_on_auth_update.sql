-- Sync public.users on auth.users UPDATE
-- This migration creates a trigger that syncs changes from auth.users to public.users
-- when users are updated (e.g., anonymous users being promoted to authenticated)
-- ============================================================================
-- This ensures that when an anonymous user is promoted (is_anonymous changes from true to false),
-- or when user metadata (email, phone, name) is updated, the public.users record is kept in sync.
-- The function uses INSERT ... ON CONFLICT to create the record if it doesn't exist, or update it if it does.
-- ============================================================================
-- ============================================================================
-- FUNCTION: handle_auth_user_update
-- ============================================================================
-- Function to sync auth.users changes to public.users
-- Handles both updates to existing records and creation of missing records
CREATE OR REPLACE FUNCTION public.handle_auth_user_update () returns trigger AS $$
DECLARE
    user_metadata JSONB;
BEGIN
    -- Get user metadata
    user_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    
    -- Insert or update public.users record
    -- ON CONFLICT ensures we update if record exists, create if it doesn't
    INSERT INTO public.users (
        id,                -- Use the same ID as auth.users.id
        email,
        first_name,
        last_name,
        phone_number,
        is_anonymous,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,            -- Same ID as the auth.users record
        NEW.email,
        user_metadata->>'first_name',
        user_metadata->>'last_name',
        COALESCE(NEW.phone, user_metadata->>'phone_number'), -- Use auth.users.phone or fallback to metadata
        COALESCE(NEW.is_anonymous, false), -- Default to false if NULL (shouldn't happen, but safe)
        NOW(),             -- created_at: use NOW() for new records, existing records preserve their created_at via ON CONFLICT
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone_number = EXCLUDED.phone_number,
        is_anonymous = EXCLUDED.is_anonymous,
        updated_at = NOW();
        -- Note: created_at is NOT updated here, preserving the original creation timestamp
    
    -- Log the update (optional, for debugging)
    RAISE LOG 'Synced public.users record for id: % (is_anonymous: %, email: %)', 
        NEW.id, 
        COALESCE(NEW.is_anonymous, false), 
        NEW.email;
    
    RETURN NEW;
END;
$$ language plpgsql security definer;


-- ============================================================================
-- TRIGGER: on_auth_user_updated
-- ============================================================================
-- Trigger that fires AFTER UPDATE on auth.users
-- This ensures public.users stays in sync when auth.users is updated
DROP TRIGGER if EXISTS on_auth_user_updated ON auth.users;


CREATE TRIGGER on_auth_user_updated
AFTER
UPDATE ON auth.users FOR each ROW
EXECUTE function public.handle_auth_user_update ();


-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
comment ON function public.handle_auth_user_update () IS 'Syncs changes from auth.users to public.users when auth.users records are updated. Handles promotion of anonymous users to authenticated users, and updates to email, phone, and user metadata. Uses INSERT ... ON CONFLICT to create the record if it doesn''t exist, or update it if it does.';

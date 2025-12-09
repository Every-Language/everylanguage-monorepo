-- Sync public.users on email confirmation
-- This migration creates a trigger that syncs from auth.users to public.users
-- ONLY when email_confirmed_at is set for the first time (changes from NULL to NOT NULL)
-- ============================================================================
-- This is specifically for the scenario where an anonymous user promotes to authenticated
-- and confirms their email. It extracts email, first_name, last_name, and phone_number
-- from auth.users and metadata, and syncs them to public.users.
-- ============================================================================
-- ============================================================================
-- FUNCTION: handle_email_confirmation_sync
-- ============================================================================
-- Function to sync auth.users to public.users ONLY when email_confirmed_at is set
-- This fires specifically when email_confirmed_at changes from NULL to NOT NULL
CREATE OR REPLACE FUNCTION public.handle_email_confirmation_sync () returns trigger AS $$
DECLARE
    user_metadata JSONB;
BEGIN
    -- Only sync when email_confirmed_at changes from NULL to NOT NULL
    -- This ensures we only sync once when the email is first confirmed
    IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
        -- Get user metadata
        user_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
        
        -- Insert or update public.users record with data from auth.users
        -- ON CONFLICT ensures we update if record exists, create if it doesn't
        INSERT INTO public.users (
            id,                -- Use the same ID as auth.users.id
            email,             -- From auth.users.email
            first_name,        -- From raw_user_meta_data->>'first_name'
            last_name,         -- From raw_user_meta_data->>'last_name'
            phone_number,      -- From auth.users.phone or raw_user_meta_data->>'phone_number'
            is_anonymous,      -- Set to false since email is confirmed
            created_at,
            updated_at
        ) VALUES (
            NEW.id,            -- Same ID as the auth.users record
            NEW.email,         -- Email from auth.users
            user_metadata->>'first_name',  -- First name from metadata
            user_metadata->>'last_name',   -- Last name from metadata
            COALESCE(NEW.phone, user_metadata->>'phone_number'), -- Phone from auth.users.phone or metadata
            false,             -- Email confirmed means not anonymous
            COALESCE((SELECT created_at FROM public.users WHERE id = NEW.id), NOW()), -- Preserve existing created_at if record exists
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
        
        -- Log the sync (for debugging)
        RAISE LOG 'Synced public.users on email confirmation for id: % (email: %, first_name: %, last_name: %, phone_number: %)', 
            NEW.id, 
            NEW.email,
            user_metadata->>'first_name',
            user_metadata->>'last_name',
            COALESCE(NEW.phone, user_metadata->>'phone_number');
    END IF;
    
    RETURN NEW;
END;
$$ language plpgsql security definer;


-- ============================================================================
-- TRIGGER: on_email_confirmed
-- ============================================================================
-- Trigger that fires AFTER UPDATE on auth.users
-- Only syncs to public.users when email_confirmed_at changes from NULL to NOT NULL
DROP TRIGGER if EXISTS on_email_confirmed ON auth.users;


CREATE TRIGGER on_email_confirmed
AFTER
UPDATE ON auth.users FOR each ROW WHEN (
  old.email_confirmed_at IS NULL
  AND new.email_confirmed_at IS NOT NULL
)
EXECUTE function public.handle_email_confirmation_sync ();


-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
comment ON function public.handle_email_confirmation_sync () IS 'Syncs auth.users to public.users ONLY when email_confirmed_at is set for the first time. 
Extracts email from auth.users.email, and first_name, last_name, phone_number from user metadata. 
This is specifically designed for the anonymous-to-authenticated user promotion flow after email confirmation.';

-- Harden media_files -> media_files_verses triggers against RLS
-- Migration: 20251226000053_harden_media_files_verses_triggers.sql
--
-- Problem:
-- - media_files insert triggers call helper functions that UPDATE/SELECT media_files_verses
--   using the caller's privileges
-- - Because media_files_verses enforces RLS, any authenticated insert hits a 42501 error when
--   the trigger tries to touch that table
--
-- Solution:
-- - Recreate the helper functions as SECURITY DEFINER and disable row security within them
-- - Apply the same hardening to the enqueue trigger that reads media_files within RLS contexts
--
-- Notes:
-- - search_path is restricted to "public, pg_temp" to avoid hijacking
-- - SET LOCAL row_security = off ensures helper logic bypasses per-row policies safely
-- =========================================================================
-- Harden update_media_files_verses_audio_version()
-- =========================================================================
CREATE OR REPLACE FUNCTION public.update_media_files_verses_audio_version () returns trigger language plpgsql security definer
SET
  search_path = public,
  pg_temp AS $$
BEGIN
  SET LOCAL row_security = off;

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE media_files_verses
    SET denormalized_audio_version_id = NEW.audio_version_id
    WHERE media_file_id = NEW.id;

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE media_files_verses
    SET denormalized_audio_version_id = NULL
    WHERE media_file_id = OLD.id;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;


comment ON function public.update_media_files_verses_audio_version () IS 'Updates media_files_verses audio_version denormalization under SECURITY DEFINER with row security disabled.';


-- =========================================================================
-- Harden set_media_files_verses_audio_version()
-- =========================================================================
CREATE OR REPLACE FUNCTION public.set_media_files_verses_audio_version () returns trigger language plpgsql security definer
SET
  search_path = public,
  pg_temp AS $$
BEGIN
  SET LOCAL row_security = off;

  IF NEW.media_file_id IS NOT NULL THEN
    SELECT audio_version_id
    INTO NEW.denormalized_audio_version_id
    FROM media_files
    WHERE id = NEW.media_file_id;
  END IF;

  RETURN NEW;
END;
$$;


comment ON function public.set_media_files_verses_audio_version () IS 'Sets media_files_verses audio_version denormalization with SECURITY DEFINER privileges.';


-- =========================================================================
-- Harden trg_enqueue_media_files_verses() helper
-- =========================================================================
CREATE OR REPLACE FUNCTION public.trg_enqueue_media_files_verses () returns trigger language plpgsql security definer
SET
  search_path = public,
  pg_temp AS $$
DECLARE
  mf RECORD;
BEGIN
  SET LOCAL row_security = off;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT *
    INTO mf
    FROM media_files
    WHERE id = NEW.media_file_id;
  ELSE
    SELECT *
    INTO mf
    FROM media_files
    WHERE id = OLD.media_file_id;
  END IF;

  IF mf.media_type = 'audio'
     AND mf.is_bible_audio IS TRUE
     AND mf.upload_status = 'completed'
     AND mf.publish_status = 'published'
     AND mf.audio_version_id IS NOT NULL
     AND mf.deleted_at IS NULL THEN
    PERFORM enqueue_progress_refresh('audio', mf.audio_version_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;


comment ON function public.trg_enqueue_media_files_verses () IS 'Enqueues audio progress refresh with SECURITY DEFINER privileges to bypass media_files RLS.';


-- Regrant execute permission to authenticated role explicitly
REVOKE ALL ON function public.update_media_files_verses_audio_version ()
FROM
  public;


REVOKE ALL ON function public.set_media_files_verses_audio_version ()
FROM
  public;


REVOKE ALL ON function public.trg_enqueue_media_files_verses ()
FROM
  public;


GRANT
EXECUTE ON function public.update_media_files_verses_audio_version () TO authenticated;


GRANT
EXECUTE ON function public.set_media_files_verses_audio_version () TO authenticated;


GRANT
EXECUTE ON function public.trg_enqueue_media_files_verses () TO authenticated;

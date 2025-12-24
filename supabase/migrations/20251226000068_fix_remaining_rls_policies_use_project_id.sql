-- Fix remaining RLS policies to avoid resolve_project_id recursion
-- Migration: 20251226000068_fix_remaining_rls_policies_use_project_id.sql
--
-- Problem:
-- - Multiple tables still use resolve_project_id() in their RLS policies
-- - This causes RLS recursion issues when using .insert().select()
-- - resolve_project_id() is SECURITY DEFINER but doesn't disable row_security
--
-- Solution:
-- - For tables WITH denormalized project_id: use project_id directly
--   (text_versions, sequences, sequences_segments, segments, media_files_verses)
-- - For tables WITHOUT denormalized project_id: use JOIN to parent table
--   (verse_texts → text_versions, verse_feedback → media_files)
--
-- ============================================================================
-- FIX TEXT_VERSIONS SELECT POLICY
-- ============================================================================
DROP POLICY if EXISTS text_versions_select_inherit_project ON public.text_versions;


CREATE POLICY text_versions_select_inherit_project ON public.text_versions FOR
SELECT
  USING (
    (publish_status = 'published')
    OR public.has_permission (
      auth.uid (),
      'project.read',
      'project',
      project_id -- Use project_id directly instead of resolve_project_id()
    )
  );


comment ON policy text_versions_select_inherit_project ON public.text_versions IS 'Allows users to select published text_versions or text_versions for projects they have read access to. Uses project_id directly to avoid RLS recursion with resolve_project_id().';


-- ============================================================================
-- FIX SEQUENCES SELECT POLICY
-- ============================================================================
DROP POLICY if EXISTS sequences_select ON public.sequences;


CREATE POLICY sequences_select ON public.sequences FOR
SELECT
  USING (
    public.has_permission (
      auth.uid (),
      'project.read',
      'project',
      project_id -- Use project_id directly instead of resolve_project_id()
    )
  );


comment ON policy sequences_select ON public.sequences IS 'Allows users to select sequences for projects they have read access to. Uses project_id directly to avoid RLS recursion with resolve_project_id().';


-- ============================================================================
-- FIX SEQUENCES_SEGMENTS SELECT POLICY
-- ============================================================================
DROP POLICY if EXISTS sequences_segments_select ON public.sequences_segments;


CREATE POLICY sequences_segments_select ON public.sequences_segments FOR
SELECT
  USING (
    public.has_permission (
      auth.uid (),
      'project.read',
      'project',
      project_id -- Use denormalized project_id directly instead of resolve_project_id()
    )
  );


comment ON policy sequences_segments_select ON public.sequences_segments IS 'Allows users to select sequences_segments for projects they have read access to. Uses denormalized project_id directly to avoid RLS recursion with resolve_project_id().';


-- ============================================================================
-- FIX SEGMENTS POLICIES (SELECT, INSERT, UPDATE)
-- ============================================================================
DROP POLICY if EXISTS segments_select ON public.segments;


CREATE POLICY segments_select ON public.segments FOR
SELECT
  USING (
    public.has_permission (
      auth.uid (),
      'project.read',
      'project',
      project_id -- Use denormalized project_id directly instead of resolve_project_id()
    )
  );


comment ON policy segments_select ON public.segments IS 'Allows users to select segments for projects they have read access to. Uses denormalized project_id directly to avoid RLS recursion with resolve_project_id().';


DROP POLICY if EXISTS segments_insert ON public.segments;


CREATE POLICY segments_insert ON public.segments FOR insert
WITH
  CHECK (
    (created_by = auth.uid ())
    AND public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      project_id -- Use denormalized project_id directly instead of resolve_project_id()
    )
  );


comment ON policy segments_insert ON public.segments IS 'Allows users to insert segments for projects they have write access to. Uses denormalized project_id directly to avoid RLS recursion with resolve_project_id().';


DROP POLICY if EXISTS segments_update ON public.segments;


CREATE POLICY segments_update ON public.segments
FOR UPDATE
  USING (
    public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      project_id -- Use denormalized project_id directly instead of resolve_project_id()
    )
  )
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      project_id -- Use denormalized project_id directly instead of resolve_project_id()
    )
  );


comment ON policy segments_update ON public.segments IS 'Allows users to update segments for projects they have write access to. Uses denormalized project_id directly to avoid RLS recursion with resolve_project_id().';


-- ============================================================================
-- FIX MEDIA_FILES_VERSES SELECT POLICY
-- ============================================================================
-- media_files_verses doesn't have publish_status, must join to media_files
-- but can use denormalized project_id instead of resolve_project_id
DROP POLICY if EXISTS media_files_verses_select_inherit_project ON public.media_files_verses;


CREATE POLICY media_files_verses_select_inherit_project ON public.media_files_verses FOR
SELECT
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.media_files mf
      WHERE
        mf.id = media_files_verses.media_file_id
        AND (
          mf.publish_status = 'published'
          OR public.has_permission (
            auth.uid (),
            'project.read',
            'project',
            mf.project_id -- Use media_files.project_id directly instead of resolve_project_id
          )
        )
    )
  );


comment ON policy media_files_verses_select_inherit_project ON public.media_files_verses IS 'Allows users to select media_files_verses for published media_files or media_files they have read access to. Uses JOIN to media_files.project_id to avoid resolve_project_id recursion.';


-- ============================================================================
-- FIX VERSE_TEXTS SELECT POLICY
-- ============================================================================
-- verse_texts doesn't have denormalized project_id, so use JOIN to text_versions
DROP POLICY if EXISTS verse_texts_select_inherit_project ON public.verse_texts;


CREATE POLICY verse_texts_select_inherit_project ON public.verse_texts FOR
SELECT
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.text_versions tv
      WHERE
        tv.id = verse_texts.text_version_id
        AND (
          tv.publish_status = 'published'
          OR public.has_permission (
            auth.uid (),
            'project.read',
            'project',
            tv.project_id -- Use text_versions.project_id directly via JOIN
          )
        )
    )
  );


comment ON policy verse_texts_select_inherit_project ON public.verse_texts IS 'Allows users to select verse_texts for published text_versions or text_versions they have read access to. Uses JOIN to text_versions.project_id to avoid resolve_project_id recursion.';


-- ============================================================================
-- FIX VERSE_FEEDBACK POLICIES (SELECT, UPDATE, DELETE)
-- ============================================================================
-- verse_feedback doesn't have denormalized project_id, so use JOIN to media_files
DROP POLICY if EXISTS verse_feedback_select ON public.verse_feedback;


CREATE POLICY verse_feedback_select ON public.verse_feedback FOR
SELECT
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.media_files mf
      WHERE
        mf.id = verse_feedback.media_files_id
        AND (
          public.has_permission (
            auth.uid (),
            'verse_feedback.read',
            'project',
            mf.project_id -- Use media_files.project_id directly via JOIN
          )
          OR public.has_permission (
            auth.uid (),
            'project.read',
            'project',
            mf.project_id
          )
        )
    )
  );


comment ON policy verse_feedback_select ON public.verse_feedback IS 'Allows users to select verse_feedback for projects they have verse_feedback.read or project.read access to. Uses JOIN to media_files.project_id to avoid resolve_project_id recursion.';


DROP POLICY if EXISTS verse_feedback_update ON public.verse_feedback;


CREATE POLICY verse_feedback_update ON public.verse_feedback
FOR UPDATE
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.media_files mf
      WHERE
        mf.id = verse_feedback.media_files_id
        AND (
          public.has_permission (
            auth.uid (),
            'verse_feedback.write',
            'project',
            mf.project_id -- Use media_files.project_id directly via JOIN
          )
          OR public.has_permission (
            auth.uid (),
            'project.write',
            'project',
            mf.project_id
          )
        )
    )
  )
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.media_files mf
      WHERE
        mf.id = verse_feedback.media_files_id
        AND (
          public.has_permission (
            auth.uid (),
            'verse_feedback.write',
            'project',
            mf.project_id
          )
          OR public.has_permission (
            auth.uid (),
            'project.write',
            'project',
            mf.project_id
          )
        )
    )
  );


comment ON policy verse_feedback_update ON public.verse_feedback IS 'Allows users to update verse_feedback for projects they have verse_feedback.write or project.write access to. Uses JOIN to media_files.project_id to avoid resolve_project_id recursion.';


DROP POLICY if EXISTS verse_feedback_delete ON public.verse_feedback;


CREATE POLICY verse_feedback_delete ON public.verse_feedback FOR delete USING (
  EXISTS (
    SELECT
      1
    FROM
      public.media_files mf
    WHERE
      mf.id = verse_feedback.media_files_id
      AND (
        public.has_permission (
          auth.uid (),
          'verse_feedback.delete',
          'project',
          mf.project_id -- Use media_files.project_id directly via JOIN
        )
        OR public.has_permission (
          auth.uid (),
          'project.delete',
          'project',
          mf.project_id
        )
      )
  )
);


comment ON policy verse_feedback_delete ON public.verse_feedback IS 'Allows users to delete verse_feedback for projects they have verse_feedback.delete or project.delete access to. Uses JOIN to media_files.project_id to avoid resolve_project_id recursion.';

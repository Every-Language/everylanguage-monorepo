-- Update all RLS policies to use has_permission with publish_status checks
-- Remove team-related policies from user_roles
-- RLS policies for bases_projects (created in migration 20251226000002)
CREATE POLICY bases_projects_select_public ON public.bases_projects FOR
SELECT
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.bases b
      WHERE
        b.id = bases_projects.base_id
    )
    AND EXISTS (
      SELECT
        1
      FROM
        public.projects p
      WHERE
        p.id = bases_projects.project_id
    )
  );


CREATE POLICY bases_projects_insert_with_manage ON public.bases_projects FOR insert
WITH
  CHECK (
    public.has_permission (auth.uid (), 'base.manage_roles', 'base', base_id)
  );


CREATE POLICY bases_projects_update_with_manage ON public.bases_projects
FOR UPDATE
  USING (
    public.has_permission (auth.uid (), 'base.manage_roles', 'base', base_id)
  )
WITH
  CHECK (
    public.has_permission (auth.uid (), 'base.manage_roles', 'base', base_id)
  );


CREATE POLICY bases_projects_delete_with_manage ON public.bases_projects FOR delete USING (
  public.has_permission (auth.uid (), 'base.manage_roles', 'base', base_id)
);


-- Remove team-related policies from user_roles
DROP POLICY if EXISTS user_roles_select_self_or_manager ON public.user_roles;


CREATE POLICY user_roles_select_self_or_manager ON public.user_roles FOR
SELECT
  USING (
    user_id = auth.uid ()
    OR CASE context_type
      WHEN 'project' THEN public.has_permission (
        auth.uid (),
        'project.manage_roles',
        'project',
        context_id::UUID
      )
      WHEN 'base' THEN public.has_permission (
        auth.uid (),
        'base.manage_roles',
        'base',
        context_id::UUID
      )
      WHEN 'partner' THEN public.has_permission (
        auth.uid (),
        'partner.manage_roles',
        'partner',
        context_id::UUID
      )
      ELSE FALSE
    END
  );


DROP POLICY if EXISTS user_roles_insert_with_manage ON public.user_roles;


CREATE POLICY user_roles_insert_with_manage ON public.user_roles FOR insert
WITH
  CHECK (
    CASE context_type
      WHEN 'project' THEN public.has_permission (
        auth.uid (),
        'project.manage_roles',
        'project',
        context_id::UUID
      )
      WHEN 'base' THEN public.has_permission (
        auth.uid (),
        'base.manage_roles',
        'base',
        context_id::UUID
      )
      WHEN 'partner' THEN public.has_permission (
        auth.uid (),
        'partner.manage_roles',
        'partner',
        context_id::UUID
      )
      ELSE FALSE
    END
  );


DROP POLICY if EXISTS user_roles_update_with_manage ON public.user_roles;


CREATE POLICY user_roles_update_with_manage ON public.user_roles
FOR UPDATE
  USING (
    CASE context_type
      WHEN 'project' THEN public.has_permission (
        auth.uid (),
        'project.manage_roles',
        'project',
        context_id::UUID
      )
      WHEN 'base' THEN public.has_permission (
        auth.uid (),
        'base.manage_roles',
        'base',
        context_id::UUID
      )
      WHEN 'partner' THEN public.has_permission (
        auth.uid (),
        'partner.manage_roles',
        'partner',
        context_id::UUID
      )
      ELSE FALSE
    END
  )
WITH
  CHECK (
    CASE context_type
      WHEN 'project' THEN public.has_permission (
        auth.uid (),
        'project.manage_roles',
        'project',
        context_id::UUID
      )
      WHEN 'base' THEN public.has_permission (
        auth.uid (),
        'base.manage_roles',
        'base',
        context_id::UUID
      )
      WHEN 'partner' THEN public.has_permission (
        auth.uid (),
        'partner.manage_roles',
        'partner',
        context_id::UUID
      )
      ELSE FALSE
    END
  );


DROP POLICY if EXISTS user_roles_delete_with_manage ON public.user_roles;


CREATE POLICY user_roles_delete_with_manage ON public.user_roles FOR delete USING (
  CASE context_type
    WHEN 'project' THEN public.has_permission (
      auth.uid (),
      'project.manage_roles',
      'project',
      context_id::UUID
    )
    WHEN 'base' THEN public.has_permission (
      auth.uid (),
      'base.manage_roles',
      'base',
      context_id::UUID
    )
    WHEN 'partner' THEN public.has_permission (
      auth.uid (),
      'partner.manage_roles',
      'partner',
      context_id::UUID
    )
    ELSE FALSE
  END
);


-- Update projects RLS policies with publish_status
DROP POLICY if EXISTS projects_select_public ON public.projects;


CREATE POLICY projects_select_public ON public.projects FOR
SELECT
  USING (
    (publish_status = 'published')
    OR public.has_permission (auth.uid (), 'project.read', 'project', id)
  );


-- Update audio_versions RLS policies with publish_status
DROP POLICY if EXISTS audio_versions_select_inherit_project ON public.audio_versions;


CREATE POLICY audio_versions_select_inherit_project ON public.audio_versions FOR
SELECT
  USING (
    (publish_status = 'published')
    OR public.has_permission (
      auth.uid (),
      'project.read',
      'project',
      public.resolve_project_id ('audio_versions', id)
    )
  );


DROP POLICY if EXISTS audio_versions_ins_with_project_write ON public.audio_versions;


CREATE POLICY audio_versions_ins_with_project_write ON public.audio_versions FOR insert
WITH
  CHECK (
    created_by = auth.uid ()
    AND public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      project_id
    )
  );


DROP POLICY if EXISTS audio_versions_upd_with_project_write ON public.audio_versions;


CREATE POLICY audio_versions_upd_with_project_write ON public.audio_versions
FOR UPDATE
  USING (
    public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      project_id
    )
  )
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      project_id
    )
  );


DROP POLICY if EXISTS audio_versions_del_with_project_delete ON public.audio_versions;


CREATE POLICY audio_versions_del_with_project_delete ON public.audio_versions FOR delete USING (
  public.has_permission (
    auth.uid (),
    'project.delete',
    'project',
    project_id
  )
);


-- Update text_versions RLS policies with publish_status
DROP POLICY if EXISTS text_versions_select_inherit_project ON public.text_versions;


CREATE POLICY text_versions_select_inherit_project ON public.text_versions FOR
SELECT
  USING (
    (publish_status = 'published')
    OR public.has_permission (
      auth.uid (),
      'project.read',
      'project',
      public.resolve_project_id ('text_versions', id)
    )
  );


DROP POLICY if EXISTS text_versions_ins_with_project_write ON public.text_versions;


CREATE POLICY text_versions_ins_with_project_write ON public.text_versions FOR insert
WITH
  CHECK (
    created_by = auth.uid ()
    AND public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      project_id
    )
  );


DROP POLICY if EXISTS text_versions_upd_with_project_write ON public.text_versions;


CREATE POLICY text_versions_upd_with_project_write ON public.text_versions
FOR UPDATE
  USING (
    public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      project_id
    )
  )
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      project_id
    )
  );


DROP POLICY if EXISTS text_versions_del_with_project_delete ON public.text_versions;


CREATE POLICY text_versions_del_with_project_delete ON public.text_versions FOR delete USING (
  public.has_permission (
    auth.uid (),
    'project.delete',
    'project',
    project_id
  )
);


-- Update media_files RLS policies with publish_status
DROP POLICY if EXISTS media_files_select_inherit_project ON public.media_files;


CREATE POLICY media_files_select_inherit_project ON public.media_files FOR
SELECT
  USING (
    (publish_status = 'published')
    OR public.has_permission (
      auth.uid (),
      'project.read',
      'project',
      public.resolve_project_id ('media_files', id)
    )
  );


DROP POLICY if EXISTS media_files_ins_with_project_write ON public.media_files;


CREATE POLICY media_files_ins_with_project_write ON public.media_files FOR insert
WITH
  CHECK (
    created_by = auth.uid ()
    AND EXISTS (
      SELECT
        1
      FROM
        public.audio_versions av
      WHERE
        av.id = media_files.audio_version_id
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          av.project_id
        )
    )
  );


DROP POLICY if EXISTS media_files_upd_with_project_write ON public.media_files;


CREATE POLICY media_files_upd_with_project_write ON public.media_files
FOR UPDATE
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.audio_versions av
      WHERE
        av.id = media_files.audio_version_id
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          av.project_id
        )
    )
  )
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.audio_versions av
      WHERE
        av.id = media_files.audio_version_id
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          av.project_id
        )
    )
  );


DROP POLICY if EXISTS media_files_del_with_project_delete ON public.media_files;


CREATE POLICY media_files_del_with_project_delete ON public.media_files FOR delete USING (
  EXISTS (
    SELECT
      1
    FROM
      public.audio_versions av
    WHERE
      av.id = media_files.audio_version_id
      AND public.has_permission (
        auth.uid (),
        'project.delete',
        'project',
        av.project_id
      )
  )
);


-- Update media_files_verses RLS policies (inherits publish_status from media_files)
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
            public.resolve_project_id ('media_files', mf.id)
          )
        )
    )
  );


DROP POLICY if EXISTS media_files_verses_ins_with_project_write ON public.media_files_verses;


CREATE POLICY media_files_verses_ins_with_project_write ON public.media_files_verses FOR insert
WITH
  CHECK (
    created_by = auth.uid ()
    AND EXISTS (
      SELECT
        1
      FROM
        public.media_files mf
        JOIN public.audio_versions av ON av.id = mf.audio_version_id
      WHERE
        mf.id = media_files_verses.media_file_id
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          av.project_id
        )
    )
  );


DROP POLICY if EXISTS media_files_verses_upd_with_project_write ON public.media_files_verses;


CREATE POLICY media_files_verses_upd_with_project_write ON public.media_files_verses
FOR UPDATE
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.media_files mf
        JOIN public.audio_versions av ON av.id = mf.audio_version_id
      WHERE
        mf.id = media_files_verses.media_file_id
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          av.project_id
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
        JOIN public.audio_versions av ON av.id = mf.audio_version_id
      WHERE
        mf.id = media_files_verses.media_file_id
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          av.project_id
        )
    )
  );


DROP POLICY if EXISTS media_files_verses_del_with_project_delete ON public.media_files_verses;


CREATE POLICY media_files_verses_del_with_project_delete ON public.media_files_verses FOR delete USING (
  EXISTS (
    SELECT
      1
    FROM
      public.media_files mf
      JOIN public.audio_versions av ON av.id = mf.audio_version_id
    WHERE
      mf.id = media_files_verses.media_file_id
      AND public.has_permission (
        auth.uid (),
        'project.delete',
        'project',
        av.project_id
      )
  )
);


-- Update verse_texts RLS policies with publish_status
DROP POLICY if EXISTS verse_texts_select_inherit_project ON public.verse_texts;


CREATE POLICY verse_texts_select_inherit_project ON public.verse_texts FOR
SELECT
  USING (
    (publish_status = 'published')
    OR public.has_permission (
      auth.uid (),
      'project.read',
      'project',
      public.resolve_project_id ('verse_texts', id)
    )
  );


DROP POLICY if EXISTS verse_texts_ins_with_project_write ON public.verse_texts;


CREATE POLICY verse_texts_ins_with_project_write ON public.verse_texts FOR insert
WITH
  CHECK (
    created_by = auth.uid ()
    AND EXISTS (
      SELECT
        1
      FROM
        public.text_versions tv
      WHERE
        tv.id = verse_texts.text_version_id
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          tv.project_id
        )
    )
  );


DROP POLICY if EXISTS verse_texts_upd_with_project_write ON public.verse_texts;


CREATE POLICY verse_texts_upd_with_project_write ON public.verse_texts
FOR UPDATE
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.text_versions tv
      WHERE
        tv.id = verse_texts.text_version_id
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          tv.project_id
        )
    )
  )
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.text_versions tv
      WHERE
        tv.id = verse_texts.text_version_id
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          tv.project_id
        )
    )
  );


DROP POLICY if EXISTS verse_texts_del_with_project_delete ON public.verse_texts;


CREATE POLICY verse_texts_del_with_project_delete ON public.verse_texts FOR delete USING (
  EXISTS (
    SELECT
      1
    FROM
      public.text_versions tv
    WHERE
      tv.id = verse_texts.text_version_id
      AND public.has_permission (
        auth.uid (),
        'project.delete',
        'project',
        tv.project_id
      )
  )
);


-- Update project_updates RLS policies with publish_status
DROP POLICY if EXISTS project_updates_select ON public.project_updates;


CREATE POLICY project_updates_select ON public.project_updates FOR
SELECT
  USING (
    deleted_at IS NULL
    AND (
      (publish_status = 'published')
      OR public.has_permission (
        auth.uid (),
        'project.read',
        'project',
        project_id
      )
    )
  );


-- project_updates insert/update/delete policies remain the same (already use has_permission)
-- Update project_updates_media RLS policies (inherits publish_status from project_updates)
DROP POLICY if EXISTS project_updates_media_select ON public.project_updates_media;


CREATE POLICY project_updates_media_select ON public.project_updates_media FOR
SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT
        1
      FROM
        project_updates pu
      WHERE
        pu.id = project_updates_media.project_update_id
        AND pu.deleted_at IS NULL
        AND (
          pu.publish_status = 'published'
          OR public.has_permission (
            auth.uid (),
            'project.read',
            'project',
            pu.project_id
          )
        )
    )
  );


-- project_updates_media insert/update/delete policies remain the same (already use has_permission)
-- Update verse_feedback RLS policies with verse_feedback permissions
DROP POLICY if EXISTS "All users can view verse_feedback" ON public.verse_feedback;


CREATE POLICY verse_feedback_select ON public.verse_feedback FOR
SELECT
  USING (
    public.has_permission (
      auth.uid (),
      'verse_feedback.read',
      'project',
      public.resolve_project_id ('verse_feedback', id)
    )
    OR public.has_permission (
      auth.uid (),
      'project.read',
      'project',
      public.resolve_project_id ('verse_feedback', id)
    )
  );


DROP POLICY if EXISTS "Authenticated users can insert verse_feedback" ON public.verse_feedback;


CREATE POLICY verse_feedback_insert ON public.verse_feedback FOR insert
WITH
  CHECK (
    created_by = auth.uid ()
    AND EXISTS (
      SELECT
        1
      FROM
        public.media_files mf
        JOIN public.audio_versions av ON av.id = mf.audio_version_id
      WHERE
        mf.id = verse_feedback.media_files_id
        AND (
          public.has_permission (
            auth.uid (),
            'verse_feedback.write',
            'project',
            av.project_id
          )
          OR public.has_permission (
            auth.uid (),
            'project.write',
            'project',
            av.project_id
          )
        )
    )
  );


DROP POLICY if EXISTS "Users can update their own verse_feedback" ON public.verse_feedback;


CREATE POLICY verse_feedback_update ON public.verse_feedback
FOR UPDATE
  USING (
    public.has_permission (
      auth.uid (),
      'verse_feedback.write',
      'project',
      public.resolve_project_id ('verse_feedback', id)
    )
    OR public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      public.resolve_project_id ('verse_feedback', id)
    )
  )
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'verse_feedback.write',
      'project',
      public.resolve_project_id ('verse_feedback', id)
    )
    OR public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      public.resolve_project_id ('verse_feedback', id)
    )
  );


DROP POLICY if EXISTS "Users can delete their own verse_feedback" ON public.verse_feedback;


CREATE POLICY verse_feedback_delete ON public.verse_feedback FOR delete USING (
  public.has_permission (
    auth.uid (),
    'verse_feedback.delete',
    'project',
    public.resolve_project_id ('verse_feedback', id)
  )
  OR public.has_permission (
    auth.uid (),
    'project.delete',
    'project',
    public.resolve_project_id ('verse_feedback', id)
  )
);


-- Update segments and sequences RLS policies (no publish_status, use has_permission only)
-- Note: These tables don't have direct project_id, so we resolve through relationships
DROP POLICY if EXISTS "Users can view segments" ON public.segments;


CREATE POLICY segments_select ON public.segments FOR
SELECT
  USING (
    public.has_permission (
      auth.uid (),
      'project.read',
      'project',
      public.resolve_project_id ('segments', id)
    )
  );


DROP POLICY if EXISTS "Users can insert segments" ON public.segments;


CREATE POLICY segments_insert ON public.segments FOR insert
WITH
  CHECK (
    created_by = auth.uid ()
    AND public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      public.resolve_project_id ('segments', id)
    )
  );


DROP POLICY if EXISTS "Users can update own segments" ON public.segments;


CREATE POLICY segments_update ON public.segments
FOR UPDATE
  USING (
    public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      public.resolve_project_id ('segments', id)
    )
  )
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      public.resolve_project_id ('segments', id)
    )
  );


DROP POLICY if EXISTS "Users can view sequences" ON public.sequences;


CREATE POLICY sequences_select ON public.sequences FOR
SELECT
  USING (
    public.has_permission (
      auth.uid (),
      'project.read',
      'project',
      public.resolve_project_id ('sequences', id)
    )
  );


DROP POLICY if EXISTS "Users can insert sequences" ON public.sequences;


CREATE POLICY sequences_insert ON public.sequences FOR insert
WITH
  CHECK (
    created_by = auth.uid ()
    AND public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      project_id
    )
  );


DROP POLICY if EXISTS "Users can update own sequences" ON public.sequences;


CREATE POLICY sequences_update ON public.sequences
FOR UPDATE
  USING (
    public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      project_id
    )
  )
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      project_id
    )
  );


DROP POLICY if EXISTS "Users can delete own sequences" ON public.sequences;


CREATE POLICY sequences_delete ON public.sequences FOR delete USING (
  public.has_permission (
    auth.uid (),
    'project.delete',
    'project',
    project_id
  )
);


DROP POLICY if EXISTS "Users can view sequences_segments" ON public.sequences_segments;


CREATE POLICY sequences_segments_select ON public.sequences_segments FOR
SELECT
  USING (
    public.has_permission (
      auth.uid (),
      'project.read',
      'project',
      public.resolve_project_id ('sequences_segments', id)
    )
  );


DROP POLICY if EXISTS "Users can insert sequences_segments" ON public.sequences_segments;


CREATE POLICY sequences_segments_insert ON public.sequences_segments FOR insert
WITH
  CHECK (
    created_by = auth.uid ()
    AND EXISTS (
      SELECT
        1
      FROM
        public.sequences s
      WHERE
        s.id = sequences_segments.sequence_id
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          s.project_id
        )
    )
  );


DROP POLICY if EXISTS "Users can update own sequences_segments" ON public.sequences_segments;


CREATE POLICY sequences_segments_update ON public.sequences_segments
FOR UPDATE
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.sequences s
      WHERE
        s.id = sequences_segments.sequence_id
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          s.project_id
        )
    )
  )
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.sequences s
      WHERE
        s.id = sequences_segments.sequence_id
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          s.project_id
        )
    )
  );


DROP POLICY if EXISTS "Users can delete own sequences_segments" ON public.sequences_segments;


CREATE POLICY sequences_segments_delete ON public.sequences_segments FOR delete USING (
  EXISTS (
    SELECT
      1
    FROM
      public.sequences s
    WHERE
      s.id = sequences_segments.sequence_id
      AND public.has_permission (
        auth.uid (),
        'project.delete',
        'project',
        s.project_id
      )
  )
);

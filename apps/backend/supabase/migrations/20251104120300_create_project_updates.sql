-- Create project updates and media tables
-- Supports text updates with image/video attachments for project progress tracking
-- Project updates table
CREATE TABLE IF NOT EXISTS public.project_updates (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  project_id UUID NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NULL REFERENCES public.users (id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NULL,
  deleted_at TIMESTAMPTZ NULL
);


CREATE INDEX idx_project_updates_project_id ON public.project_updates (project_id);


CREATE INDEX idx_project_updates_created_at ON public.project_updates (created_at DESC);


CREATE INDEX idx_project_updates_deleted_at ON public.project_updates (deleted_at)
WHERE
  deleted_at IS NULL;


comment ON TABLE public.project_updates IS 'Project progress updates with media attachments';


-- Project update media table (supports images and videos)
CREATE TABLE IF NOT EXISTS public.project_updates_media (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  project_update_id UUID NOT NULL REFERENCES public.project_updates (id) ON DELETE CASCADE,
  -- Media file metadata
  media_type media_type NOT NULL,
  object_key TEXT NOT NULL,
  storage_provider TEXT DEFAULT 'r2',
  original_filename TEXT,
  file_type TEXT,
  file_size BIGINT,
  -- Display metadata
  caption TEXT,
  display_order INT NOT NULL DEFAULT 0,
  -- Video-specific (nullable for images)
  duration_seconds INTEGER,
  thumbnail_object_key TEXT,
  -- Standard fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NULL REFERENCES public.users (id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT check_video_has_duration CHECK (
    media_type != 'video'
    OR duration_seconds IS NOT NULL
  )
);


CREATE INDEX idx_project_updates_media_update_id ON public.project_updates_media (project_update_id);


CREATE INDEX idx_project_updates_media_created_by ON public.project_updates_media (created_by);


CREATE INDEX idx_project_updates_media_deleted_at ON public.project_updates_media (deleted_at)
WHERE
  deleted_at IS NULL;


CREATE UNIQUE INDEX idx_project_updates_media_order ON public.project_updates_media (project_update_id, display_order)
WHERE
  deleted_at IS NULL;


comment ON TABLE public.project_updates_media IS 'Media attachments (images/videos) for project updates';


comment ON COLUMN public.project_updates_media.thumbnail_object_key IS 'Video thumbnail - currently null, populated by future background process';


-- RLS Policies
ALTER TABLE public.project_updates enable ROW level security;


ALTER TABLE public.project_updates_media enable ROW level security;


-- PROJECT_UPDATES POLICIES
-- Read: Partner org members (any role) OR project members (viewer+)
CREATE POLICY project_updates_select ON public.project_updates FOR
SELECT
  TO authenticated USING (
    deleted_at IS NULL
    AND (
      -- Partner org members via sponsorship
      EXISTS (
        SELECT
          1
        FROM
          sponsorships s
          JOIN sponsorship_allocations sa ON sa.sponsorship_id = s.id
        WHERE
          sa.project_id = project_updates.project_id
          AND (
            sa.effective_to IS NULL
            OR sa.effective_to >= current_date
          )
          AND public.has_permission (
            auth.uid (),
            'partner.read',
            'partner',
            s.partner_org_id
          )
      )
      OR
      -- Project members (viewer, editor, or admin)
      public.has_permission (
        auth.uid (),
        'project.read',
        'project',
        project_updates.project_id
      )
    )
  );


-- Insert: Project editors and admins can create updates
CREATE POLICY project_updates_insert ON public.project_updates FOR insert TO authenticated
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      project_updates.project_id
    )
  );


-- Update: Users with project.write permission can update
CREATE POLICY project_updates_update ON public.project_updates
FOR UPDATE
  TO authenticated USING (
    deleted_at IS NULL
    AND public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      project_updates.project_id
    )
  )
WITH
  CHECK (
    deleted_at IS NULL
    AND public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      project_updates.project_id
    )
  );


-- Delete (soft): Users with project.delete permission can soft delete
CREATE POLICY project_updates_delete ON public.project_updates
FOR UPDATE
  TO authenticated USING (
    deleted_at IS NULL
    AND public.has_permission (
      auth.uid (),
      'project.delete',
      'project',
      project_updates.project_id
    )
  )
WITH
  CHECK (deleted_at IS NOT NULL);


-- Allow setting deleted_at
-- PROJECT_UPDATES_MEDIA POLICIES
-- Read: Inherits from project_updates (partner org members OR project members)
CREATE POLICY project_updates_media_select ON public.project_updates_media FOR
SELECT
  TO authenticated USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT
        1
      FROM
        project_updates pu
      WHERE
        pu.id = project_updates_media.project_update_id
        AND pu.deleted_at IS NULL
        -- Relies on project_updates RLS policies
    )
  );


-- Insert: Project editors and admins can add media
CREATE POLICY project_updates_media_insert ON public.project_updates_media FOR insert TO authenticated
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        project_updates pu
      WHERE
        pu.id = project_updates_media.project_update_id
        AND pu.deleted_at IS NULL
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          pu.project_id
        )
    )
  );


-- Update: Users with project.write permission can update media
CREATE POLICY project_updates_media_update ON public.project_updates_media
FOR UPDATE
  TO authenticated USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT
        1
      FROM
        project_updates pu
      WHERE
        pu.id = project_updates_media.project_update_id
        AND pu.deleted_at IS NULL
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          pu.project_id
        )
    )
  )
WITH
  CHECK (
    deleted_at IS NULL
    AND EXISTS (
      SELECT
        1
      FROM
        project_updates pu
      WHERE
        pu.id = project_updates_media.project_update_id
        AND pu.deleted_at IS NULL
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          pu.project_id
        )
    )
  );


-- Delete (soft): Users with project.delete permission can soft delete media
CREATE POLICY project_updates_media_delete ON public.project_updates_media
FOR UPDATE
  TO authenticated USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT
        1
      FROM
        project_updates pu
      WHERE
        pu.id = project_updates_media.project_update_id
        AND pu.deleted_at IS NULL
        AND public.has_permission (
          auth.uid (),
          'project.delete',
          'project',
          pu.project_id
        )
    )
  )
WITH
  CHECK (deleted_at IS NOT NULL);


-- Allow setting deleted_at

-- Fix RLS Auth Initialization Plan Issues
-- Migration: 20251226000097_fix_rls_auth_uid_initplan.sql
-- ============================================================================
-- Replace auth.uid() with (select auth.uid()) in all RLS policies
-- This prevents PostgreSQL from creating an initialization plan for each
-- policy evaluation, improving performance significantly.
--
-- Affects ~191 policies across multiple tables
-- ============================================================================
-- TABLE: app_downloads
DROP POLICY if EXISTS "Users can insert their own app downloads" ON app_downloads;


CREATE POLICY "Users can insert their own app downloads" ON app_downloads FOR insert
WITH
  CHECK (
    (
      user_id = (
        SELECT
          auth.uid ()
      )
    )
  );


-- TABLE: app_downloads
DROP POLICY if EXISTS "Users can update their own app downloads" ON app_downloads;


CREATE POLICY "Users can update their own app downloads" ON app_downloads
FOR UPDATE
  USING (
    (
      (
        SELECT
          auth.uid ()
      ) = user_id
    )
  )
WITH
  CHECK (
    (
      (
        SELECT
          auth.uid ()
      ) = user_id
    )
  );


-- TABLE: app_downloads
DROP POLICY if EXISTS "Users can view their own app downloads" ON app_downloads;


CREATE POLICY "Users can view their own app downloads" ON app_downloads FOR
SELECT
  USING (
    (
      (
        SELECT
          auth.uid ()
      ) = user_id
    )
  );


-- TABLE: audio_versions
DROP POLICY if EXISTS audio_versions_del_with_project_delete ON audio_versions;


CREATE POLICY audio_versions_del_with_project_delete ON audio_versions FOR delete USING (
  has_permission (
    (
      SELECT
        auth.uid ()
    ),
    'project.delete'::permission_key,
    'project'::resource_type,
    project_id
  )
);


-- TABLE: audio_versions
DROP POLICY if EXISTS audio_versions_ins_with_project_write ON audio_versions;


CREATE POLICY audio_versions_ins_with_project_write ON audio_versions FOR insert
WITH
  CHECK (
    (
      (
        created_by = (
          SELECT
            auth.uid ()
        )
      )
      AND has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'project.write'::permission_key,
        'project'::resource_type,
        project_id
      )
    )
  );


-- TABLE: audio_versions
DROP POLICY if EXISTS audio_versions_select_inherit_project ON audio_versions;


CREATE POLICY audio_versions_select_inherit_project ON audio_versions FOR
SELECT
  USING (
    (
      (publish_status = 'published'::publish_status)
      OR has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'project.read'::permission_key,
        'project'::resource_type,
        project_id
      )
    )
  );


-- TABLE: audio_versions
DROP POLICY if EXISTS audio_versions_upd_with_project_write ON audio_versions;


CREATE POLICY audio_versions_upd_with_project_write ON audio_versions
FOR UPDATE
  USING (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'project.write'::permission_key,
      'project'::resource_type,
      project_id
    )
  )
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'project.write'::permission_key,
      'project'::resource_type,
      project_id
    )
  );


-- TABLE: bases
DROP POLICY if EXISTS bases_delete_with_permission ON bases;


CREATE POLICY bases_delete_with_permission ON bases FOR delete USING (
  has_permission (
    (
      SELECT
        auth.uid ()
    ),
    'base.delete'::permission_key,
    'base'::resource_type,
    id
  )
);


-- TABLE: bases
DROP POLICY if EXISTS bases_insert_with_permission ON bases;


CREATE POLICY bases_insert_with_permission ON bases FOR insert
WITH
  CHECK (
    (
      (
        created_by = (
          SELECT
            auth.uid ()
        )
      )
      AND has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'system.admin'::permission_key,
        'global'::resource_type,
        NULL::UUID
      )
    )
  );


-- TABLE: bases
DROP POLICY if EXISTS bases_select_public_or_has_permission ON bases;


CREATE POLICY bases_select_public_or_has_permission ON bases FOR
SELECT
  USING (
    (
      (is_public = TRUE)
      OR has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'base.read'::permission_key,
        'base'::resource_type,
        id
      )
    )
  );


-- TABLE: bases
DROP POLICY if EXISTS bases_update_with_permission ON bases;


CREATE POLICY bases_update_with_permission ON bases
FOR UPDATE
  USING (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'base.write'::permission_key,
      'base'::resource_type,
      id
    )
  )
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'base.write'::permission_key,
      'base'::resource_type,
      id
    )
  );


-- TABLE: bases_projects
DROP POLICY if EXISTS bases_projects_delete_with_manage ON bases_projects;


CREATE POLICY bases_projects_delete_with_manage ON bases_projects FOR delete USING (
  has_permission (
    (
      SELECT
        auth.uid ()
    ),
    'base.manage_roles'::permission_key,
    'base'::resource_type,
    base_id
  )
);


-- TABLE: bases_projects
DROP POLICY if EXISTS bases_projects_insert_with_manage ON bases_projects;


CREATE POLICY bases_projects_insert_with_manage ON bases_projects FOR insert
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'base.manage_roles'::permission_key,
      'base'::resource_type,
      base_id
    )
  );


-- TABLE: bases_projects
DROP POLICY if EXISTS bases_projects_update_with_manage ON bases_projects;


CREATE POLICY bases_projects_update_with_manage ON bases_projects
FOR UPDATE
  USING (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'base.manage_roles'::permission_key,
      'base'::resource_type,
      base_id
    )
  )
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'base.manage_roles'::permission_key,
      'base'::resource_type,
      base_id
    )
  );


-- TABLE: bible_translation_overrides
DROP POLICY if EXISTS bible_translation_overrides_delete_admin ON bible_translation_overrides;


CREATE POLICY bible_translation_overrides_delete_admin ON bible_translation_overrides FOR delete USING (
  has_permission (
    (
      SELECT
        auth.uid ()
    ),
    'system.admin'::permission_key,
    'global'::resource_type,
    NULL::UUID
  )
);


-- TABLE: bible_translation_overrides
DROP POLICY if EXISTS bible_translation_overrides_insert_admin ON bible_translation_overrides;


CREATE POLICY bible_translation_overrides_insert_admin ON bible_translation_overrides FOR insert
WITH
  CHECK (
    (
      (
        created_by = (
          SELECT
            auth.uid ()
        )
      )
      AND has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'system.admin'::permission_key,
        'global'::resource_type,
        NULL::UUID
      )
    )
  );


-- TABLE: bible_translation_overrides
DROP POLICY if EXISTS bible_translation_overrides_update_admin ON bible_translation_overrides;


CREATE POLICY bible_translation_overrides_update_admin ON bible_translation_overrides
FOR UPDATE
  USING (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  )
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- TABLE: chapter_listens
DROP POLICY if EXISTS "Users can insert their own chapter listens" ON chapter_listens;


CREATE POLICY "Users can insert their own chapter listens" ON chapter_listens FOR insert
WITH
  CHECK (
    (
      user_id = (
        SELECT
          auth.uid ()
      )
    )
  );


-- TABLE: chapter_listens
DROP POLICY if EXISTS "Users can update their own chapter listens" ON chapter_listens;


CREATE POLICY "Users can update their own chapter listens" ON chapter_listens
FOR UPDATE
  USING (
    (
      (
        SELECT
          auth.uid ()
      ) = user_id
    )
  )
WITH
  CHECK (
    (
      (
        SELECT
          auth.uid ()
      ) = user_id
    )
  );


-- TABLE: chapter_listens
DROP POLICY if EXISTS "Users can view their own chapter listens" ON chapter_listens;


CREATE POLICY "Users can view their own chapter listens" ON chapter_listens FOR
SELECT
  USING (
    (
      (
        SELECT
          auth.uid ()
      ) = user_id
    )
  );


-- TABLE: donation_allocations
DROP POLICY if EXISTS donation_allocations_delete ON donation_allocations;


CREATE POLICY donation_allocations_delete ON donation_allocations FOR delete USING (
  has_permission (
    (
      SELECT
        auth.uid ()
    ),
    'system.admin'::permission_key,
    'global'::resource_type,
    NULL::UUID
  )
);


-- TABLE: donation_allocations
DROP POLICY if EXISTS donation_allocations_insert ON donation_allocations;


CREATE POLICY donation_allocations_insert ON donation_allocations FOR insert
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- TABLE: donation_allocations
DROP POLICY if EXISTS donation_allocations_read ON donation_allocations;


CREATE POLICY donation_allocations_read ON donation_allocations FOR
SELECT
  USING (
    (
      (
        created_by = (
          SELECT
            auth.uid ()
        )
      )
      OR (
        EXISTS (
          SELECT
            1
          FROM
            donations d
          WHERE
            (
              (d.id = donation_allocations.donation_id)
              AND (
                (
                  d.user_id = (
                    SELECT
                      auth.uid ()
                  )
                )
                OR (
                  (d.partner_org_id IS NOT NULL)
                  AND has_permission (
                    (
                      SELECT
                        auth.uid ()
                    ),
                    'partner.read'::permission_key,
                    'partner'::resource_type,
                    d.partner_org_id
                  )
                )
              )
            )
        )
      )
      OR (
        (project_id IS NOT NULL)
        AND has_permission (
          (
            SELECT
              auth.uid ()
          ),
          'project.read'::permission_key,
          'project'::resource_type,
          project_id
        )
      )
      OR has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'system.admin'::permission_key,
        'global'::resource_type,
        NULL::UUID
      )
    )
  );


-- TABLE: donation_allocations
DROP POLICY if EXISTS donation_allocations_update ON donation_allocations;


CREATE POLICY donation_allocations_update ON donation_allocations
FOR UPDATE
  USING (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  )
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- TABLE: donations
DROP POLICY if EXISTS donations_delete_manual ON donations;


CREATE POLICY donations_delete_manual ON donations FOR delete TO authenticated USING (
  (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
    AND (is_manual = TRUE)
  )
);


-- TABLE: donations
DROP POLICY if EXISTS donations_insert_manual ON donations;


CREATE POLICY donations_insert_manual ON donations FOR insert TO authenticated
WITH
  CHECK (
    (
      has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'system.admin'::permission_key,
        'global'::resource_type,
        NULL::UUID
      )
      AND (is_manual = TRUE)
    )
  );


-- TABLE: donations
DROP POLICY if EXISTS donations_read ON donations;


CREATE POLICY donations_read ON donations FOR
SELECT
  USING (
    (
      (
        (
          SELECT
            auth.uid ()
        ) = user_id
      )
      OR (
        (partner_org_id IS NOT NULL)
        AND has_permission (
          (
            SELECT
              auth.uid ()
          ),
          'partner.read'::permission_key,
          'partner'::resource_type,
          partner_org_id
        )
      )
      OR has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'system.admin'::permission_key,
        'global'::resource_type,
        NULL::UUID
      )
    )
  );


-- TABLE: donations
DROP POLICY if EXISTS donations_update_manual ON donations;


CREATE POLICY donations_update_manual ON donations
FOR UPDATE
  TO authenticated USING (
    (
      has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'system.admin'::permission_key,
        'global'::resource_type,
        NULL::UUID
      )
      AND (is_manual = TRUE)
    )
  )
WITH
  CHECK ((is_manual = TRUE));


-- TABLE: external_projects_overrides
DROP POLICY if EXISTS external_projects_overrides_delete_admin ON external_projects_overrides;


CREATE POLICY external_projects_overrides_delete_admin ON external_projects_overrides FOR delete USING (
  has_permission (
    (
      SELECT
        auth.uid ()
    ),
    'system.admin'::permission_key,
    'global'::resource_type,
    NULL::UUID
  )
);


-- TABLE: external_projects_overrides
DROP POLICY if EXISTS external_projects_overrides_insert_admin ON external_projects_overrides;


CREATE POLICY external_projects_overrides_insert_admin ON external_projects_overrides FOR insert
WITH
  CHECK (
    (
      (
        created_by = (
          SELECT
            auth.uid ()
        )
      )
      AND has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'system.admin'::permission_key,
        'global'::resource_type,
        NULL::UUID
      )
    )
  );


-- TABLE: external_projects_overrides
DROP POLICY if EXISTS external_projects_overrides_update_admin ON external_projects_overrides;


CREATE POLICY external_projects_overrides_update_admin ON external_projects_overrides
FOR UPDATE
  USING (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  )
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- TABLE: image_sets
DROP POLICY if EXISTS "Users can delete own image_sets" ON image_sets;


CREATE POLICY "Users can delete own image_sets" ON image_sets FOR delete USING (
  (
    created_by = (
      SELECT
        auth.uid ()
    )
  )
);


-- TABLE: image_sets
DROP POLICY if EXISTS "Users can update own image_sets" ON image_sets;


CREATE POLICY "Users can update own image_sets" ON image_sets
FOR UPDATE
  USING (
    (
      created_by = (
        SELECT
          auth.uid ()
      )
    )
  );


-- TABLE: image_sets
DROP POLICY if EXISTS "Users can view image_sets" ON image_sets;


CREATE POLICY "Users can view image_sets" ON image_sets FOR
SELECT
  USING (
    (
      TRUE
      OR (
        created_by = (
          SELECT
            auth.uid ()
        )
      )
    )
  );


-- TABLE: images
DROP POLICY if EXISTS "Users can delete own images" ON images;


CREATE POLICY "Users can delete own images" ON images FOR delete USING (
  (
    created_by = (
      SELECT
        auth.uid ()
    )
  )
);


-- TABLE: images
DROP POLICY if EXISTS "Users can update own images" ON images;


CREATE POLICY "Users can update own images" ON images
FOR UPDATE
  USING (
    (
      created_by = (
        SELECT
          auth.uid ()
      )
    )
  );


-- TABLE: images
DROP POLICY if EXISTS "Users can view images" ON images;


CREATE POLICY "Users can view images" ON images FOR
SELECT
  USING (
    (
      TRUE
      OR (
        created_by = (
          SELECT
            auth.uid ()
        )
      )
    )
  );


-- TABLE: language_aliases
DROP POLICY if EXISTS "System admins can insert language_aliases" ON language_aliases;


CREATE POLICY "System admins can insert language_aliases" ON language_aliases FOR insert TO authenticated
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- TABLE: language_aliases
DROP POLICY if EXISTS "System admins can update language_aliases" ON language_aliases;


CREATE POLICY "System admins can update language_aliases" ON language_aliases
FOR UPDATE
  TO authenticated USING (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  )
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- TABLE: language_entities
DROP POLICY if EXISTS "System admins can insert language_entities" ON language_entities;


CREATE POLICY "System admins can insert language_entities" ON language_entities FOR insert TO authenticated
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- TABLE: language_entities
DROP POLICY if EXISTS "System admins can update language_entities" ON language_entities;


CREATE POLICY "System admins can update language_entities" ON language_entities
FOR UPDATE
  TO authenticated USING (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  )
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- TABLE: language_entities_regions
DROP POLICY if EXISTS "System admins can insert language_entities_regions" ON language_entities_regions;


CREATE POLICY "System admins can insert language_entities_regions" ON language_entities_regions FOR insert TO authenticated
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- TABLE: language_entities_regions
DROP POLICY if EXISTS "System admins can update language_entities_regions" ON language_entities_regions;


CREATE POLICY "System admins can update language_entities_regions" ON language_entities_regions
FOR UPDATE
  TO authenticated USING (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  )
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- TABLE: language_entity_sources
DROP POLICY if EXISTS "System admins can insert language_entity_sources" ON language_entity_sources;


CREATE POLICY "System admins can insert language_entity_sources" ON language_entity_sources FOR insert TO authenticated
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- TABLE: language_entity_sources
DROP POLICY if EXISTS "System admins can update language_entity_sources" ON language_entity_sources;


CREATE POLICY "System admins can update language_entity_sources" ON language_entity_sources
FOR UPDATE
  TO authenticated USING (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  )
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- TABLE: language_funding
DROP POLICY if EXISTS language_funding_delete ON language_funding;


CREATE POLICY language_funding_delete ON language_funding FOR delete USING (
  has_permission (
    (
      SELECT
        auth.uid ()
    ),
    'system.admin'::permission_key,
    'global'::resource_type,
    NULL::UUID
  )
);


-- TABLE: language_funding
DROP POLICY if EXISTS language_funding_insert ON language_funding;


CREATE POLICY language_funding_insert ON language_funding FOR insert
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- TABLE: language_funding
DROP POLICY if EXISTS language_funding_read ON language_funding;


CREATE POLICY language_funding_read ON language_funding FOR
SELECT
  USING (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- TABLE: language_funding
DROP POLICY if EXISTS language_funding_update ON language_funding;


CREATE POLICY language_funding_update ON language_funding
FOR UPDATE
  USING (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  )
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- TABLE: language_properties
DROP POLICY if EXISTS "System admins can insert language_properties" ON language_properties;


CREATE POLICY "System admins can insert language_properties" ON language_properties FOR insert TO authenticated
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- TABLE: language_properties
DROP POLICY if EXISTS "System admins can update language_properties" ON language_properties;


CREATE POLICY "System admins can update language_properties" ON language_properties
FOR UPDATE
  TO authenticated USING (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  )
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- TABLE: media_file_listens
DROP POLICY if EXISTS "Users can insert their own media file listens" ON media_file_listens;


CREATE POLICY "Users can insert their own media file listens" ON media_file_listens FOR insert
WITH
  CHECK (
    (
      user_id = (
        SELECT
          auth.uid ()
      )
    )
  );


-- TABLE: media_file_listens
DROP POLICY if EXISTS "Users can update their own media file listens" ON media_file_listens;


CREATE POLICY "Users can update their own media file listens" ON media_file_listens
FOR UPDATE
  USING (
    (
      (
        SELECT
          auth.uid ()
      ) = user_id
    )
  )
WITH
  CHECK (
    (
      (
        SELECT
          auth.uid ()
      ) = user_id
    )
  );


-- TABLE: media_file_listens
DROP POLICY if EXISTS "Users can view their own media file listens" ON media_file_listens;


CREATE POLICY "Users can view their own media file listens" ON media_file_listens FOR
SELECT
  USING (
    (
      (
        SELECT
          auth.uid ()
      ) = user_id
    )
  );


-- TABLE: media_files
DROP POLICY if EXISTS media_files_del_with_project_delete ON media_files;


CREATE POLICY media_files_del_with_project_delete ON media_files FOR delete USING (
  (
    EXISTS (
      SELECT
        1
      FROM
        audio_versions av
      WHERE
        (
          (av.id = media_files.audio_version_id)
          AND has_permission (
            (
              SELECT
                auth.uid ()
            ),
            'project.delete'::permission_key,
            'project'::resource_type,
            av.project_id
          )
        )
    )
  )
);


-- TABLE: media_files
DROP POLICY if EXISTS media_files_ins_with_project_write ON media_files;


CREATE POLICY media_files_ins_with_project_write ON media_files FOR insert
WITH
  CHECK (
    (
      (
        created_by = (
          SELECT
            auth.uid ()
        )
      )
      AND (project_id IS NOT NULL)
      AND has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'project.write'::permission_key,
        'project'::resource_type,
        project_id
      )
    )
  );


-- TABLE: media_files
DROP POLICY if EXISTS media_files_select_inherit_project ON media_files;


CREATE POLICY media_files_select_inherit_project ON media_files FOR
SELECT
  USING (
    (
      (publish_status = 'published'::publish_status)
      OR has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'project.read'::permission_key,
        'project'::resource_type,
        project_id
      )
    )
  );


-- TABLE: media_files
DROP POLICY if EXISTS media_files_upd_with_project_write ON media_files;


CREATE POLICY media_files_upd_with_project_write ON media_files
FOR UPDATE
  USING (
    (
      EXISTS (
        SELECT
          1
        FROM
          audio_versions av
        WHERE
          (
            (av.id = media_files.audio_version_id)
            AND has_permission (
              (
                SELECT
                  auth.uid ()
              ),
              'project.write'::permission_key,
              'project'::resource_type,
              av.project_id
            )
          )
      )
    )
  )
WITH
  CHECK (
    (
      EXISTS (
        SELECT
          1
        FROM
          audio_versions av
        WHERE
          (
            (av.id = media_files.audio_version_id)
            AND has_permission (
              (
                SELECT
                  auth.uid ()
              ),
              'project.write'::permission_key,
              'project'::resource_type,
              av.project_id
            )
          )
      )
    )
  );


-- TABLE: media_files_verses
DROP POLICY if EXISTS media_files_verses_del_with_project_delete ON media_files_verses;


CREATE POLICY media_files_verses_del_with_project_delete ON media_files_verses FOR delete USING (
  (
    EXISTS (
      SELECT
        1
      FROM
        (
          media_files mf
          JOIN audio_versions av ON ((av.id = mf.audio_version_id))
        )
      WHERE
        (
          (mf.id = media_files_verses.media_file_id)
          AND has_permission (
            (
              SELECT
                auth.uid ()
            ),
            'project.delete'::permission_key,
            'project'::resource_type,
            av.project_id
          )
        )
    )
  )
);


-- TABLE: media_files_verses
DROP POLICY if EXISTS media_files_verses_ins_with_project_write ON media_files_verses;


CREATE POLICY media_files_verses_ins_with_project_write ON media_files_verses FOR insert
WITH
  CHECK (
    (
      (
        created_by = (
          SELECT
            auth.uid ()
        )
      )
      AND (
        EXISTS (
          SELECT
            1
          FROM
            (
              media_files mf
              JOIN audio_versions av ON ((av.id = mf.audio_version_id))
            )
          WHERE
            (
              (mf.id = media_files_verses.media_file_id)
              AND has_permission (
                (
                  SELECT
                    auth.uid ()
                ),
                'project.write'::permission_key,
                'project'::resource_type,
                av.project_id
              )
            )
        )
      )
    )
  );


-- TABLE: media_files_verses
DROP POLICY if EXISTS media_files_verses_select_inherit_project ON media_files_verses;


CREATE POLICY media_files_verses_select_inherit_project ON media_files_verses FOR
SELECT
  USING (
    (
      EXISTS (
        SELECT
          1
        FROM
          media_files mf
        WHERE
          (
            (mf.id = media_files_verses.media_file_id)
            AND (
              (mf.publish_status = 'published'::publish_status)
              OR has_permission (
                (
                  SELECT
                    auth.uid ()
                ),
                'project.read'::permission_key,
                'project'::resource_type,
                mf.project_id
              )
            )
          )
      )
    )
  );


-- TABLE: media_files_verses
DROP POLICY if EXISTS media_files_verses_upd_with_project_write ON media_files_verses;


CREATE POLICY media_files_verses_upd_with_project_write ON media_files_verses
FOR UPDATE
  USING (
    (
      EXISTS (
        SELECT
          1
        FROM
          (
            media_files mf
            JOIN audio_versions av ON ((av.id = mf.audio_version_id))
          )
        WHERE
          (
            (mf.id = media_files_verses.media_file_id)
            AND has_permission (
              (
                SELECT
                  auth.uid ()
              ),
              'project.write'::permission_key,
              'project'::resource_type,
              av.project_id
            )
          )
      )
    )
  )
WITH
  CHECK (
    (
      EXISTS (
        SELECT
          1
        FROM
          (
            media_files mf
            JOIN audio_versions av ON ((av.id = mf.audio_version_id))
          )
        WHERE
          (
            (mf.id = media_files_verses.media_file_id)
            AND has_permission (
              (
                SELECT
                  auth.uid ()
              ),
              'project.write'::permission_key,
              'project'::resource_type,
              av.project_id
            )
          )
      )
    )
  );


-- TABLE: operation_costs
DROP POLICY if EXISTS operation_costs_delete ON operation_costs;


CREATE POLICY operation_costs_delete ON operation_costs FOR delete USING (
  has_permission (
    (
      SELECT
        auth.uid ()
    ),
    'system.admin'::permission_key,
    'global'::resource_type,
    NULL::UUID
  )
);


-- TABLE: operation_costs
DROP POLICY if EXISTS operation_costs_insert ON operation_costs;


CREATE POLICY operation_costs_insert ON operation_costs FOR insert
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- TABLE: operation_costs
DROP POLICY if EXISTS operation_costs_read ON operation_costs;


CREATE POLICY operation_costs_read ON operation_costs FOR
SELECT
  USING (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- TABLE: operation_costs
DROP POLICY if EXISTS operation_costs_update ON operation_costs;


CREATE POLICY operation_costs_update ON operation_costs
FOR UPDATE
  USING (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  )
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- TABLE: operations
DROP POLICY if EXISTS operations_delete ON operations;


CREATE POLICY operations_delete ON operations FOR delete USING (
  has_permission (
    (
      SELECT
        auth.uid ()
    ),
    'system.admin'::permission_key,
    'global'::resource_type,
    NULL::UUID
  )
);


-- TABLE: operations
DROP POLICY if EXISTS operations_insert ON operations;


CREATE POLICY operations_insert ON operations FOR insert
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- TABLE: operations
DROP POLICY if EXISTS operations_read ON operations;


CREATE POLICY operations_read ON operations FOR
SELECT
  USING (
    (
      (deleted_at IS NULL)
      AND has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'system.admin'::permission_key,
        'global'::resource_type,
        NULL::UUID
      )
    )
  );


-- TABLE: operations
DROP POLICY if EXISTS operations_update ON operations;


CREATE POLICY operations_update ON operations
FOR UPDATE
  USING (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  )
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- TABLE: partner_orgs
DROP POLICY if EXISTS partner_orgs_delete_with_permission ON partner_orgs;


CREATE POLICY partner_orgs_delete_with_permission ON partner_orgs FOR delete USING (
  has_permission (
    (
      SELECT
        auth.uid ()
    ),
    'partner.manage_roles'::permission_key,
    'partner'::resource_type,
    id
  )
);


-- TABLE: partner_orgs
DROP POLICY if EXISTS partner_orgs_insert_with_permission ON partner_orgs;


CREATE POLICY partner_orgs_insert_with_permission ON partner_orgs FOR insert
WITH
  CHECK (
    (
      (
        created_by = (
          SELECT
            auth.uid ()
        )
      )
      AND has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'system.admin'::permission_key,
        'global'::resource_type,
        NULL::UUID
      )
    )
  );


-- TABLE: partner_orgs
DROP POLICY if EXISTS partner_orgs_select_public_or_has_permission ON partner_orgs;


CREATE POLICY partner_orgs_select_public_or_has_permission ON partner_orgs FOR
SELECT
  USING (
    (
      (is_public = TRUE)
      OR has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'partner.read'::permission_key,
        'partner'::resource_type,
        id
      )
    )
  );


-- TABLE: partner_orgs
DROP POLICY if EXISTS partner_orgs_update_with_permission ON partner_orgs;


CREATE POLICY partner_orgs_update_with_permission ON partner_orgs
FOR UPDATE
  USING (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'partner.manage_roles'::permission_key,
      'partner'::resource_type,
      id
    )
  )
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'partner.manage_roles'::permission_key,
      'partner'::resource_type,
      id
    )
  );


-- TABLE: partner_orgs_projects
DROP POLICY if EXISTS partner_orgs_projects_delete_admin ON partner_orgs_projects;


CREATE POLICY partner_orgs_projects_delete_admin ON partner_orgs_projects FOR delete USING (
  has_permission (
    (
      SELECT
        auth.uid ()
    ),
    'system.admin'::permission_key,
    'global'::resource_type,
    NULL::UUID
  )
);


-- TABLE: partner_orgs_projects
DROP POLICY if EXISTS partner_orgs_projects_insert_admin ON partner_orgs_projects;


CREATE POLICY partner_orgs_projects_insert_admin ON partner_orgs_projects FOR insert
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- TABLE: partner_orgs_projects
DROP POLICY if EXISTS partner_orgs_projects_update_admin ON partner_orgs_projects;


CREATE POLICY partner_orgs_projects_update_admin ON partner_orgs_projects
FOR UPDATE
  USING (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  )
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- TABLE: passages
DROP POLICY if EXISTS "Users can delete own passages" ON passages;


CREATE POLICY "Users can delete own passages" ON passages FOR delete USING (
  (
    created_by = (
      SELECT
        auth.uid ()
    )
  )
);


-- TABLE: passages
DROP POLICY if EXISTS "Users can insert their own passages" ON passages;


CREATE POLICY "Users can insert their own passages" ON passages FOR insert
WITH
  CHECK (
    (
      created_by = (
        SELECT
          auth.uid ()
      )
    )
  );


-- TABLE: passages
DROP POLICY if EXISTS "Users can update own passages" ON passages;


CREATE POLICY "Users can update own passages" ON passages
FOR UPDATE
  USING (
    (
      created_by = (
        SELECT
          auth.uid ()
      )
    )
  );


-- TABLE: passages
DROP POLICY if EXISTS "Users can view passages" ON passages;


CREATE POLICY "Users can view passages" ON passages FOR
SELECT
  USING (
    (
      TRUE
      OR (
        created_by = (
          SELECT
            auth.uid ()
        )
      )
    )
  );


-- TABLE: payment_attempts
DROP POLICY if EXISTS payment_attempts_read ON payment_attempts;


CREATE POLICY payment_attempts_read ON payment_attempts FOR
SELECT
  USING (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- TABLE: payment_methods
DROP POLICY if EXISTS payment_methods_delete ON payment_methods;


CREATE POLICY payment_methods_delete ON payment_methods FOR delete USING (
  (
    (
      (
        SELECT
          auth.uid ()
      ) = user_id
    )
    OR (
      (partner_org_id IS NOT NULL)
      AND has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'partner.read'::permission_key,
        'partner'::resource_type,
        partner_org_id
      )
    )
    OR has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  )
);


-- TABLE: payment_methods
DROP POLICY if EXISTS payment_methods_insert ON payment_methods;


CREATE POLICY payment_methods_insert ON payment_methods FOR insert
WITH
  CHECK (
    (
      (
        (
          SELECT
            auth.uid ()
        ) = user_id
      )
      OR (
        (partner_org_id IS NOT NULL)
        AND has_permission (
          (
            SELECT
              auth.uid ()
          ),
          'partner.read'::permission_key,
          'partner'::resource_type,
          partner_org_id
        )
      )
      OR has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'system.admin'::permission_key,
        'global'::resource_type,
        NULL::UUID
      )
    )
  );


-- TABLE: payment_methods
DROP POLICY if EXISTS payment_methods_read ON payment_methods;


CREATE POLICY payment_methods_read ON payment_methods FOR
SELECT
  USING (
    (
      (deleted_at IS NULL)
      AND (
        (
          (
            SELECT
              auth.uid ()
          ) = user_id
        )
        OR (
          (partner_org_id IS NOT NULL)
          AND has_permission (
            (
              SELECT
                auth.uid ()
            ),
            'partner.read'::permission_key,
            'partner'::resource_type,
            partner_org_id
          )
        )
        OR has_permission (
          (
            SELECT
              auth.uid ()
          ),
          'system.admin'::permission_key,
          'global'::resource_type,
          NULL::UUID
        )
      )
    )
  );


-- TABLE: payment_methods
DROP POLICY if EXISTS payment_methods_update ON payment_methods;


CREATE POLICY payment_methods_update ON payment_methods
FOR UPDATE
  USING (
    (
      (
        (
          SELECT
            auth.uid ()
        ) = user_id
      )
      OR (
        (partner_org_id IS NOT NULL)
        AND has_permission (
          (
            SELECT
              auth.uid ()
          ),
          'partner.read'::permission_key,
          'partner'::resource_type,
          partner_org_id
        )
      )
      OR has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'system.admin'::permission_key,
        'global'::resource_type,
        NULL::UUID
      )
    )
  )
WITH
  CHECK (
    (
      (
        (
          SELECT
            auth.uid ()
        ) = user_id
      )
      OR (
        (partner_org_id IS NOT NULL)
        AND has_permission (
          (
            SELECT
              auth.uid ()
          ),
          'partner.read'::permission_key,
          'partner'::resource_type,
          partner_org_id
        )
      )
      OR has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'system.admin'::permission_key,
        'global'::resource_type,
        NULL::UUID
      )
    )
  );


-- TABLE: playlist_items
DROP POLICY if EXISTS "Users can delete own playlist_items" ON playlist_items;


CREATE POLICY "Users can delete own playlist_items" ON playlist_items FOR delete USING (
  (
    created_by = (
      SELECT
        auth.uid ()
    )
  )
);


-- TABLE: playlist_items
DROP POLICY if EXISTS "Users can insert their own playlist_items" ON playlist_items;


CREATE POLICY "Users can insert their own playlist_items" ON playlist_items FOR insert
WITH
  CHECK (
    (
      created_by = (
        SELECT
          auth.uid ()
      )
    )
  );


-- TABLE: playlist_items
DROP POLICY if EXISTS "Users can update own playlist_items" ON playlist_items;


CREATE POLICY "Users can update own playlist_items" ON playlist_items
FOR UPDATE
  USING (
    (
      created_by = (
        SELECT
          auth.uid ()
      )
    )
  );


-- TABLE: playlist_items
DROP POLICY if EXISTS "Users can view playlist_items" ON playlist_items;


CREATE POLICY "Users can view playlist_items" ON playlist_items FOR
SELECT
  USING (
    (
      TRUE
      OR (
        created_by = (
          SELECT
            auth.uid ()
        )
      )
    )
  );


-- TABLE: playlists
DROP POLICY if EXISTS "Users can delete own playlists" ON playlists;


CREATE POLICY "Users can delete own playlists" ON playlists FOR delete USING (
  (
    created_by = (
      SELECT
        auth.uid ()
    )
  )
);


-- TABLE: playlists
DROP POLICY if EXISTS "Users can insert their own playlists" ON playlists;


CREATE POLICY "Users can insert their own playlists" ON playlists FOR insert
WITH
  CHECK (
    (
      created_by = (
        SELECT
          auth.uid ()
      )
    )
  );


-- TABLE: playlists
DROP POLICY if EXISTS "Users can update own playlists" ON playlists;


CREATE POLICY "Users can update own playlists" ON playlists
FOR UPDATE
  USING (
    (
      created_by = (
        SELECT
          auth.uid ()
      )
    )
  );


-- TABLE: playlists
DROP POLICY if EXISTS "Users can view playlists" ON playlists;


CREATE POLICY "Users can view playlists" ON playlists FOR
SELECT
  USING (
    (
      TRUE
      OR (
        created_by = (
          SELECT
            auth.uid ()
        )
      )
    )
  );


-- TABLE: project_updates
DROP POLICY if EXISTS project_updates_insert ON project_updates;


CREATE POLICY project_updates_insert ON project_updates FOR insert
WITH
  CHECK (
    (
      (
        created_by = (
          SELECT
            auth.uid ()
        )
      )
      AND has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'project.write'::permission_key,
        'project'::resource_type,
        project_id
      )
    )
  );


-- TABLE: project_updates
DROP POLICY if EXISTS project_updates_select ON project_updates;


CREATE POLICY project_updates_select ON project_updates FOR
SELECT
  USING (
    (
      (deleted_at IS NULL)
      AND (
        (publish_status = 'published'::publish_status)
        OR has_permission (
          (
            SELECT
              auth.uid ()
          ),
          'project.read'::permission_key,
          'project'::resource_type,
          project_id
        )
      )
    )
  );


-- TABLE: project_updates
DROP POLICY if EXISTS project_updates_update ON project_updates;


CREATE POLICY project_updates_update ON project_updates
FOR UPDATE
  USING (
    (
      (deleted_at IS NULL)
      AND has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'project.write'::permission_key,
        'project'::resource_type,
        project_id
      )
    )
  )
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'project.write'::permission_key,
      'project'::resource_type,
      project_id
    )
  );


-- TABLE: project_updates_media
DROP POLICY if EXISTS project_updates_media_insert ON project_updates_media;


CREATE POLICY project_updates_media_insert ON project_updates_media FOR insert
WITH
  CHECK (
    (
      (
        created_by = (
          SELECT
            auth.uid ()
        )
      )
      AND (
        EXISTS (
          SELECT
            1
          FROM
            project_updates pu
          WHERE
            (
              (pu.id = project_updates_media.project_update_id)
              AND (pu.deleted_at IS NULL)
              AND has_permission (
                (
                  SELECT
                    auth.uid ()
                ),
                'project.write'::permission_key,
                'project'::resource_type,
                pu.project_id
              )
            )
        )
      )
    )
  );


-- TABLE: project_updates_media
DROP POLICY if EXISTS project_updates_media_select ON project_updates_media;


CREATE POLICY project_updates_media_select ON project_updates_media FOR
SELECT
  USING (
    (
      (deleted_at IS NULL)
      AND (
        EXISTS (
          SELECT
            1
          FROM
            project_updates pu
          WHERE
            (
              (pu.id = project_updates_media.project_update_id)
              AND (pu.deleted_at IS NULL)
              AND (
                (pu.publish_status = 'published'::publish_status)
                OR has_permission (
                  (
                    SELECT
                      auth.uid ()
                  ),
                  'project.read'::permission_key,
                  'project'::resource_type,
                  pu.project_id
                )
              )
            )
        )
      )
    )
  );


-- TABLE: project_updates_media
DROP POLICY if EXISTS project_updates_media_update ON project_updates_media;


CREATE POLICY project_updates_media_update ON project_updates_media
FOR UPDATE
  USING (
    (
      (deleted_at IS NULL)
      AND (
        EXISTS (
          SELECT
            1
          FROM
            project_updates pu
          WHERE
            (
              (pu.id = project_updates_media.project_update_id)
              AND (pu.deleted_at IS NULL)
              AND has_permission (
                (
                  SELECT
                    auth.uid ()
                ),
                'project.write'::permission_key,
                'project'::resource_type,
                pu.project_id
              )
            )
        )
      )
    )
  )
WITH
  CHECK (
    (
      EXISTS (
        SELECT
          1
        FROM
          project_updates pu
        WHERE
          (
            (pu.id = project_updates_media.project_update_id)
            AND (pu.deleted_at IS NULL)
            AND has_permission (
              (
                SELECT
                  auth.uid ()
              ),
              'project.write'::permission_key,
              'project'::resource_type,
              pu.project_id
            )
          )
      )
    )
  );


-- TABLE: projects
DROP POLICY if EXISTS projects_delete_with_permission ON projects;


CREATE POLICY projects_delete_with_permission ON projects FOR delete USING (
  has_permission (
    (
      SELECT
        auth.uid ()
    ),
    'project.delete'::permission_key,
    'project'::resource_type,
    id
  )
);


-- TABLE: projects
DROP POLICY if EXISTS projects_insert_with_permission ON projects;


CREATE POLICY projects_insert_with_permission ON projects FOR insert
WITH
  CHECK (
    (
      created_by = (
        SELECT
          auth.uid ()
      )
    )
  );


-- TABLE: projects
DROP POLICY if EXISTS projects_select_public ON projects;


CREATE POLICY projects_select_public ON projects FOR
SELECT
  USING (
    (
      (publish_status = 'published'::publish_status)
      OR (
        created_by = (
          SELECT
            auth.uid ()
        )
      )
      OR has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'project.read'::permission_key,
        'project'::resource_type,
        id
      )
    )
  );


-- TABLE: projects
DROP POLICY if EXISTS projects_update_with_permission ON projects;


CREATE POLICY projects_update_with_permission ON projects
FOR UPDATE
  USING (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'project.write'::permission_key,
      'project'::resource_type,
      id
    )
  )
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'project.write'::permission_key,
      'project'::resource_type,
      id
    )
  );


-- TABLE: role_permissions
DROP POLICY if EXISTS role_permissions_select_allowed ON role_permissions;


CREATE POLICY role_permissions_select_allowed ON role_permissions FOR
SELECT
  USING (
    (
      (auth.role () = 'service_role'::TEXT)
      OR has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'system.admin'::permission_key,
        'global'::resource_type,
        '00000000-0000-0000-0000-000000000000'::UUID
      )
    )
  );


-- TABLE: segments
DROP POLICY if EXISTS segments_insert ON segments;


CREATE POLICY segments_insert ON segments FOR insert
WITH
  CHECK (
    (
      (
        created_by = (
          SELECT
            auth.uid ()
        )
      )
      AND has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'project.write'::permission_key,
        'project'::resource_type,
        project_id
      )
    )
  );


-- TABLE: segments
DROP POLICY if EXISTS segments_select ON segments;


CREATE POLICY segments_select ON segments FOR
SELECT
  USING (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'project.read'::permission_key,
      'project'::resource_type,
      project_id
    )
  );


-- TABLE: segments
DROP POLICY if EXISTS segments_update ON segments;


CREATE POLICY segments_update ON segments
FOR UPDATE
  USING (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'project.write'::permission_key,
      'project'::resource_type,
      project_id
    )
  )
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'project.write'::permission_key,
      'project'::resource_type,
      project_id
    )
  );


-- TABLE: sequences
DROP POLICY if EXISTS sequences_delete ON sequences;


CREATE POLICY sequences_delete ON sequences FOR delete USING (
  has_permission (
    (
      SELECT
        auth.uid ()
    ),
    'project.delete'::permission_key,
    'project'::resource_type,
    project_id
  )
);


-- TABLE: sequences
DROP POLICY if EXISTS sequences_insert ON sequences;


CREATE POLICY sequences_insert ON sequences FOR insert
WITH
  CHECK (
    (
      (
        created_by = (
          SELECT
            auth.uid ()
        )
      )
      AND has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'project.write'::permission_key,
        'project'::resource_type,
        project_id
      )
    )
  );


-- TABLE: sequences
DROP POLICY if EXISTS sequences_select ON sequences;


CREATE POLICY sequences_select ON sequences FOR
SELECT
  USING (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'project.read'::permission_key,
      'project'::resource_type,
      project_id
    )
  );


-- TABLE: sequences
DROP POLICY if EXISTS sequences_update ON sequences;


CREATE POLICY sequences_update ON sequences
FOR UPDATE
  USING (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'project.write'::permission_key,
      'project'::resource_type,
      project_id
    )
  )
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'project.write'::permission_key,
      'project'::resource_type,
      project_id
    )
  );


-- TABLE: sequences_segments
DROP POLICY if EXISTS sequences_segments_delete ON sequences_segments;


CREATE POLICY sequences_segments_delete ON sequences_segments FOR delete USING (
  (
    EXISTS (
      SELECT
        1
      FROM
        sequences s
      WHERE
        (
          (s.id = sequences_segments.sequence_id)
          AND has_permission (
            (
              SELECT
                auth.uid ()
            ),
            'project.delete'::permission_key,
            'project'::resource_type,
            s.project_id
          )
        )
    )
  )
);


-- TABLE: sequences_segments
DROP POLICY if EXISTS sequences_segments_insert ON sequences_segments;


CREATE POLICY sequences_segments_insert ON sequences_segments FOR insert
WITH
  CHECK (
    (
      (
        created_by = (
          SELECT
            auth.uid ()
        )
      )
      AND (
        EXISTS (
          SELECT
            1
          FROM
            sequences s
          WHERE
            (
              (s.id = sequences_segments.sequence_id)
              AND has_permission (
                (
                  SELECT
                    auth.uid ()
                ),
                'project.write'::permission_key,
                'project'::resource_type,
                s.project_id
              )
            )
        )
      )
    )
  );


-- TABLE: sequences_segments
DROP POLICY if EXISTS sequences_segments_select ON sequences_segments;


CREATE POLICY sequences_segments_select ON sequences_segments FOR
SELECT
  USING (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'project.read'::permission_key,
      'project'::resource_type,
      project_id
    )
  );


-- TABLE: sequences_segments
DROP POLICY if EXISTS sequences_segments_update ON sequences_segments;


CREATE POLICY sequences_segments_update ON sequences_segments
FOR UPDATE
  USING (
    (
      EXISTS (
        SELECT
          1
        FROM
          sequences s
        WHERE
          (
            (s.id = sequences_segments.sequence_id)
            AND has_permission (
              (
                SELECT
                  auth.uid ()
              ),
              'project.write'::permission_key,
              'project'::resource_type,
              s.project_id
            )
          )
      )
    )
  )
WITH
  CHECK (
    (
      EXISTS (
        SELECT
          1
        FROM
          sequences s
        WHERE
          (
            (s.id = sequences_segments.sequence_id)
            AND has_permission (
              (
                SELECT
                  auth.uid ()
              ),
              'project.write'::permission_key,
              'project'::resource_type,
              s.project_id
            )
          )
      )
    )
  );


-- TABLE: sessions
DROP POLICY if EXISTS "Users can insert their own sessions" ON sessions;


CREATE POLICY "Users can insert their own sessions" ON sessions FOR insert
WITH
  CHECK (
    (
      user_id = (
        SELECT
          auth.uid ()
      )
    )
  );


-- TABLE: sessions
DROP POLICY if EXISTS "Users can update their own sessions" ON sessions;


CREATE POLICY "Users can update their own sessions" ON sessions
FOR UPDATE
  USING (
    (
      (
        SELECT
          (
            SELECT
              auth.uid ()
          ) AS uid
      ) = user_id
    )
  )
WITH
  CHECK (
    (
      (
        SELECT
          (
            SELECT
              auth.uid ()
          ) AS uid
      ) = user_id
    )
  );


-- TABLE: sessions
DROP POLICY if EXISTS "Users can view their own sessions" ON sessions;


CREATE POLICY "Users can view their own sessions" ON sessions FOR
SELECT
  USING (
    (
      (
        SELECT
          auth.uid ()
      ) = user_id
    )
  );


-- TABLE: share_opens
DROP POLICY if EXISTS "Users can insert their own share_opens" ON share_opens;


CREATE POLICY "Users can insert their own share_opens" ON share_opens FOR insert
WITH
  CHECK (
    (
      user_id = (
        SELECT
          auth.uid ()
      )
    )
  );


-- TABLE: share_opens
DROP POLICY if EXISTS "Users can update their own share_opens" ON share_opens;


CREATE POLICY "Users can update their own share_opens" ON share_opens
FOR UPDATE
  USING (
    (
      (
        SELECT
          auth.uid ()
      ) = user_id
    )
  )
WITH
  CHECK (
    (
      (
        SELECT
          auth.uid ()
      ) = user_id
    )
  );


-- TABLE: share_opens
DROP POLICY if EXISTS "Users can view their own share_opens" ON share_opens;


CREATE POLICY "Users can view their own share_opens" ON share_opens FOR
SELECT
  USING (
    (
      (
        SELECT
          auth.uid ()
      ) = user_id
    )
  );


-- TABLE: shares
DROP POLICY if EXISTS "Users can insert their own shares" ON shares;


CREATE POLICY "Users can insert their own shares" ON shares FOR insert
WITH
  CHECK (
    (
      user_id = (
        SELECT
          auth.uid ()
      )
    )
  );


-- TABLE: shares
DROP POLICY if EXISTS "Users can update their own shares" ON shares;


CREATE POLICY "Users can update their own shares" ON shares
FOR UPDATE
  USING (
    (
      (
        SELECT
          auth.uid ()
      ) = user_id
    )
  )
WITH
  CHECK (
    (
      (
        SELECT
          auth.uid ()
      ) = user_id
    )
  );


-- TABLE: shares
DROP POLICY if EXISTS "Users can view their own shares" ON shares;


CREATE POLICY "Users can view their own shares" ON shares FOR
SELECT
  USING (
    (
      (
        SELECT
          auth.uid ()
      ) = user_id
    )
  );


-- TABLE: subscriptions
DROP POLICY if EXISTS subscriptions_read ON subscriptions;


CREATE POLICY subscriptions_read ON subscriptions FOR
SELECT
  USING (
    (
      (
        (
          SELECT
            auth.uid ()
        ) = user_id
      )
      OR (
        (partner_org_id IS NOT NULL)
        AND has_permission (
          (
            SELECT
              auth.uid ()
          ),
          'partner.read'::permission_key,
          'partner'::resource_type,
          partner_org_id
        )
      )
      OR has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'system.admin'::permission_key,
        'global'::resource_type,
        NULL::UUID
      )
    )
  );


-- TABLE: text_versions
DROP POLICY if EXISTS text_versions_del_with_project_delete ON text_versions;


CREATE POLICY text_versions_del_with_project_delete ON text_versions FOR delete USING (
  has_permission (
    (
      SELECT
        auth.uid ()
    ),
    'project.delete'::permission_key,
    'project'::resource_type,
    project_id
  )
);


-- TABLE: text_versions
DROP POLICY if EXISTS text_versions_ins_with_project_write ON text_versions;


CREATE POLICY text_versions_ins_with_project_write ON text_versions FOR insert
WITH
  CHECK (
    (
      (
        created_by = (
          SELECT
            auth.uid ()
        )
      )
      AND has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'project.write'::permission_key,
        'project'::resource_type,
        project_id
      )
    )
  );


-- TABLE: text_versions
DROP POLICY if EXISTS text_versions_select_inherit_project ON text_versions;


CREATE POLICY text_versions_select_inherit_project ON text_versions FOR
SELECT
  USING (
    (
      (publish_status = 'published'::publish_status)
      OR has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'project.read'::permission_key,
        'project'::resource_type,
        project_id
      )
    )
  );


-- TABLE: text_versions
DROP POLICY if EXISTS text_versions_upd_with_project_write ON text_versions;


CREATE POLICY text_versions_upd_with_project_write ON text_versions
FOR UPDATE
  USING (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'project.write'::permission_key,
      'project'::resource_type,
      project_id
    )
  )
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'project.write'::permission_key,
      'project'::resource_type,
      project_id
    )
  );


-- TABLE: user_bookmark_folders
DROP POLICY if EXISTS "Users can delete their own bookmark folders" ON user_bookmark_folders;


CREATE POLICY "Users can delete their own bookmark folders" ON user_bookmark_folders FOR delete USING (
  (
    user_id = (
      SELECT
        users.id
      FROM
        users
      WHERE
        (
          users.id = (
            SELECT
              auth.uid ()
          )
        )
    )
  )
);


-- TABLE: user_bookmark_folders
DROP POLICY if EXISTS "Users can insert their own bookmark folders" ON user_bookmark_folders;


CREATE POLICY "Users can insert their own bookmark folders" ON user_bookmark_folders FOR insert
WITH
  CHECK (
    (
      user_id = (
        SELECT
          users.id
        FROM
          users
        WHERE
          (
            users.id = (
              SELECT
                auth.uid ()
            )
          )
      )
    )
  );


-- TABLE: user_bookmark_folders
DROP POLICY if EXISTS "Users can insert their own user_bookmark_folders" ON user_bookmark_folders;


CREATE POLICY "Users can insert their own user_bookmark_folders" ON user_bookmark_folders FOR insert
WITH
  CHECK (
    (
      user_id = (
        SELECT
          auth.uid ()
      )
    )
  );


-- TABLE: user_bookmark_folders
DROP POLICY if EXISTS "Users can update their own bookmark folders" ON user_bookmark_folders;


CREATE POLICY "Users can update their own bookmark folders" ON user_bookmark_folders
FOR UPDATE
  USING (
    (
      user_id = (
        SELECT
          users.id
        FROM
          users
        WHERE
          (
            users.id = (
              SELECT
                auth.uid ()
            )
          )
      )
    )
  );


-- TABLE: user_bookmark_folders
DROP POLICY if EXISTS "Users can view their own bookmark folders" ON user_bookmark_folders;


CREATE POLICY "Users can view their own bookmark folders" ON user_bookmark_folders FOR
SELECT
  USING (
    (
      user_id = (
        SELECT
          users.id
        FROM
          users
        WHERE
          (
            users.id = (
              SELECT
                auth.uid ()
            )
          )
      )
    )
  );


-- TABLE: user_bookmarks
DROP POLICY if EXISTS "Users can delete their own bookmarks" ON user_bookmarks;


CREATE POLICY "Users can delete their own bookmarks" ON user_bookmarks FOR delete USING (
  (
    user_id = (
      SELECT
        users.id
      FROM
        users
      WHERE
        (
          users.id = (
            SELECT
              auth.uid ()
          )
        )
    )
  )
);


-- TABLE: user_bookmarks
DROP POLICY if EXISTS "Users can insert their own bookmarks" ON user_bookmarks;


CREATE POLICY "Users can insert their own bookmarks" ON user_bookmarks FOR insert
WITH
  CHECK (
    (
      user_id = (
        SELECT
          users.id
        FROM
          users
        WHERE
          (
            users.id = (
              SELECT
                auth.uid ()
            )
          )
      )
    )
  );


-- TABLE: user_bookmarks
DROP POLICY if EXISTS "Users can insert their own user_bookmarks" ON user_bookmarks;


CREATE POLICY "Users can insert their own user_bookmarks" ON user_bookmarks FOR insert
WITH
  CHECK (
    (
      user_id = (
        SELECT
          auth.uid ()
      )
    )
  );


-- TABLE: user_bookmarks
DROP POLICY if EXISTS "Users can update their own bookmarks" ON user_bookmarks;


CREATE POLICY "Users can update their own bookmarks" ON user_bookmarks
FOR UPDATE
  USING (
    (
      user_id = (
        SELECT
          users.id
        FROM
          users
        WHERE
          (
            users.id = (
              SELECT
                auth.uid ()
            )
          )
      )
    )
  );


-- TABLE: user_bookmarks
DROP POLICY if EXISTS "Users can view their own bookmarks" ON user_bookmarks;


CREATE POLICY "Users can view their own bookmarks" ON user_bookmarks FOR
SELECT
  USING (
    (
      user_id = (
        SELECT
          users.id
        FROM
          users
        WHERE
          (
            users.id = (
              SELECT
                auth.uid ()
            )
          )
      )
    )
  );


-- TABLE: user_current_selections
DROP POLICY if EXISTS "Users can delete own current selections" ON user_current_selections;


CREATE POLICY "Users can delete own current selections" ON user_current_selections FOR delete USING (
  (
    (
      SELECT
        auth.uid ()
    ) = user_id
  )
);


-- TABLE: user_current_selections
DROP POLICY if EXISTS "Users can insert own current selections" ON user_current_selections;


CREATE POLICY "Users can insert own current selections" ON user_current_selections FOR insert
WITH
  CHECK (
    (
      (
        SELECT
          auth.uid ()
      ) = user_id
    )
  );


-- TABLE: user_current_selections
DROP POLICY if EXISTS "Users can update own current selections" ON user_current_selections;


CREATE POLICY "Users can update own current selections" ON user_current_selections
FOR UPDATE
  USING (
    (
      (
        SELECT
          auth.uid ()
      ) = user_id
    )
  )
WITH
  CHECK (
    (
      (
        SELECT
          auth.uid ()
      ) = user_id
    )
  );


-- TABLE: user_current_selections
DROP POLICY if EXISTS "Users can view own current selections" ON user_current_selections;


CREATE POLICY "Users can view own current selections" ON user_current_selections FOR
SELECT
  USING (
    (
      (
        SELECT
          auth.uid ()
      ) = user_id
    )
  );


-- TABLE: user_playlist_groups
DROP POLICY if EXISTS "Users can delete their own playlist groups" ON user_playlist_groups;


CREATE POLICY "Users can delete their own playlist groups" ON user_playlist_groups FOR delete USING (
  (
    user_id = (
      SELECT
        users.id
      FROM
        users
      WHERE
        (
          users.id = (
            SELECT
              auth.uid ()
          )
        )
    )
  )
);


-- TABLE: user_playlist_groups
DROP POLICY if EXISTS "Users can insert their own playlist groups" ON user_playlist_groups;


CREATE POLICY "Users can insert their own playlist groups" ON user_playlist_groups FOR insert
WITH
  CHECK (
    (
      user_id = (
        SELECT
          users.id
        FROM
          users
        WHERE
          (
            users.id = (
              SELECT
                auth.uid ()
            )
          )
      )
    )
  );


-- TABLE: user_playlist_groups
DROP POLICY if EXISTS "Users can update their own playlist groups" ON user_playlist_groups;


CREATE POLICY "Users can update their own playlist groups" ON user_playlist_groups
FOR UPDATE
  USING (
    (
      user_id = (
        SELECT
          users.id
        FROM
          users
        WHERE
          (
            users.id = (
              SELECT
                auth.uid ()
            )
          )
      )
    )
  );


-- TABLE: user_playlist_groups
DROP POLICY if EXISTS "Users can view their own playlist groups" ON user_playlist_groups;


CREATE POLICY "Users can view their own playlist groups" ON user_playlist_groups FOR
SELECT
  USING (
    (
      user_id = (
        SELECT
          users.id
        FROM
          users
        WHERE
          (
            users.id = (
              SELECT
                auth.uid ()
            )
          )
      )
    )
  );


-- TABLE: user_playlists
DROP POLICY if EXISTS "Users can delete their own playlists" ON user_playlists;


CREATE POLICY "Users can delete their own playlists" ON user_playlists FOR delete USING (
  (
    user_id = (
      SELECT
        users.id
      FROM
        users
      WHERE
        (
          users.id = (
            SELECT
              auth.uid ()
          )
        )
    )
  )
);


-- TABLE: user_playlists
DROP POLICY if EXISTS "Users can insert their own playlists" ON user_playlists;


CREATE POLICY "Users can insert their own playlists" ON user_playlists FOR insert
WITH
  CHECK (
    (
      user_id = (
        SELECT
          users.id
        FROM
          users
        WHERE
          (
            users.id = (
              SELECT
                auth.uid ()
            )
          )
      )
    )
  );


-- TABLE: user_playlists
DROP POLICY if EXISTS "Users can update their own playlists" ON user_playlists;


CREATE POLICY "Users can update their own playlists" ON user_playlists
FOR UPDATE
  USING (
    (
      user_id = (
        SELECT
          users.id
        FROM
          users
        WHERE
          (
            users.id = (
              SELECT
                auth.uid ()
            )
          )
      )
    )
  );


-- TABLE: user_playlists
DROP POLICY if EXISTS "Users can view their own playlists" ON user_playlists;


CREATE POLICY "Users can view their own playlists" ON user_playlists FOR
SELECT
  USING (
    (
      user_id = (
        SELECT
          users.id
        FROM
          users
        WHERE
          (
            users.id = (
              SELECT
                auth.uid ()
            )
          )
      )
    )
  );


-- TABLE: user_roles
DROP POLICY if EXISTS user_roles_delete_with_manage ON user_roles;


CREATE POLICY user_roles_delete_with_manage ON user_roles FOR delete USING (
  (
    (
      (project_id IS NOT NULL)
      AND has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'project.manage_roles'::permission_key,
        'project'::resource_type,
        project_id
      )
    )
    OR (
      (base_id IS NOT NULL)
      AND has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'base.manage_roles'::permission_key,
        'base'::resource_type,
        base_id
      )
    )
    OR (
      (partner_org_id IS NOT NULL)
      AND has_permission (
        (
          SELECT
            auth.uid ()
        ),
        'partner.manage_roles'::permission_key,
        'partner'::resource_type,
        partner_org_id
      )
    )
    OR (is_global = TRUE)
  )
);


-- TABLE: user_roles
DROP POLICY if EXISTS user_roles_insert_with_manage ON user_roles;


CREATE POLICY user_roles_insert_with_manage ON user_roles FOR insert
WITH
  CHECK (
    (
      (
        (project_id IS NOT NULL)
        AND has_permission (
          (
            SELECT
              auth.uid ()
          ),
          'project.manage_roles'::permission_key,
          'project'::resource_type,
          project_id
        )
      )
      OR (
        (base_id IS NOT NULL)
        AND has_permission (
          (
            SELECT
              auth.uid ()
          ),
          'base.manage_roles'::permission_key,
          'base'::resource_type,
          base_id
        )
      )
      OR (
        (partner_org_id IS NOT NULL)
        AND has_permission (
          (
            SELECT
              auth.uid ()
          ),
          'partner.manage_roles'::permission_key,
          'partner'::resource_type,
          partner_org_id
        )
      )
      OR (is_global = TRUE)
    )
  );


-- TABLE: user_roles
DROP POLICY if EXISTS user_roles_select_self_or_manager ON user_roles;


CREATE POLICY user_roles_select_self_or_manager ON user_roles FOR
SELECT
  USING (
    (
      (
        user_id = (
          SELECT
            auth.uid ()
        )
      )
      OR (
        (project_id IS NOT NULL)
        AND has_permission (
          (
            SELECT
              auth.uid ()
          ),
          'project.manage_roles'::permission_key,
          'project'::resource_type,
          project_id
        )
      )
      OR (
        (base_id IS NOT NULL)
        AND has_permission (
          (
            SELECT
              auth.uid ()
          ),
          'base.manage_roles'::permission_key,
          'base'::resource_type,
          base_id
        )
      )
      OR (
        (partner_org_id IS NOT NULL)
        AND has_permission (
          (
            SELECT
              auth.uid ()
          ),
          'partner.manage_roles'::permission_key,
          'partner'::resource_type,
          partner_org_id
        )
      )
      OR (is_global = TRUE)
    )
  );


-- TABLE: user_roles
DROP POLICY if EXISTS user_roles_update_with_manage ON user_roles;


CREATE POLICY user_roles_update_with_manage ON user_roles
FOR UPDATE
  USING (
    (
      (
        (project_id IS NOT NULL)
        AND has_permission (
          (
            SELECT
              auth.uid ()
          ),
          'project.manage_roles'::permission_key,
          'project'::resource_type,
          project_id
        )
      )
      OR (
        (base_id IS NOT NULL)
        AND has_permission (
          (
            SELECT
              auth.uid ()
          ),
          'base.manage_roles'::permission_key,
          'base'::resource_type,
          base_id
        )
      )
      OR (
        (partner_org_id IS NOT NULL)
        AND has_permission (
          (
            SELECT
              auth.uid ()
          ),
          'partner.manage_roles'::permission_key,
          'partner'::resource_type,
          partner_org_id
        )
      )
      OR (is_global = TRUE)
    )
  )
WITH
  CHECK (
    (
      (
        (project_id IS NOT NULL)
        AND has_permission (
          (
            SELECT
              auth.uid ()
          ),
          'project.manage_roles'::permission_key,
          'project'::resource_type,
          project_id
        )
      )
      OR (
        (base_id IS NOT NULL)
        AND has_permission (
          (
            SELECT
              auth.uid ()
          ),
          'base.manage_roles'::permission_key,
          'base'::resource_type,
          base_id
        )
      )
      OR (
        (partner_org_id IS NOT NULL)
        AND has_permission (
          (
            SELECT
              auth.uid ()
          ),
          'partner.manage_roles'::permission_key,
          'partner'::resource_type,
          partner_org_id
        )
      )
      OR (is_global = TRUE)
    )
  );


-- TABLE: user_saved_audio_versions
DROP POLICY if EXISTS "Users can delete own saved audio versions" ON user_saved_audio_versions;


CREATE POLICY "Users can delete own saved audio versions" ON user_saved_audio_versions FOR delete USING (
  (
    user_id = (
      SELECT
        auth.uid ()
    )
  )
);


-- TABLE: user_saved_audio_versions
DROP POLICY if EXISTS "Users can insert own saved audio versions" ON user_saved_audio_versions;


CREATE POLICY "Users can insert own saved audio versions" ON user_saved_audio_versions FOR insert
WITH
  CHECK (
    (
      user_id = (
        SELECT
          auth.uid ()
      )
    )
  );


-- TABLE: user_saved_audio_versions
DROP POLICY if EXISTS "Users can update own saved audio versions" ON user_saved_audio_versions;


CREATE POLICY "Users can update own saved audio versions" ON user_saved_audio_versions
FOR UPDATE
  USING (
    (
      user_id = (
        SELECT
          auth.uid ()
      )
    )
  );


-- TABLE: user_saved_audio_versions
DROP POLICY if EXISTS "Users can view own saved audio versions" ON user_saved_audio_versions;


CREATE POLICY "Users can view own saved audio versions" ON user_saved_audio_versions FOR
SELECT
  USING (
    (
      user_id = (
        SELECT
          auth.uid ()
      )
    )
  );


-- TABLE: user_saved_image_sets
DROP POLICY if EXISTS "Users can delete their own saved image sets" ON user_saved_image_sets;


CREATE POLICY "Users can delete their own saved image sets" ON user_saved_image_sets FOR delete USING (
  (
    user_id = (
      SELECT
        users.id
      FROM
        users
      WHERE
        (
          users.id = (
            SELECT
              auth.uid ()
          )
        )
    )
  )
);


-- TABLE: user_saved_image_sets
DROP POLICY if EXISTS "Users can insert their own saved image sets" ON user_saved_image_sets;


CREATE POLICY "Users can insert their own saved image sets" ON user_saved_image_sets FOR insert
WITH
  CHECK (
    (
      user_id = (
        SELECT
          users.id
        FROM
          users
        WHERE
          (
            users.id = (
              SELECT
                auth.uid ()
            )
          )
      )
    )
  );


-- TABLE: user_saved_image_sets
DROP POLICY if EXISTS "Users can view their own saved image sets" ON user_saved_image_sets;


CREATE POLICY "Users can view their own saved image sets" ON user_saved_image_sets FOR
SELECT
  USING (
    (
      user_id = (
        SELECT
          users.id
        FROM
          users
        WHERE
          (
            users.id = (
              SELECT
                auth.uid ()
            )
          )
      )
    )
  );


-- TABLE: user_saved_text_versions
DROP POLICY if EXISTS "Users can delete own saved text versions" ON user_saved_text_versions;


CREATE POLICY "Users can delete own saved text versions" ON user_saved_text_versions FOR delete USING (
  (
    user_id = (
      SELECT
        auth.uid ()
    )
  )
);


-- TABLE: user_saved_text_versions
DROP POLICY if EXISTS "Users can insert own saved text versions" ON user_saved_text_versions;


CREATE POLICY "Users can insert own saved text versions" ON user_saved_text_versions FOR insert
WITH
  CHECK (
    (
      user_id = (
        SELECT
          auth.uid ()
      )
    )
  );


-- TABLE: user_saved_text_versions
DROP POLICY if EXISTS "Users can update own saved text versions" ON user_saved_text_versions;


CREATE POLICY "Users can update own saved text versions" ON user_saved_text_versions
FOR UPDATE
  USING (
    (
      user_id = (
        SELECT
          auth.uid ()
      )
    )
  );


-- TABLE: user_saved_text_versions
DROP POLICY if EXISTS "Users can view own saved text versions" ON user_saved_text_versions;


CREATE POLICY "Users can view own saved text versions" ON user_saved_text_versions FOR
SELECT
  USING (
    (
      user_id = (
        SELECT
          auth.uid ()
      )
    )
  );


-- TABLE: user_version_selections
DROP POLICY if EXISTS "Users can delete own version selections" ON user_version_selections;


CREATE POLICY "Users can delete own version selections" ON user_version_selections FOR delete USING (
  (
    user_id = (
      SELECT
        auth.uid ()
    )
  )
);


-- TABLE: user_version_selections
DROP POLICY if EXISTS "Users can insert own version selections" ON user_version_selections;


CREATE POLICY "Users can insert own version selections" ON user_version_selections FOR insert
WITH
  CHECK (
    (
      user_id = (
        SELECT
          auth.uid ()
      )
    )
  );


-- TABLE: user_version_selections
DROP POLICY if EXISTS "Users can update own version selections" ON user_version_selections;


CREATE POLICY "Users can update own version selections" ON user_version_selections
FOR UPDATE
  USING (
    (
      user_id = (
        SELECT
          auth.uid ()
      )
    )
  );


-- TABLE: user_version_selections
DROP POLICY if EXISTS "Users can view own version selections" ON user_version_selections;


CREATE POLICY "Users can view own version selections" ON user_version_selections FOR
SELECT
  USING (
    (
      user_id = (
        SELECT
          auth.uid ()
      )
    )
  );


-- TABLE: users
DROP POLICY if EXISTS "Users can insert own profile" ON users;


CREATE POLICY "Users can insert own profile" ON users FOR insert
WITH
  CHECK (
    (
      (
        SELECT
          auth.uid ()
      ) = id
    )
  );


-- TABLE: users
DROP POLICY if EXISTS "Users can update own profile" ON users;


CREATE POLICY "Users can update own profile" ON users
FOR UPDATE
  USING (
    (
      (
        SELECT
          auth.uid ()
      ) = id
    )
  );


-- TABLE: users
DROP POLICY if EXISTS "Users can view own profile" ON users;


CREATE POLICY "Users can view own profile" ON users FOR
SELECT
  USING (
    (
      (
        SELECT
          auth.uid ()
      ) = id
    )
  );


-- TABLE: users
DROP POLICY if EXISTS users_insert_system_admin ON users;


CREATE POLICY users_insert_system_admin ON users FOR insert
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- TABLE: users
DROP POLICY if EXISTS users_select_base_members ON users;


CREATE POLICY users_select_base_members ON users FOR
SELECT
  USING (
    (
      EXISTS (
        SELECT
          1
        FROM
          (
            user_roles viewer_role
            JOIN user_roles target_role ON (
              (
                (viewer_role.base_id = target_role.base_id)
                AND (viewer_role.base_id IS NOT NULL)
                AND (target_role.base_id IS NOT NULL)
              )
            )
          )
        WHERE
          (
            (
              viewer_role.user_id = (
                SELECT
                  auth.uid ()
              )
            )
            AND (target_role.user_id = users.id)
          )
      )
    )
  );


-- TABLE: users
DROP POLICY if EXISTS users_select_project_members ON users;


CREATE POLICY users_select_project_members ON users FOR
SELECT
  USING (
    (
      EXISTS (
        SELECT
          1
        FROM
          (
            user_roles viewer_role
            JOIN user_roles target_role ON (
              (
                (viewer_role.project_id = target_role.project_id)
                AND (viewer_role.project_id IS NOT NULL)
                AND (target_role.project_id IS NOT NULL)
              )
            )
          )
        WHERE
          (
            (
              viewer_role.user_id = (
                SELECT
                  auth.uid ()
              )
            )
            AND (target_role.user_id = users.id)
          )
      )
    )
  );


-- TABLE: users
DROP POLICY if EXISTS users_select_system_admin ON users;


CREATE POLICY users_select_system_admin ON users FOR
SELECT
  USING (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- TABLE: users
DROP POLICY if EXISTS users_update_base_admin ON users;


CREATE POLICY users_update_base_admin ON users
FOR UPDATE
  USING (
    (
      EXISTS (
        SELECT
          1
        FROM
          (
            (
              user_roles admin_role
              JOIN user_roles target_role ON (
                (
                  (admin_role.base_id = target_role.base_id)
                  AND (admin_role.base_id IS NOT NULL)
                  AND (target_role.base_id IS NOT NULL)
                )
              )
            )
            JOIN role_permissions rp ON ((rp.role_id = admin_role.role_id))
          )
        WHERE
          (
            (
              admin_role.user_id = (
                SELECT
                  auth.uid ()
              )
            )
            AND (target_role.user_id = users.id)
            AND (rp.resource_type = 'base'::resource_type)
            AND (
              rp.permission_key = 'base.manage_roles'::permission_key
            )
            AND (rp.is_allowed = TRUE)
          )
      )
    )
  )
WITH
  CHECK (
    (
      EXISTS (
        SELECT
          1
        FROM
          (
            (
              user_roles admin_role
              JOIN user_roles target_role ON (
                (
                  (admin_role.base_id = target_role.base_id)
                  AND (admin_role.base_id IS NOT NULL)
                  AND (target_role.base_id IS NOT NULL)
                )
              )
            )
            JOIN role_permissions rp ON ((rp.role_id = admin_role.role_id))
          )
        WHERE
          (
            (
              admin_role.user_id = (
                SELECT
                  auth.uid ()
              )
            )
            AND (target_role.user_id = users.id)
            AND (rp.resource_type = 'base'::resource_type)
            AND (
              rp.permission_key = 'base.manage_roles'::permission_key
            )
            AND (rp.is_allowed = TRUE)
          )
      )
    )
  );


-- TABLE: users
DROP POLICY if EXISTS users_update_project_admin ON users;


CREATE POLICY users_update_project_admin ON users
FOR UPDATE
  USING (
    (
      EXISTS (
        SELECT
          1
        FROM
          (
            (
              user_roles admin_role
              JOIN user_roles target_role ON (
                (
                  (admin_role.project_id = target_role.project_id)
                  AND (admin_role.project_id IS NOT NULL)
                  AND (target_role.project_id IS NOT NULL)
                )
              )
            )
            JOIN role_permissions rp ON ((rp.role_id = admin_role.role_id))
          )
        WHERE
          (
            (
              admin_role.user_id = (
                SELECT
                  auth.uid ()
              )
            )
            AND (target_role.user_id = users.id)
            AND (rp.resource_type = 'project'::resource_type)
            AND (
              rp.permission_key = 'project.manage_roles'::permission_key
            )
            AND (rp.is_allowed = TRUE)
          )
      )
    )
  )
WITH
  CHECK (
    (
      EXISTS (
        SELECT
          1
        FROM
          (
            (
              user_roles admin_role
              JOIN user_roles target_role ON (
                (
                  (admin_role.project_id = target_role.project_id)
                  AND (admin_role.project_id IS NOT NULL)
                  AND (target_role.project_id IS NOT NULL)
                )
              )
            )
            JOIN role_permissions rp ON ((rp.role_id = admin_role.role_id))
          )
        WHERE
          (
            (
              admin_role.user_id = (
                SELECT
                  auth.uid ()
              )
            )
            AND (target_role.user_id = users.id)
            AND (rp.resource_type = 'project'::resource_type)
            AND (
              rp.permission_key = 'project.manage_roles'::permission_key
            )
            AND (rp.is_allowed = TRUE)
          )
      )
    )
  );


-- TABLE: users
DROP POLICY if EXISTS users_update_system_admin ON users;


CREATE POLICY users_update_system_admin ON users
FOR UPDATE
  USING (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  )
WITH
  CHECK (
    has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- TABLE: verse_feedback
DROP POLICY if EXISTS verse_feedback_delete ON verse_feedback;


CREATE POLICY verse_feedback_delete ON verse_feedback FOR delete USING (
  (
    EXISTS (
      SELECT
        1
      FROM
        media_files mf
      WHERE
        (
          (mf.id = verse_feedback.media_files_id)
          AND (
            has_permission (
              (
                SELECT
                  auth.uid ()
              ),
              'verse_feedback.delete'::permission_key,
              'project'::resource_type,
              mf.project_id
            )
            OR has_permission (
              (
                SELECT
                  auth.uid ()
              ),
              'project.delete'::permission_key,
              'project'::resource_type,
              mf.project_id
            )
          )
        )
    )
  )
);


-- TABLE: verse_feedback
DROP POLICY if EXISTS verse_feedback_insert ON verse_feedback;


CREATE POLICY verse_feedback_insert ON verse_feedback FOR insert
WITH
  CHECK (
    (
      (
        created_by = (
          SELECT
            auth.uid ()
        )
      )
      AND (
        EXISTS (
          SELECT
            1
          FROM
            (
              media_files mf
              JOIN audio_versions av ON ((av.id = mf.audio_version_id))
            )
          WHERE
            (
              (mf.id = verse_feedback.media_files_id)
              AND (
                has_permission (
                  (
                    SELECT
                      auth.uid ()
                  ),
                  'verse_feedback.write'::permission_key,
                  'project'::resource_type,
                  av.project_id
                )
                OR has_permission (
                  (
                    SELECT
                      auth.uid ()
                  ),
                  'project.write'::permission_key,
                  'project'::resource_type,
                  av.project_id
                )
              )
            )
        )
      )
    )
  );


-- TABLE: verse_feedback
DROP POLICY if EXISTS verse_feedback_select ON verse_feedback;


CREATE POLICY verse_feedback_select ON verse_feedback FOR
SELECT
  USING (
    (
      EXISTS (
        SELECT
          1
        FROM
          media_files mf
        WHERE
          (
            (mf.id = verse_feedback.media_files_id)
            AND (
              has_permission (
                (
                  SELECT
                    auth.uid ()
                ),
                'verse_feedback.read'::permission_key,
                'project'::resource_type,
                mf.project_id
              )
              OR has_permission (
                (
                  SELECT
                    auth.uid ()
                ),
                'project.read'::permission_key,
                'project'::resource_type,
                mf.project_id
              )
            )
          )
      )
    )
  );


-- TABLE: verse_feedback
DROP POLICY if EXISTS verse_feedback_update ON verse_feedback;


CREATE POLICY verse_feedback_update ON verse_feedback
FOR UPDATE
  USING (
    (
      EXISTS (
        SELECT
          1
        FROM
          media_files mf
        WHERE
          (
            (mf.id = verse_feedback.media_files_id)
            AND (
              has_permission (
                (
                  SELECT
                    auth.uid ()
                ),
                'verse_feedback.write'::permission_key,
                'project'::resource_type,
                mf.project_id
              )
              OR has_permission (
                (
                  SELECT
                    auth.uid ()
                ),
                'project.write'::permission_key,
                'project'::resource_type,
                mf.project_id
              )
            )
          )
      )
    )
  )
WITH
  CHECK (
    (
      EXISTS (
        SELECT
          1
        FROM
          media_files mf
        WHERE
          (
            (mf.id = verse_feedback.media_files_id)
            AND (
              has_permission (
                (
                  SELECT
                    auth.uid ()
                ),
                'verse_feedback.write'::permission_key,
                'project'::resource_type,
                mf.project_id
              )
              OR has_permission (
                (
                  SELECT
                    auth.uid ()
                ),
                'project.write'::permission_key,
                'project'::resource_type,
                mf.project_id
              )
            )
          )
      )
    )
  );


-- TABLE: verse_listens
DROP POLICY if EXISTS "Users can insert their own verse listens" ON verse_listens;


CREATE POLICY "Users can insert their own verse listens" ON verse_listens FOR insert
WITH
  CHECK (
    (
      user_id = (
        SELECT
          auth.uid ()
      )
    )
  );


-- TABLE: verse_listens
DROP POLICY if EXISTS "Users can update their own verse listens" ON verse_listens;


CREATE POLICY "Users can update their own verse listens" ON verse_listens
FOR UPDATE
  USING (
    (
      (
        SELECT
          auth.uid ()
      ) = user_id
    )
  )
WITH
  CHECK (
    (
      (
        SELECT
          auth.uid ()
      ) = user_id
    )
  );


-- TABLE: verse_listens
DROP POLICY if EXISTS "Users can view their own verse listens" ON verse_listens;


CREATE POLICY "Users can view their own verse listens" ON verse_listens FOR
SELECT
  USING (
    (
      (
        SELECT
          auth.uid ()
      ) = user_id
    )
  );


-- TABLE: verse_texts
DROP POLICY if EXISTS verse_texts_del_with_project_delete ON verse_texts;


CREATE POLICY verse_texts_del_with_project_delete ON verse_texts FOR delete USING (
  (
    EXISTS (
      SELECT
        1
      FROM
        text_versions tv
      WHERE
        (
          (tv.id = verse_texts.text_version_id)
          AND has_permission (
            (
              SELECT
                auth.uid ()
            ),
            'project.delete'::permission_key,
            'project'::resource_type,
            tv.project_id
          )
        )
    )
  )
);


-- TABLE: verse_texts
DROP POLICY if EXISTS verse_texts_ins_with_project_write ON verse_texts;


CREATE POLICY verse_texts_ins_with_project_write ON verse_texts FOR insert
WITH
  CHECK (
    (
      (
        created_by = (
          SELECT
            auth.uid ()
        )
      )
      AND (
        EXISTS (
          SELECT
            1
          FROM
            text_versions tv
          WHERE
            (
              (tv.id = verse_texts.text_version_id)
              AND has_permission (
                (
                  SELECT
                    auth.uid ()
                ),
                'project.write'::permission_key,
                'project'::resource_type,
                tv.project_id
              )
            )
        )
      )
    )
  );


-- TABLE: verse_texts
DROP POLICY if EXISTS verse_texts_select_inherit_project ON verse_texts;


CREATE POLICY verse_texts_select_inherit_project ON verse_texts FOR
SELECT
  USING (
    (
      EXISTS (
        SELECT
          1
        FROM
          text_versions tv
        WHERE
          (
            (tv.id = verse_texts.text_version_id)
            AND (
              (tv.publish_status = 'published'::publish_status)
              OR has_permission (
                (
                  SELECT
                    auth.uid ()
                ),
                'project.read'::permission_key,
                'project'::resource_type,
                tv.project_id
              )
            )
          )
      )
    )
  );


-- TABLE: verse_texts
DROP POLICY if EXISTS verse_texts_upd_with_project_write ON verse_texts;


CREATE POLICY verse_texts_upd_with_project_write ON verse_texts
FOR UPDATE
  USING (
    (
      EXISTS (
        SELECT
          1
        FROM
          text_versions tv
        WHERE
          (
            (tv.id = verse_texts.text_version_id)
            AND has_permission (
              (
                SELECT
                  auth.uid ()
              ),
              'project.write'::permission_key,
              'project'::resource_type,
              tv.project_id
            )
          )
      )
    )
  )
WITH
  CHECK (
    (
      EXISTS (
        SELECT
          1
        FROM
          text_versions tv
        WHERE
          (
            (tv.id = verse_texts.text_version_id)
            AND has_permission (
              (
                SELECT
                  auth.uid ()
              ),
              'project.write'::permission_key,
              'project'::resource_type,
              tv.project_id
            )
          )
      )
    )
  );

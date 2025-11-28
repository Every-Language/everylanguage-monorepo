-- Add SECURITY DEFINER to helper functions that query RLS-protected tables
-- These functions need to bypass RLS when called from RLS policies to prevent infinite recursion
-- and to allow proper permission checking
-- Update check_project_permission function to add SECURITY DEFINER
-- This function queries RLS-protected tables (user_roles, role_permissions, bases_projects, partner_orgs_projects view)
-- and is called from has_permission which is called from RLS policies
CREATE OR REPLACE FUNCTION public.check_project_permission (
  p_user_id UUID,
  p_action permission_key,
  p_project_id UUID
) returns BOOLEAN language plpgsql stable security definer
SET
  search_path = public,
  pg_temp AS $$
BEGIN
  -- 1) Direct role on project
  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.context_type = 'project'
      AND ur.context_id::UUID = p_project_id
      AND rp.resource_type = 'project'::resource_type
      AND rp.permission_key = p_action
      AND rp.is_allowed = true
    LIMIT 1
  ) THEN
    RETURN true;
  END IF;

  -- 2) Base-project inheritance
  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur_base
    JOIN public.bases_projects bp
      ON ur_base.context_id::UUID = bp.base_id
     AND bp.project_id = p_project_id
     AND bp.unassigned_at IS NULL
    JOIN public.role_permissions rp ON rp.role_id = ur_base.role_id
    WHERE ur_base.user_id = p_user_id
      AND ur_base.context_type = 'base'
      AND rp.resource_type = 'project'::resource_type
      AND rp.permission_key = p_action
      AND rp.is_allowed = true
    LIMIT 1
  ) THEN
    RETURN true;
  END IF;

  -- 3) Partner-project inheritance
  -- Note: partner_orgs_projects view already filters to active allocations only
  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur_partner
    JOIN public.partner_orgs_projects pop
      ON ur_partner.context_id::UUID = pop.partner_org_id
     AND pop.project_id = p_project_id
    JOIN public.role_permissions rp ON rp.role_id = ur_partner.role_id
    WHERE ur_partner.user_id = p_user_id
      AND ur_partner.context_type = 'partner'
      AND rp.resource_type = 'project'::resource_type
      AND rp.permission_key = p_action
      AND rp.is_allowed = true
    LIMIT 1
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;


-- Update resolve_project_id function to add SECURITY DEFINER
-- This function queries RLS-protected tables and is called from has_permission
-- which is called from RLS policies
CREATE OR REPLACE FUNCTION public.resolve_project_id (p_table_name TEXT, p_record_id UUID) returns UUID language plpgsql stable security definer
SET
  search_path = public,
  pg_temp AS $$
DECLARE
  v_project_id UUID;
BEGIN
  CASE p_table_name
    WHEN 'projects' THEN
      SELECT id INTO v_project_id FROM public.projects WHERE id = p_record_id;
    
    WHEN 'audio_versions' THEN
      SELECT project_id INTO v_project_id FROM public.audio_versions WHERE id = p_record_id;
    
    WHEN 'text_versions' THEN
      SELECT project_id INTO v_project_id FROM public.text_versions WHERE id = p_record_id;
    
    WHEN 'sequences' THEN
      SELECT project_id INTO v_project_id FROM public.sequences WHERE id = p_record_id;
    
    WHEN 'project_updates' THEN
      SELECT project_id INTO v_project_id FROM public.project_updates WHERE id = p_record_id;
    
    WHEN 'media_files' THEN
      SELECT av.project_id INTO v_project_id 
      FROM public.media_files mf
      JOIN public.audio_versions av ON av.id = mf.audio_version_id
      WHERE mf.id = p_record_id;
    
    WHEN 'media_files_verses' THEN
      SELECT av.project_id INTO v_project_id
      FROM public.media_files_verses mfv
      JOIN public.media_files mf ON mf.id = mfv.media_file_id
      JOIN public.audio_versions av ON av.id = mf.audio_version_id
      WHERE mfv.id = p_record_id;
    
    WHEN 'verse_texts' THEN
      SELECT tv.project_id INTO v_project_id
      FROM public.verse_texts vt
      JOIN public.text_versions tv ON tv.id = vt.text_version_id
      WHERE vt.id = p_record_id;
    
    WHEN 'project_updates_media' THEN
      SELECT pu.project_id INTO v_project_id
      FROM public.project_updates_media pum
      JOIN public.project_updates pu ON pu.id = pum.project_update_id
      WHERE pum.id = p_record_id;
    
    WHEN 'sequences_segments' THEN
      SELECT s.project_id INTO v_project_id
      FROM public.sequences_segments ss
      JOIN public.sequences s ON s.id = ss.sequence_id
      WHERE ss.id = p_record_id;
    
    WHEN 'verse_feedback' THEN
      SELECT av.project_id INTO v_project_id
      FROM public.verse_feedback vf
      JOIN public.media_files mf ON mf.id = vf.media_files_id
      JOIN public.audio_versions av ON av.id = mf.audio_version_id
      WHERE vf.id = p_record_id;
    
    WHEN 'segments' THEN
      -- Segments don't have direct project_id, need to resolve through sequences_segments
      SELECT s.project_id INTO v_project_id
      FROM public.segments seg
      JOIN public.sequences_segments ss ON ss.segment_id = seg.id
      JOIN public.sequences s ON s.id = ss.sequence_id
      WHERE seg.id = p_record_id
      LIMIT 1;
    
    ELSE
      RETURN NULL;
  END CASE;
  
  RETURN v_project_id;
END;
$$;

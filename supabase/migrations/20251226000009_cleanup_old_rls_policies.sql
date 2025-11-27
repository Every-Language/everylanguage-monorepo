-- Cleanup old RLS policies that conflict with new has_permission-based policies
-- These policies use old patterns like "Users can insert", "Users can update own", etc.
-- and have been replaced by has_permission-based policies in migration 20251226000008
-- Project domain tables - remove old ownership-based policies
DROP POLICY if EXISTS "Users can insert audio_versions" ON public.audio_versions;


DROP POLICY if EXISTS "Users can update own audio_versions" ON public.audio_versions;


DROP POLICY if EXISTS "Users can view audio_versions" ON public.audio_versions;


DROP POLICY if EXISTS "Users can insert their own text_versions" ON public.text_versions;


DROP POLICY if EXISTS "Users can update own text_versions" ON public.text_versions;


DROP POLICY if EXISTS "Users can view text_versions" ON public.text_versions;


DROP POLICY if EXISTS "All users can view text_versions" ON public.text_versions;


DROP POLICY if EXISTS "Users can insert their own media_files" ON public.media_files;


DROP POLICY if EXISTS "Users can update own media_files" ON public.media_files;


DROP POLICY if EXISTS "Users can view media_files" ON public.media_files;


DROP POLICY if EXISTS "All users can view media_files" ON public.media_files;


DROP POLICY if EXISTS "Users can insert their own media_files_verses" ON public.media_files_verses;


DROP POLICY if EXISTS "Users can update own media_files_verses" ON public.media_files_verses;


DROP POLICY if EXISTS "Users can view media_files_verses" ON public.media_files_verses;


DROP POLICY if EXISTS "All users can view media_files_verses" ON public.media_files_verses;


DROP POLICY if EXISTS "Users can insert their own verse_texts" ON public.verse_texts;


DROP POLICY if EXISTS "Users can insert verse_texts" ON public.verse_texts;


DROP POLICY if EXISTS "Users can update own verse_texts" ON public.verse_texts;


DROP POLICY if EXISTS "Users can view verse_texts" ON public.verse_texts;


DROP POLICY if EXISTS "Users can delete own verse_texts" ON public.verse_texts;


DROP POLICY if EXISTS "Users can insert their own verse_feedback" ON public.verse_feedback;


DROP POLICY if EXISTS "Users can insert verse_feedback" ON public.verse_feedback;


DROP POLICY if EXISTS "Users can update own verse_feedback" ON public.verse_feedback;


DROP POLICY if EXISTS "Users can view verse_feedback" ON public.verse_feedback;


DROP POLICY if EXISTS "Users can delete own verse_feedback" ON public.verse_feedback;


DROP POLICY if EXISTS "All users can view verse_feedback" ON public.verse_feedback;


DROP POLICY if EXISTS "Users can insert projects" ON public.projects;


DROP POLICY if EXISTS "Users can update own projects" ON public.projects;


DROP POLICY if EXISTS "All users can view projects" ON public.projects;


DROP POLICY if EXISTS "Users can insert their own segments" ON public.segments;


DROP POLICY if EXISTS "Users can update own segments" ON public.segments;


DROP POLICY if EXISTS "Users can view segments" ON public.segments;


DROP POLICY if EXISTS "Users can insert their own sequences" ON public.sequences;


DROP POLICY if EXISTS "Users can update own sequences" ON public.sequences;


DROP POLICY if EXISTS "Users can view sequences" ON public.sequences;


DROP POLICY if EXISTS "Users can delete own sequences" ON public.sequences;


DROP POLICY if EXISTS "Users can insert their own sequences_segments" ON public.sequences_segments;


DROP POLICY if EXISTS "Users can update own sequences_segments" ON public.sequences_segments;


DROP POLICY if EXISTS "Users can view sequences_segments" ON public.sequences_segments;


DROP POLICY if EXISTS "Users can delete own sequences_segments" ON public.sequences_segments;


-- Policies on dropped tables (should not exist, but cleaning up just in case)
DROP POLICY if EXISTS "bases_teams_delete_with_manage" ON public.bases_teams;


DROP POLICY if EXISTS "bases_teams_insert_with_manage" ON public.bases_teams;


DROP POLICY if EXISTS "bases_teams_select_public" ON public.bases_teams;


DROP POLICY if EXISTS "bases_teams_update_with_manage" ON public.bases_teams;


DROP POLICY if EXISTS "projects_teams_delete_with_manage" ON public.projects_teams;


DROP POLICY if EXISTS "projects_teams_insert_with_manage" ON public.projects_teams;


DROP POLICY if EXISTS "projects_teams_select_public" ON public.projects_teams;


DROP POLICY if EXISTS "projects_teams_update_with_manage" ON public.projects_teams;


DROP POLICY if EXISTS "teams_delete_with_permission" ON public.teams;


DROP POLICY if EXISTS "teams_insert_with_permission" ON public.teams;


DROP POLICY if EXISTS "teams_select_public" ON public.teams;


DROP POLICY if EXISTS "teams_update_with_permission" ON public.teams;


-- Tags and related tables (dropped)
DROP POLICY if EXISTS "Users can insert tags" ON public.tags;


DROP POLICY if EXISTS "Users can insert their own tags" ON public.tags;


DROP POLICY if EXISTS "Users can update own tags" ON public.tags;


DROP POLICY if EXISTS "Users can view tags" ON public.tags;


DROP POLICY if EXISTS "Users can delete own tags" ON public.tags;


DROP POLICY if EXISTS "All users can view tags" ON public.tags;


DROP POLICY if EXISTS "tags_delete_own" ON public.tags;


DROP POLICY if EXISTS "tags_insert_own" ON public.tags;


DROP POLICY if EXISTS "tags_select_linked_to_project_media" ON public.tags;


DROP POLICY if EXISTS "tags_update_own" ON public.tags;


DROP POLICY if EXISTS "Users can delete own media_files_tags" ON public.media_files_tags;


DROP POLICY if EXISTS "Users can insert their own media_files_tags" ON public.media_files_tags;


DROP POLICY if EXISTS "Users can update own media_files_tags" ON public.media_files_tags;


DROP POLICY if EXISTS "Users can view media_files_tags" ON public.media_files_tags;


DROP POLICY if EXISTS "All users can view media_files_tags" ON public.media_files_tags;


DROP POLICY if EXISTS "media_files_tags_del_with_project_delete" ON public.media_files_tags;


DROP POLICY if EXISTS "media_files_tags_ins_with_project_write" ON public.media_files_tags;


DROP POLICY if EXISTS "media_files_tags_select_inherit_project" ON public.media_files_tags;


DROP POLICY if EXISTS "media_files_tags_upd_with_project_write" ON public.media_files_tags;


DROP POLICY if EXISTS "Users can delete own media_files_targets" ON public.media_files_targets;


DROP POLICY if EXISTS "Users can insert their own media_files_targets" ON public.media_files_targets;


DROP POLICY if EXISTS "Users can update own media_files_targets" ON public.media_files_targets;


DROP POLICY if EXISTS "Users can view media_files_targets" ON public.media_files_targets;


DROP POLICY if EXISTS "All users can view media_files_targets" ON public.media_files_targets;


DROP POLICY if EXISTS "media_files_targets_del_with_project_delete" ON public.media_files_targets;


DROP POLICY if EXISTS "media_files_targets_ins_with_project_write" ON public.media_files_targets;


DROP POLICY if EXISTS "media_files_targets_select_inherit_project" ON public.media_files_targets;


DROP POLICY if EXISTS "media_files_targets_upd_with_project_write" ON public.media_files_targets;


DROP POLICY if EXISTS "Users can delete own segments_targets" ON public.segments_targets;


DROP POLICY if EXISTS "Users can insert their own segments_targets" ON public.segments_targets;


DROP POLICY if EXISTS "Users can update own segments_targets" ON public.segments_targets;


DROP POLICY if EXISTS "Users can view segments_targets" ON public.segments_targets;


DROP POLICY if EXISTS "Users can delete own sequences_tags" ON public.sequences_tags;


DROP POLICY if EXISTS "Users can insert their own sequences_tags" ON public.sequences_tags;


DROP POLICY if EXISTS "Users can update own sequences_tags" ON public.sequences_tags;


DROP POLICY if EXISTS "Users can view sequences_tags" ON public.sequences_tags;


DROP POLICY if EXISTS "Users can insert their own sequences_targets" ON public.sequences_targets;


DROP POLICY if EXISTS "Users can update own sequences_targets" ON public.sequences_targets;


DROP POLICY if EXISTS "Users can view sequences_targets" ON public.sequences_targets;


-- Old project_updates policy that referenced visibility column (now uses publish_status)
DROP POLICY if EXISTS "Anyone can view public project updates" ON public.project_updates;


-- user_roles policies that reference 'team' context (should have been removed in migration 20251226000004)
-- Note: These may still exist in remote if migration hasn't run yet
DROP POLICY if EXISTS "user_roles_delete_with_manage" ON public.user_roles;


DROP POLICY if EXISTS "user_roles_insert_with_manage" ON public.user_roles;


DROP POLICY if EXISTS "user_roles_select_self_or_manager" ON public.user_roles;


DROP POLICY if EXISTS "user_roles_update_with_manage" ON public.user_roles;

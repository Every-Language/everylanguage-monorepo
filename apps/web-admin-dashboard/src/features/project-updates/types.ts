import type { Database } from '@everylanguage/shared-types';

export type ProjectUpdateRow =
  Database['public']['Tables']['project_updates']['Row'];
export type ProjectUpdateInsert =
  Database['public']['Tables']['project_updates']['Insert'];
export type ProjectUpdateUpdate =
  Database['public']['Tables']['project_updates']['Update'];

export type ProjectUpdateMediaRow =
  Database['public']['Tables']['project_updates_media']['Row'];
export type ProjectUpdateMediaInsert =
  Database['public']['Tables']['project_updates_media']['Insert'];

export interface ProjectUpdateMedia {
  id: string;
  media_type: 'image' | 'video';
  object_key: string;
  original_filename: string | null;
  display_order: number;
  thumbnail_object_key: string | null;
}

export interface ProjectUpdateWithProject extends ProjectUpdateRow {
  project?: {
    id: string;
    name: string;
    target_language_entity_id: string | null;
    target_language?: {
      id: string;
      name: string;
    } | null;
    region?: {
      id: string;
      name: string;
    } | null;
  } | null;
  media?: ProjectUpdateMedia[];
}

export interface CreateProjectUpdateData {
  project_id: string;
  title: string;
  body: string;
  publish_status: Database['public']['Enums']['publish_status'];
  created_by?: string | null;
}

export interface UpdateProjectUpdateData {
  title: string;
  body: string;
  publish_status: Database['public']['Enums']['publish_status'];
}

export interface ProjectUpdateFilters {
  publishStatus?: 'pending' | 'published' | 'all';
  projectId?: string;
  page?: number;
  pageSize?: number;
}

export interface ProjectForSelector {
  id: string;
  name: string;
  target_language_entity_id: string | null;
  target_language?: {
    id: string;
    name: string;
  } | null;
  region?: {
    id: string;
    name: string;
  } | null;
}

export interface MediaFileWithPreview {
  file: File;
  preview?: string;
  mediaType: 'image' | 'video';
  displayOrder: number;
  caption?: string;
  durationSeconds?: number;
}

export interface CreateProjectUpdateMediaData {
  project_update_id: string;
  media_type: 'image' | 'video';
  object_key: string;
  storage_provider?: string;
  original_filename?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  caption?: string | null;
  display_order?: number;
  duration_seconds?: number | null;
  thumbnail_object_key?: string | null;
  created_by?: string | null;
}

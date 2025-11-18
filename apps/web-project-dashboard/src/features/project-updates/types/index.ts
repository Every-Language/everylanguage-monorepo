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
export type ProjectUpdateMediaUpdate =
  Database['public']['Tables']['project_updates_media']['Update'];

export interface ProjectUpdateWithRelations extends ProjectUpdateRow {
  project?: {
    id: string;
    name: string;
    target_language_entity_id: string | null;
    language_entity?: {
      id: string;
      name: string;
    } | null;
  } | null;
  media?: ProjectUpdateMediaRow[];
  creator?: {
    id: string;
    full_name: string | null;
  } | null;
}

export interface CreateProjectUpdateData {
  project_id: string;
  title: string;
  body: string;
  created_by?: string | null;
  visibility?: Database['public']['Enums']['update_visibility'];
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

export interface MediaFileWithPreview {
  file: File;
  preview?: string;
  caption?: string;
  displayOrder: number;
  mediaType: 'image' | 'video';
  durationSeconds?: number;
}

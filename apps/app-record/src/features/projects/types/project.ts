/**
 * Project type definition
 *
 * Represents a project from the PowerSync local database.
 */
export interface Project {
  id: string;
  name: string;
  description: string | null;
  source_language_name: string | null;
  target_language_name: string | null;
  region_name: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Form data for creating a new project
 */
export interface CreateProjectFormData {
  name: string;
  description: string;
  source_language_entity_id: string | null;
  source_language_name: string | null;
  target_language_entity_id: string | null;
  target_language_name: string | null;
  region_id: string | null;
  region_name: string | null;
}

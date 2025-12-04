/**
 * Centralized types for Partner Orgs feature
 * Extracted from hooks and used across components and pages
 */

/**
 * Partner Organization Project
 */
export interface PartnerOrgProject {
  partner_org_id: string;
  project_id: string;
  project_name: string;
  project_description: string | null;
  language_entity_id: string;
  language_name: string;
}

/**
 * Donation Allocation
 */
export interface DonationAllocation {
  id: string;
  amount_cents: number;
  currency_code: string;
  project_id: string | null;
  operation_id: string | null;
  effective_from: string;
  effective_to: string | null;
  notes: string | null;
  project?: {
    id: string;
    name: string;
    target_language_entity_id: string;
    language_entity?: {
      id: string;
      name: string;
    };
  } | null;
  operation?: {
    id: string;
    name: string;
    category: string;
  } | null;
}

/**
 * Partner Organization Donation
 */
export interface PartnerOrgDonation {
  id: string;
  amount_cents: number;
  currency_code: string;
  status: string;
  intent_type: string;
  intent_language_entity_id: string | null;
  intent_region_id: string | null;
  intent_operation_id: string | null;
  payment_method: string;
  is_recurring: boolean;
  created_at: string;
  completed_at: string | null;
  user_id: string | null;
  partner_org_id: string | null;
  intent_language?: {
    id: string;
    name: string;
  } | null;
  intent_region?: {
    id: string;
    name: string;
  } | null;
  intent_operation?: {
    id: string;
    name: string;
  } | null;
  subscription?: {
    id: string;
    status: string;
    stripe_subscription_id: string;
  } | null;
  donation_allocations: DonationAllocation[];
  isFromCurrentUser: boolean;
}

/**
 * Partner Organization Member
 */
export interface PartnerOrgMember {
  user_id: string;
  role_id: string;
  user: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    full_name: string | null;
  } | null;
  role: {
    id: string;
    name: string;
    role_key: string;
    resource_type: string;
  } | null;
}

/**
 * Partner Organization Update
 * Only manually created project_updates are included
 */
export interface PartnerOrgUpdate {
  id: string;
  type: 'project_update';
  timestamp: string;
  project_id: string;
  project_name?: string;
  language_name?: string;
  title: string;
  body: string;
  media_keys?: string[];
  project?: {
    id: string;
    name: string;
    language_entity?: {
      id: string;
      name: string;
    };
  } | null;
  media?: Array<{
    id: string;
    media_type: string;
    object_key: string;
    original_filename: string | null;
    caption: string | null;
    display_order?: number;
  }>;
  creator?: {
    id: string;
    full_name: string | null;
  } | null;
}

/**
 * Project Update
 */
export interface ProjectUpdate {
  id: string;
  project_id: string;
  title: string;
  body: string;
  created_at: string;
  project?: {
    id: string;
    name: string;
    target_language_entity_id: string;
    language_entity?: {
      id: string;
      name: string;
    };
  } | null;
  media?: Array<{
    id: string;
    media_type: string;
    object_key: string;
    storage_provider?: string;
    original_filename: string | null;
    file_type?: string;
    caption: string | null;
    display_order: number;
    duration_seconds?: number;
    thumbnail_object_key?: string;
  }>;
  creator?: {
    id: string;
    full_name: string | null;
  } | null;
  [key: string]: unknown;
}

/**
 * Progress Summary (from database views)
 */
export interface ProgressSummary {
  chapters_with_audio?: number;
  complete_chapters?: number;
  total_chapters: number;
  books_complete: number;
  total_books: number;
  covered_verses: number;
  total_verses: number;
}

/**
 * Project Version (audio or text)
 */
export interface ProjectVersion {
  id: string;
  name: string;
  language_entity_id: string | null;
  project_id: string | null;
  version_type: 'audio' | 'text';
  progress_summary: ProgressSummary[];
}

/**
 * Computed Progress Stats
 */
export interface ProgressStats {
  totalBooksDone: number;
  totalBooks: number;
  totalChaptersDone: number;
  totalChapters: number;
  progressPercentage: number;
}

/**
 * Project Progress Result (with computed stats)
 */
export interface ProjectProgressResult {
  versions: ProjectVersion[];
  stats: ProgressStats;
}

/**
 * Book Progress
 */
export interface BookProgress {
  audio_version_id: string;
  book_id: string;
  chapters_with_audio: number;
  total_chapters: number;
  book: {
    id: string;
    name: string;
    global_order: number;
    testament: string | null;
  };
}

/**
 * Distribution Heatmap Data
 */
export interface DistributionHeatmapData {
  heatmap: Array<{
    language_entity_id: string;
    latitude: number;
    longitude: number;
    listen_count: number;
    [key: string]: unknown;
  }>;
}

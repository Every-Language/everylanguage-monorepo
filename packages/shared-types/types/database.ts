export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_downloads: {
        Row: {
          app_version: string
          continent_code: string | null
          country_code: string | null
          device_id: string
          downloaded_at: string | null
          id: string
          location: unknown
          origin_share_id: string | null
          os: string | null
          os_version: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          region_code: string | null
          user_id: string | null
        }
        Insert: {
          app_version: string
          continent_code?: string | null
          country_code?: string | null
          device_id: string
          downloaded_at?: string | null
          id?: string
          location?: unknown
          origin_share_id?: string | null
          os?: string | null
          os_version?: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          region_code?: string | null
          user_id?: string | null
        }
        Update: {
          app_version?: string
          continent_code?: string | null
          country_code?: string | null
          device_id?: string
          downloaded_at?: string | null
          id?: string
          location?: unknown
          origin_share_id?: string | null
          os?: string | null
          os_version?: string | null
          platform?: Database["public"]["Enums"]["platform_type"]
          region_code?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_downloads_origin_share_id_fkey"
            columns: ["origin_share_id"]
            isOneToOne: false
            referencedRelation: "shares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_downloads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_versions: {
        Row: {
          bible_version_id: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          id: string
          language_entity_id: string
          name: string
          project_id: string | null
          publish_status: Database["public"]["Enums"]["publish_status"]
          updated_at: string | null
        }
        Insert: {
          bible_version_id: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          language_entity_id: string
          name: string
          project_id?: string | null
          publish_status?: Database["public"]["Enums"]["publish_status"]
          updated_at?: string | null
        }
        Update: {
          bible_version_id?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          language_entity_id?: string
          name?: string
          project_id?: string | null
          publish_status?: Database["public"]["Enums"]["publish_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audio_versions_bible_version_id_fkey"
            columns: ["bible_version_id"]
            isOneToOne: false
            referencedRelation: "bible_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_versions_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_versions_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
          {
            foreignKeyName: "audio_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bases: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_public: boolean
          location: unknown
          name: string
          region_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_public?: boolean
          location?: unknown
          name: string
          region_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_public?: boolean
          location?: unknown
          name?: string
          region_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bases_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "mv_region_stats"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "bases_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "region_funding"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "bases_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      bases_projects: {
        Row: {
          assigned_at: string
          base_id: string
          id: string
          project_id: string
          unassigned_at: string | null
        }
        Insert: {
          assigned_at?: string
          base_id: string
          id?: string
          project_id: string
          unassigned_at?: string | null
        }
        Update: {
          assigned_at?: string
          base_id?: string
          id?: string
          project_id?: string
          unassigned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bases_projects_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bases_projects_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "user_bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bases_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bases_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bible_translation_overrides: {
        Row: {
          coverage: Database["public"]["Enums"]["scripture_coverage"]
          created_at: string
          created_by: string | null
          deleted_at: string | null
          external_url: string | null
          id: string
          is_audio: boolean
          is_text: boolean
          language_entity_id: string
          notes: string | null
          nt_books_completed: number | null
          ot_books_completed: number | null
          source: string | null
          updated_at: string
          version_name: string
          year_completed: string | null
        }
        Insert: {
          coverage?: Database["public"]["Enums"]["scripture_coverage"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          external_url?: string | null
          id?: string
          is_audio?: boolean
          is_text?: boolean
          language_entity_id: string
          notes?: string | null
          nt_books_completed?: number | null
          ot_books_completed?: number | null
          source?: string | null
          updated_at?: string
          version_name: string
          year_completed?: string | null
        }
        Update: {
          coverage?: Database["public"]["Enums"]["scripture_coverage"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          external_url?: string | null
          id?: string
          is_audio?: boolean
          is_text?: boolean
          language_entity_id?: string
          notes?: string | null
          nt_books_completed?: number | null
          ot_books_completed?: number | null
          source?: string | null
          updated_at?: string
          version_name?: string
          year_completed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bible_translation_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bible_translation_overrides_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bible_translation_overrides_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
        ]
      }
      bible_versions: {
        Row: {
          created_at: string | null
          id: string
          name: string
          structure_notes: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          name: string
          structure_notes?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          structure_notes?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      books: {
        Row: {
          bible_version_id: string
          book_number: number
          created_at: string | null
          global_order: number | null
          id: string
          name: string
          testament: Database["public"]["Enums"]["testament"] | null
          updated_at: string | null
        }
        Insert: {
          bible_version_id: string
          book_number: number
          created_at?: string | null
          global_order?: number | null
          id: string
          name: string
          testament?: Database["public"]["Enums"]["testament"] | null
          updated_at?: string | null
        }
        Update: {
          bible_version_id?: string
          book_number?: number
          created_at?: string | null
          global_order?: number | null
          id?: string
          name?: string
          testament?: Database["public"]["Enums"]["testament"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "books_bible_version_id_fkey"
            columns: ["bible_version_id"]
            isOneToOne: false
            referencedRelation: "bible_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_listens: {
        Row: {
          chapter_id: string
          id: string
          language_entity_id: string
          listened_at: string | null
          origin_share_id: string | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          chapter_id: string
          id?: string
          language_entity_id: string
          listened_at?: string | null
          origin_share_id?: string | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          chapter_id?: string
          id?: string
          language_entity_id?: string
          listened_at?: string | null
          origin_share_id?: string | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapter_listens_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_listens_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_listens_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
          {
            foreignKeyName: "chapter_listens_origin_share_id_fkey"
            columns: ["origin_share_id"]
            isOneToOne: false
            referencedRelation: "shares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_listens_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_listens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          book_id: string
          chapter_number: number
          created_at: string | null
          global_order: number | null
          id: string
          total_verses: number
          updated_at: string | null
        }
        Insert: {
          book_id: string
          chapter_number: number
          created_at?: string | null
          global_order?: number | null
          id: string
          total_verses: number
          updated_at?: string | null
        }
        Update: {
          book_id?: string
          chapter_number?: number
          created_at?: string | null
          global_order?: number | null
          id?: string
          total_verses?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapters_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "audio_version_book_progress"
            referencedColumns: ["book_id"]
          },
          {
            foreignKeyName: "chapters_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      donation_allocations: {
        Row: {
          amount_cents: number
          created_at: string
          created_by: string
          currency_code: string
          donation_id: string
          effective_from: string
          effective_to: string | null
          id: string
          notes: string | null
          operation_id: string | null
          project_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          created_by: string
          currency_code?: string
          donation_id: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          notes?: string | null
          operation_id?: string | null
          project_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by?: string
          currency_code?: string
          donation_id?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          notes?: string | null
          operation_id?: string | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donation_allocations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donation_allocations_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: false
            referencedRelation: "donations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donation_allocations_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operation_balances"
            referencedColumns: ["operation_id"]
          },
          {
            foreignKeyName: "donation_allocations_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donation_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donation_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount_cents: number
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          deleted_at: string | null
          id: string
          intent_language_entity_id: string | null
          intent_operation_id: string | null
          intent_region_id: string | null
          intent_type: Database["public"]["Enums"]["donation_intent_type"]
          is_manual: boolean
          is_recurring: boolean
          partner_org_id: string
          payment_method: Database["public"]["Enums"]["payment_method_type"]
          status: Database["public"]["Enums"]["donation_status"]
          subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          deleted_at?: string | null
          id?: string
          intent_language_entity_id?: string | null
          intent_operation_id?: string | null
          intent_region_id?: string | null
          intent_type: Database["public"]["Enums"]["donation_intent_type"]
          is_manual?: boolean
          is_recurring?: boolean
          partner_org_id: string
          payment_method: Database["public"]["Enums"]["payment_method_type"]
          status?: Database["public"]["Enums"]["donation_status"]
          subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          deleted_at?: string | null
          id?: string
          intent_language_entity_id?: string | null
          intent_operation_id?: string | null
          intent_region_id?: string | null
          intent_type?: Database["public"]["Enums"]["donation_intent_type"]
          is_manual?: boolean
          is_recurring?: boolean
          partner_org_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method_type"]
          status?: Database["public"]["Enums"]["donation_status"]
          subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "donations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_intent_language_entity_id_fkey"
            columns: ["intent_language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_intent_language_entity_id_fkey"
            columns: ["intent_language_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
          {
            foreignKeyName: "donations_intent_operation_id_fkey"
            columns: ["intent_operation_id"]
            isOneToOne: false
            referencedRelation: "operation_balances"
            referencedColumns: ["operation_id"]
          },
          {
            foreignKeyName: "donations_intent_operation_id_fkey"
            columns: ["intent_operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_intent_region_id_fkey"
            columns: ["intent_region_id"]
            isOneToOne: false
            referencedRelation: "mv_region_stats"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "donations_intent_region_id_fkey"
            columns: ["intent_region_id"]
            isOneToOne: false
            referencedRelation: "region_funding"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "donations_intent_region_id_fkey"
            columns: ["intent_region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_partner_org_id_fkey"
            columns: ["partner_org_id"]
            isOneToOne: false
            referencedRelation: "partner_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_partner_org_id_fkey"
            columns: ["partner_org_id"]
            isOneToOne: false
            referencedRelation: "user_partner_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      external_projects_overrides: {
        Row: {
          completed_chapters: number
          completion_date: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          is_audio: boolean
          is_text: boolean
          language_entity_id: string
          notes: string | null
          partner_organization: string | null
          project_name: string
          start_date: string | null
          total_chapters: number
          updated_at: string
        }
        Insert: {
          completed_chapters?: number
          completion_date?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_audio?: boolean
          is_text?: boolean
          language_entity_id: string
          notes?: string | null
          partner_organization?: string | null
          project_name: string
          start_date?: string | null
          total_chapters: number
          updated_at?: string
        }
        Update: {
          completed_chapters?: number
          completion_date?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_audio?: boolean
          is_text?: boolean
          language_entity_id?: string
          notes?: string | null
          partner_organization?: string | null
          project_name?: string
          start_date?: string | null
          total_chapters?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_projects_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_projects_overrides_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_projects_overrides_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
        ]
      }
      grn_coordinates_unmatched: {
        Row: {
          cache_id: string
          country_name: string | null
          first_seen_at: string
          grn_number: number | null
          id: string
          iso_code: string | null
          language_name: string | null
          last_seen_at: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          skip_reason: string
        }
        Insert: {
          cache_id: string
          country_name?: string | null
          first_seen_at?: string
          grn_number?: number | null
          id?: string
          iso_code?: string | null
          language_name?: string | null
          last_seen_at?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          skip_reason: string
        }
        Update: {
          cache_id?: string
          country_name?: string | null
          first_seen_at?: string
          grn_number?: number | null
          id?: string
          iso_code?: string | null
          language_name?: string | null
          last_seen_at?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          skip_reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "grn_coordinates_unmatched_cache_id_fkey"
            columns: ["cache_id"]
            isOneToOne: false
            referencedRelation: "grn_language_coordinates_cache"
            referencedColumns: ["id"]
          },
        ]
      }
      grn_language_cache: {
        Row: {
          alternate_names: Json | null
          audio_sample: boolean | null
          created_at: string
          grn_language_id: number
          has_recordings: boolean
          id: string
          ietf: string | null
          iso639_3: string | null
          language_name: string
          last_synced_at: string
          media_ids: Json | null
          name_ietf: string | null
          parent_id: number | null
          program_count: number | null
          programs: Json | null
          updated_at: string
        }
        Insert: {
          alternate_names?: Json | null
          audio_sample?: boolean | null
          created_at?: string
          grn_language_id: number
          has_recordings?: boolean
          id?: string
          ietf?: string | null
          iso639_3?: string | null
          language_name: string
          last_synced_at?: string
          media_ids?: Json | null
          name_ietf?: string | null
          parent_id?: number | null
          program_count?: number | null
          programs?: Json | null
          updated_at?: string
        }
        Update: {
          alternate_names?: Json | null
          audio_sample?: boolean | null
          created_at?: string
          grn_language_id?: number
          has_recordings?: boolean
          id?: string
          ietf?: string | null
          iso639_3?: string | null
          language_name?: string
          last_synced_at?: string
          media_ids?: Json | null
          name_ietf?: string | null
          parent_id?: number | null
          program_count?: number | null
          programs?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      grn_language_coordinates_cache: {
        Row: {
          country_name: string | null
          created_at: string
          grn_number: number | null
          id: string
          iso_code: string | null
          language_name: string | null
          last_synced_at: string
          location: unknown
          updated_at: string
        }
        Insert: {
          country_name?: string | null
          created_at?: string
          grn_number?: number | null
          id?: string
          iso_code?: string | null
          language_name?: string | null
          last_synced_at?: string
          location?: unknown
          updated_at?: string
        }
        Update: {
          country_name?: string | null
          created_at?: string
          grn_number?: number | null
          id?: string
          iso_code?: string | null
          language_name?: string | null
          last_synced_at?: string
          location?: unknown
          updated_at?: string
        }
        Relationships: []
      }
      image_sets: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "image_sets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      images: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          file_type: string | null
          id: string
          object_key: string | null
          original_filename: string | null
          publish_status: Database["public"]["Enums"]["publish_status"]
          set_id: string | null
          storage_provider: string | null
          target_id: string
          target_type: Database["public"]["Enums"]["target_type"]
          updated_at: string | null
          version: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          file_type?: string | null
          id?: string
          object_key?: string | null
          original_filename?: string | null
          publish_status?: Database["public"]["Enums"]["publish_status"]
          set_id?: string | null
          storage_provider?: string | null
          target_id: string
          target_type: Database["public"]["Enums"]["target_type"]
          updated_at?: string | null
          version?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          file_type?: string | null
          id?: string
          object_key?: string | null
          original_filename?: string | null
          publish_status?: Database["public"]["Enums"]["publish_status"]
          set_id?: string | null
          storage_provider?: string | null
          target_id?: string
          target_type?: Database["public"]["Enums"]["target_type"]
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "images_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "images_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "image_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      jp_countries_cache: {
        Row: {
          bible_complete: number | null
          bible_new_testament: number | null
          bible_portions: number | null
          capital: string | null
          cnt_peoples: number | null
          cnt_peoples_lr: number | null
          cnt_primary_languages: number | null
          created_at: string
          ctry: string | null
          deleted_at: string | null
          id: string
          iso2: string | null
          iso3: string | null
          jpscale_ctry: number | null
          jpscale_image_url: string | null
          jpscale_text: string | null
          last_synced_at: string
          percent_buddhism: number | null
          percent_christianity: number | null
          percent_ethnic_religions: number | null
          percent_evangelical: number | null
          percent_hinduism: number | null
          percent_islam: number | null
          percent_non_religious: number | null
          percent_other_small: number | null
          percent_unknown: number | null
          popl_peoples_fpg: number | null
          popl_peoples_lr: number | null
          population: number | null
          region_code: number | null
          region_name: string | null
          religion_primary: string | null
          rlg3_primary: number | null
          rog2: string | null
          rog3: string
          rol3_official_language: string | null
          security_level: number | null
          translation_needed: number | null
          translation_started: number | null
          translation_unspecified: number | null
          updated_at: string
          window_1040: string | null
        }
        Insert: {
          bible_complete?: number | null
          bible_new_testament?: number | null
          bible_portions?: number | null
          capital?: string | null
          cnt_peoples?: number | null
          cnt_peoples_lr?: number | null
          cnt_primary_languages?: number | null
          created_at?: string
          ctry?: string | null
          deleted_at?: string | null
          id?: string
          iso2?: string | null
          iso3?: string | null
          jpscale_ctry?: number | null
          jpscale_image_url?: string | null
          jpscale_text?: string | null
          last_synced_at?: string
          percent_buddhism?: number | null
          percent_christianity?: number | null
          percent_ethnic_religions?: number | null
          percent_evangelical?: number | null
          percent_hinduism?: number | null
          percent_islam?: number | null
          percent_non_religious?: number | null
          percent_other_small?: number | null
          percent_unknown?: number | null
          popl_peoples_fpg?: number | null
          popl_peoples_lr?: number | null
          population?: number | null
          region_code?: number | null
          region_name?: string | null
          religion_primary?: string | null
          rlg3_primary?: number | null
          rog2?: string | null
          rog3: string
          rol3_official_language?: string | null
          security_level?: number | null
          translation_needed?: number | null
          translation_started?: number | null
          translation_unspecified?: number | null
          updated_at?: string
          window_1040?: string | null
        }
        Update: {
          bible_complete?: number | null
          bible_new_testament?: number | null
          bible_portions?: number | null
          capital?: string | null
          cnt_peoples?: number | null
          cnt_peoples_lr?: number | null
          cnt_primary_languages?: number | null
          created_at?: string
          ctry?: string | null
          deleted_at?: string | null
          id?: string
          iso2?: string | null
          iso3?: string | null
          jpscale_ctry?: number | null
          jpscale_image_url?: string | null
          jpscale_text?: string | null
          last_synced_at?: string
          percent_buddhism?: number | null
          percent_christianity?: number | null
          percent_ethnic_religions?: number | null
          percent_evangelical?: number | null
          percent_hinduism?: number | null
          percent_islam?: number | null
          percent_non_religious?: number | null
          percent_other_small?: number | null
          percent_unknown?: number | null
          popl_peoples_fpg?: number | null
          popl_peoples_lr?: number | null
          population?: number | null
          region_code?: number | null
          region_name?: string | null
          religion_primary?: string | null
          rlg3_primary?: number | null
          rog2?: string | null
          rog3?: string
          rol3_official_language?: string | null
          security_level?: number | null
          translation_needed?: number | null
          translation_started?: number | null
          translation_unspecified?: number | null
          updated_at?: string
          window_1040?: string | null
        }
        Relationships: []
      }
      jp_language_cache: {
        Row: {
          bible_status: number | null
          bible_year: string | null
          country_code: string | null
          created_at: string
          fcbh_url: string | null
          grn_url: string | null
          has_audio_recordings: boolean
          has_jesus_film: boolean | null
          hub_country: string | null
          id: string
          iso639_3: string
          jf_url: string | null
          jp_scale: number | null
          language_name: string
          last_synced_at: string
          least_reached: boolean | null
          nbr_countries: number | null
          nbr_pgics: number | null
          nt_year: string | null
          percent_adherents: number | null
          percent_evangelical: number | null
          portions_year: string | null
          primary_religion: string | null
          religion_code: string | null
          status: string | null
          translation_need_questionable: boolean | null
          updated_at: string
        }
        Insert: {
          bible_status?: number | null
          bible_year?: string | null
          country_code?: string | null
          created_at?: string
          fcbh_url?: string | null
          grn_url?: string | null
          has_audio_recordings?: boolean
          has_jesus_film?: boolean | null
          hub_country?: string | null
          id?: string
          iso639_3: string
          jf_url?: string | null
          jp_scale?: number | null
          language_name: string
          last_synced_at?: string
          least_reached?: boolean | null
          nbr_countries?: number | null
          nbr_pgics?: number | null
          nt_year?: string | null
          percent_adherents?: number | null
          percent_evangelical?: number | null
          portions_year?: string | null
          primary_religion?: string | null
          religion_code?: string | null
          status?: string | null
          translation_need_questionable?: boolean | null
          updated_at?: string
        }
        Update: {
          bible_status?: number | null
          bible_year?: string | null
          country_code?: string | null
          created_at?: string
          fcbh_url?: string | null
          grn_url?: string | null
          has_audio_recordings?: boolean
          has_jesus_film?: boolean | null
          hub_country?: string | null
          id?: string
          iso639_3?: string
          jf_url?: string | null
          jp_scale?: number | null
          language_name?: string
          last_synced_at?: string
          least_reached?: boolean | null
          nbr_countries?: number | null
          nbr_pgics?: number | null
          nt_year?: string | null
          percent_adherents?: number | null
          percent_evangelical?: number | null
          portions_year?: string | null
          primary_religion?: string | null
          religion_code?: string | null
          status?: string | null
          translation_need_questionable?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      jp_people_groups_cache: {
        Row: {
          affinity_bloc: string | null
          audio_recordings: string | null
          audio_scripture: string | null
          bible_status: number | null
          bible_translation_need: string | null
          bible_year: string | null
          continent_code: string | null
          continent_name: string | null
          country_url: string | null
          created_at: string
          ctry: string | null
          four_laws: string | null
          frontier: string | null
          god_story: string | null
          gospel_radio: string | null
          grn: string | null
          grn_lang: string | null
          has_audio_recordings: string | null
          has_jesus_film: string | null
          id: string
          image_url: string | null
          indigenous_language: string | null
          iso3: string | null
          jf: string | null
          jf_lang: string | null
          jf_primary_text: string | null
          jpscale: number | null
          jpscale_image_url: string | null
          jpscale_pcimg: string | null
          jpscale_pctxt: string | null
          jpscale_text: string | null
          last_synced_at: string
          latitude: number | null
          least_reached: string | null
          least_reached_basis: string | null
          location_in_country: string | null
          longitude: number | null
          map_id: string | null
          medium_type_gospel_presentation: string | null
          nt_year: string | null
          number_languages_spoken: number | null
          pc_christian_pc: number | null
          pc_christian_pd: number | null
          pc_evangelical: number | null
          peop_name_across_countries: string | null
          peop_name_in_country: string | null
          people_cluster: string | null
          people_group_photo_url: string | null
          people_group_url: string | null
          people_id3: number
          people_id3_rog3: string
          photo_address: string | null
          photo_credits: string | null
          population: number | null
          population_percent_un: number | null
          population_pgac: number | null
          portions_year: string | null
          primary_language_dialect: string | null
          primary_language_name: string | null
          primary_medium_language: string | null
          primary_religion: string | null
          profile_text_exists: string | null
          race_code: string | null
          race_name: string | null
          region_code: string | null
          region_name: string | null
          rlg3: string | null
          rog2: string | null
          rog3: string | null
          rol3: string | null
          rop2: string | null
          rop25: string | null
          rop3: string | null
          security_level: number | null
          some_medium_language: string | null
          summary: string | null
          translation_need_questionable: string | null
          translation_need_year: number | null
          unengaged: string | null
          updated_at: string
          window_status: string | null
        }
        Insert: {
          affinity_bloc?: string | null
          audio_recordings?: string | null
          audio_scripture?: string | null
          bible_status?: number | null
          bible_translation_need?: string | null
          bible_year?: string | null
          continent_code?: string | null
          continent_name?: string | null
          country_url?: string | null
          created_at?: string
          ctry?: string | null
          four_laws?: string | null
          frontier?: string | null
          god_story?: string | null
          gospel_radio?: string | null
          grn?: string | null
          grn_lang?: string | null
          has_audio_recordings?: string | null
          has_jesus_film?: string | null
          id?: string
          image_url?: string | null
          indigenous_language?: string | null
          iso3?: string | null
          jf?: string | null
          jf_lang?: string | null
          jf_primary_text?: string | null
          jpscale?: number | null
          jpscale_image_url?: string | null
          jpscale_pcimg?: string | null
          jpscale_pctxt?: string | null
          jpscale_text?: string | null
          last_synced_at?: string
          latitude?: number | null
          least_reached?: string | null
          least_reached_basis?: string | null
          location_in_country?: string | null
          longitude?: number | null
          map_id?: string | null
          medium_type_gospel_presentation?: string | null
          nt_year?: string | null
          number_languages_spoken?: number | null
          pc_christian_pc?: number | null
          pc_christian_pd?: number | null
          pc_evangelical?: number | null
          peop_name_across_countries?: string | null
          peop_name_in_country?: string | null
          people_cluster?: string | null
          people_group_photo_url?: string | null
          people_group_url?: string | null
          people_id3: number
          people_id3_rog3: string
          photo_address?: string | null
          photo_credits?: string | null
          population?: number | null
          population_percent_un?: number | null
          population_pgac?: number | null
          portions_year?: string | null
          primary_language_dialect?: string | null
          primary_language_name?: string | null
          primary_medium_language?: string | null
          primary_religion?: string | null
          profile_text_exists?: string | null
          race_code?: string | null
          race_name?: string | null
          region_code?: string | null
          region_name?: string | null
          rlg3?: string | null
          rog2?: string | null
          rog3?: string | null
          rol3?: string | null
          rop2?: string | null
          rop25?: string | null
          rop3?: string | null
          security_level?: number | null
          some_medium_language?: string | null
          summary?: string | null
          translation_need_questionable?: string | null
          translation_need_year?: number | null
          unengaged?: string | null
          updated_at?: string
          window_status?: string | null
        }
        Update: {
          affinity_bloc?: string | null
          audio_recordings?: string | null
          audio_scripture?: string | null
          bible_status?: number | null
          bible_translation_need?: string | null
          bible_year?: string | null
          continent_code?: string | null
          continent_name?: string | null
          country_url?: string | null
          created_at?: string
          ctry?: string | null
          four_laws?: string | null
          frontier?: string | null
          god_story?: string | null
          gospel_radio?: string | null
          grn?: string | null
          grn_lang?: string | null
          has_audio_recordings?: string | null
          has_jesus_film?: string | null
          id?: string
          image_url?: string | null
          indigenous_language?: string | null
          iso3?: string | null
          jf?: string | null
          jf_lang?: string | null
          jf_primary_text?: string | null
          jpscale?: number | null
          jpscale_image_url?: string | null
          jpscale_pcimg?: string | null
          jpscale_pctxt?: string | null
          jpscale_text?: string | null
          last_synced_at?: string
          latitude?: number | null
          least_reached?: string | null
          least_reached_basis?: string | null
          location_in_country?: string | null
          longitude?: number | null
          map_id?: string | null
          medium_type_gospel_presentation?: string | null
          nt_year?: string | null
          number_languages_spoken?: number | null
          pc_christian_pc?: number | null
          pc_christian_pd?: number | null
          pc_evangelical?: number | null
          peop_name_across_countries?: string | null
          peop_name_in_country?: string | null
          people_cluster?: string | null
          people_group_photo_url?: string | null
          people_group_url?: string | null
          people_id3?: number
          people_id3_rog3?: string
          photo_address?: string | null
          photo_credits?: string | null
          population?: number | null
          population_percent_un?: number | null
          population_pgac?: number | null
          portions_year?: string | null
          primary_language_dialect?: string | null
          primary_language_name?: string | null
          primary_medium_language?: string | null
          primary_religion?: string | null
          profile_text_exists?: string | null
          race_code?: string | null
          race_name?: string | null
          region_code?: string | null
          region_name?: string | null
          rlg3?: string | null
          rog2?: string | null
          rog3?: string | null
          rol3?: string | null
          rop2?: string | null
          rop25?: string | null
          rop3?: string | null
          security_level?: number | null
          some_medium_language?: string | null
          summary?: string | null
          translation_need_questionable?: string | null
          translation_need_year?: number | null
          unengaged?: string | null
          updated_at?: string
          window_status?: string | null
        }
        Relationships: []
      }
      language_aliases: {
        Row: {
          alias_name: string
          created_at: string | null
          deleted_at: string | null
          id: string
          language_entity_id: string
        }
        Insert: {
          alias_name: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          language_entity_id: string
        }
        Update: {
          alias_name?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          language_entity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "language_aliases_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "language_aliases_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
        ]
      }
      language_entities: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          level: Database["public"]["Enums"]["language_entity_level"]
          name: string
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          level: Database["public"]["Enums"]["language_entity_level"]
          name: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          level?: Database["public"]["Enums"]["language_entity_level"]
          name?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "language_entities_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "language_entities_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
        ]
      }
      language_entities_people_groups_regions: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean
          language_entity_id: string
          people_group_region_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean
          language_entity_id: string
          people_group_region_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean
          language_entity_id?: string
          people_group_region_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "language_entities_people_groups_reg_people_group_region_id_fkey"
            columns: ["people_group_region_id"]
            isOneToOne: false
            referencedRelation: "people_groups_regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "language_entities_people_groups_regions_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "language_entities_people_groups_regions_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
        ]
      }
      language_entities_regions: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          dominance_level: number | null
          id: string
          language_entity_id: string
          location: unknown
          location_source: string | null
          region_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          dominance_level?: number | null
          id?: string
          language_entity_id: string
          location?: unknown
          location_source?: string | null
          region_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          dominance_level?: number | null
          id?: string
          language_entity_id?: string
          location?: unknown
          location_source?: string | null
          region_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "language_entities_regions_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "language_entities_regions_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
          {
            foreignKeyName: "language_entities_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "mv_region_stats"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "language_entities_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "region_funding"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "language_entities_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      language_entity_sources: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          external_id: string | null
          external_id_type: string | null
          id: string
          is_external: boolean
          language_entity_id: string
          source: string
          version: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          external_id?: string | null
          external_id_type?: string | null
          id?: string
          is_external?: boolean
          language_entity_id: string
          source: string
          version?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          external_id?: string | null
          external_id_type?: string | null
          id?: string
          is_external?: boolean
          language_entity_id?: string
          source?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "language_entity_sources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "language_entity_sources_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "language_entity_sources_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
        ]
      }
      language_funding: {
        Row: {
          budget_cents: number | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          funding_status: Database["public"]["Enums"]["funding_status"]
          id: string
          language_entity_id: string
          updated_at: string
        }
        Insert: {
          budget_cents?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          funding_status?: Database["public"]["Enums"]["funding_status"]
          id?: string
          language_entity_id: string
          updated_at?: string
        }
        Update: {
          budget_cents?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          funding_status?: Database["public"]["Enums"]["funding_status"]
          id?: string
          language_entity_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "language_funding_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "language_funding_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: true
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "language_funding_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: true
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
        ]
      }
      language_properties: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          key: string
          language_entity_id: string
          value: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          key: string
          language_entity_id: string
          value: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          key?: string
          language_entity_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "language_properties_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "language_properties_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
        ]
      }
      media_file_listens: {
        Row: {
          duration_seconds: number
          id: string
          language_entity_id: string
          listened_at: string | null
          media_file_id: string
          origin_share_id: string | null
          position_seconds: number
          session_id: string
          user_id: string | null
        }
        Insert: {
          duration_seconds: number
          id?: string
          language_entity_id: string
          listened_at?: string | null
          media_file_id: string
          origin_share_id?: string | null
          position_seconds: number
          session_id: string
          user_id?: string | null
        }
        Update: {
          duration_seconds?: number
          id?: string
          language_entity_id?: string
          listened_at?: string | null
          media_file_id?: string
          origin_share_id?: string | null
          position_seconds?: number
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_file_listens_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_file_listens_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
          {
            foreignKeyName: "media_file_listens_media_file_id_fkey"
            columns: ["media_file_id"]
            isOneToOne: false
            referencedRelation: "media_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_file_listens_origin_share_id_fkey"
            columns: ["origin_share_id"]
            isOneToOne: false
            referencedRelation: "shares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_file_listens_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_file_listens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      media_files: {
        Row: {
          audio_version_id: string | null
          chapter_id: string | null
          check_status: Database["public"]["Enums"]["check_status"] | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          duration_seconds: number | null
          end_verse_id: string | null
          file_size: number | null
          file_type: string | null
          id: string
          is_bible_audio: boolean | null
          language_entity_id: string
          media_type: Database["public"]["Enums"]["media_type"]
          object_key: string | null
          original_filename: string | null
          project_id: string | null
          publish_status: Database["public"]["Enums"]["publish_status"] | null
          sequence_id: string | null
          start_verse_id: string | null
          storage_provider: string | null
          updated_at: string | null
          upload_status: Database["public"]["Enums"]["upload_status"] | null
          version: number | null
        }
        Insert: {
          audio_version_id?: string | null
          chapter_id?: string | null
          check_status?: Database["public"]["Enums"]["check_status"] | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          duration_seconds?: number | null
          end_verse_id?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_bible_audio?: boolean | null
          language_entity_id: string
          media_type: Database["public"]["Enums"]["media_type"]
          object_key?: string | null
          original_filename?: string | null
          project_id?: string | null
          publish_status?: Database["public"]["Enums"]["publish_status"] | null
          sequence_id?: string | null
          start_verse_id?: string | null
          storage_provider?: string | null
          updated_at?: string | null
          upload_status?: Database["public"]["Enums"]["upload_status"] | null
          version?: number | null
        }
        Update: {
          audio_version_id?: string | null
          chapter_id?: string | null
          check_status?: Database["public"]["Enums"]["check_status"] | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          duration_seconds?: number | null
          end_verse_id?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_bible_audio?: boolean | null
          language_entity_id?: string
          media_type?: Database["public"]["Enums"]["media_type"]
          object_key?: string | null
          original_filename?: string | null
          project_id?: string | null
          publish_status?: Database["public"]["Enums"]["publish_status"] | null
          sequence_id?: string | null
          start_verse_id?: string | null
          storage_provider?: string | null
          updated_at?: string | null
          upload_status?: Database["public"]["Enums"]["upload_status"] | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_files_audio_version_id_fkey"
            columns: ["audio_version_id"]
            isOneToOne: false
            referencedRelation: "audio_version_book_progress"
            referencedColumns: ["audio_version_id"]
          },
          {
            foreignKeyName: "media_files_audio_version_id_fkey"
            columns: ["audio_version_id"]
            isOneToOne: false
            referencedRelation: "audio_version_progress"
            referencedColumns: ["audio_version_id"]
          },
          {
            foreignKeyName: "media_files_audio_version_id_fkey"
            columns: ["audio_version_id"]
            isOneToOne: false
            referencedRelation: "audio_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_files_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_files_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_files_end_verse_id_fkey"
            columns: ["end_verse_id"]
            isOneToOne: false
            referencedRelation: "verses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_files_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_files_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
          {
            foreignKeyName: "media_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_files_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_files_start_verse_id_fkey"
            columns: ["start_verse_id"]
            isOneToOne: false
            referencedRelation: "verses"
            referencedColumns: ["id"]
          },
        ]
      }
      media_files_verses: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          denormalized_audio_version_id: string | null
          duration_seconds: number
          id: string
          media_file_id: string
          project_id: string | null
          start_time_seconds: number
          updated_at: string | null
          verse_checker_comment: string | null
          verse_checker_status: string | null
          verse_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          denormalized_audio_version_id?: string | null
          duration_seconds: number
          id?: string
          media_file_id: string
          project_id?: string | null
          start_time_seconds: number
          updated_at?: string | null
          verse_checker_comment?: string | null
          verse_checker_status?: string | null
          verse_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          denormalized_audio_version_id?: string | null
          duration_seconds?: number
          id?: string
          media_file_id?: string
          project_id?: string | null
          start_time_seconds?: number
          updated_at?: string | null
          verse_checker_comment?: string | null
          verse_checker_status?: string | null
          verse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_files_verses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_files_verses_denormalized_audio_version_id_fkey"
            columns: ["denormalized_audio_version_id"]
            isOneToOne: false
            referencedRelation: "audio_version_book_progress"
            referencedColumns: ["audio_version_id"]
          },
          {
            foreignKeyName: "media_files_verses_denormalized_audio_version_id_fkey"
            columns: ["denormalized_audio_version_id"]
            isOneToOne: false
            referencedRelation: "audio_version_progress"
            referencedColumns: ["audio_version_id"]
          },
          {
            foreignKeyName: "media_files_verses_denormalized_audio_version_id_fkey"
            columns: ["denormalized_audio_version_id"]
            isOneToOne: false
            referencedRelation: "audio_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_files_verses_media_file_id_fkey"
            columns: ["media_file_id"]
            isOneToOne: false
            referencedRelation: "media_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_files_verses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_files_verses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_files_verses_verse_id_fkey"
            columns: ["verse_id"]
            isOneToOne: false
            referencedRelation: "verses"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_costs: {
        Row: {
          amount_cents: number
          category: Database["public"]["Enums"]["operation_category"]
          created_at: string
          created_by: string
          currency_code: string
          description: string
          id: string
          occurred_at: string
          operation_id: string
          receipt_url: string | null
          updated_at: string | null
        }
        Insert: {
          amount_cents: number
          category: Database["public"]["Enums"]["operation_category"]
          created_at?: string
          created_by: string
          currency_code?: string
          description: string
          id?: string
          occurred_at?: string
          operation_id: string
          receipt_url?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_cents?: number
          category?: Database["public"]["Enums"]["operation_category"]
          created_at?: string
          created_by?: string
          currency_code?: string
          description?: string
          id?: string
          occurred_at?: string
          operation_id?: string
          receipt_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operation_costs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_costs_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operation_balances"
            referencedColumns: ["operation_id"]
          },
          {
            foreignKeyName: "operation_costs_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
        ]
      }
      operations: {
        Row: {
          budget_cents: number | null
          category: Database["public"]["Enums"]["operation_category"]
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          display_order: number
          id: string
          is_public: boolean
          name: string
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string | null
        }
        Insert: {
          budget_cents?: number | null
          category: Database["public"]["Enums"]["operation_category"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_public?: boolean
          name: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string | null
        }
        Update: {
          budget_cents?: number | null
          category?: Database["public"]["Enums"]["operation_category"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_public?: boolean
          name?: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_orgs: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_individual: boolean
          is_public: boolean
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_individual?: boolean
          is_public?: boolean
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_individual?: boolean
          is_public?: boolean
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_orgs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_orgs_projects: {
        Row: {
          assigned_at: string
          created_by: string | null
          donation_allocation_id: string | null
          id: string
          partner_org_id: string
          project_id: string
          source_type: string
          unassigned_at: string | null
        }
        Insert: {
          assigned_at?: string
          created_by?: string | null
          donation_allocation_id?: string | null
          id?: string
          partner_org_id: string
          project_id: string
          source_type: string
          unassigned_at?: string | null
        }
        Update: {
          assigned_at?: string
          created_by?: string | null
          donation_allocation_id?: string | null
          id?: string
          partner_org_id?: string
          project_id?: string
          source_type?: string
          unassigned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_orgs_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_orgs_projects_donation_allocation_id_fkey"
            columns: ["donation_allocation_id"]
            isOneToOne: false
            referencedRelation: "donation_allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_orgs_projects_partner_org_id_fkey"
            columns: ["partner_org_id"]
            isOneToOne: false
            referencedRelation: "partner_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_orgs_projects_partner_org_id_fkey"
            columns: ["partner_org_id"]
            isOneToOne: false
            referencedRelation: "user_partner_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_orgs_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_orgs_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      passages: {
        Row: {
          book_id: string
          created_at: string | null
          created_by: string | null
          end_verse_id: string
          id: string
          start_verse_id: string
          updated_at: string | null
        }
        Insert: {
          book_id: string
          created_at?: string | null
          created_by?: string | null
          end_verse_id: string
          id?: string
          start_verse_id: string
          updated_at?: string | null
        }
        Update: {
          book_id?: string
          created_at?: string | null
          created_by?: string | null
          end_verse_id?: string
          id?: string
          start_verse_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "passages_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "audio_version_book_progress"
            referencedColumns: ["book_id"]
          },
          {
            foreignKeyName: "passages_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passages_end_verse_id_fkey"
            columns: ["end_verse_id"]
            isOneToOne: false
            referencedRelation: "verses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passages_start_verse_id_fkey"
            columns: ["start_verse_id"]
            isOneToOne: false
            referencedRelation: "verses"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_attempts: {
        Row: {
          amount_cents: number
          amount_received_cents: number | null
          created_at: string
          currency_code: string
          donation_id: string
          failed_at: string | null
          failure_code: string | null
          failure_message: string | null
          id: string
          metadata: Json | null
          status: Database["public"]["Enums"]["payment_attempt_status"]
          stripe_charge_id: string | null
          stripe_customer_id: string | null
          stripe_event_id: string | null
          stripe_payment_intent_id: string
          stripe_subscription_id: string | null
          succeeded_at: string | null
        }
        Insert: {
          amount_cents: number
          amount_received_cents?: number | null
          created_at?: string
          currency_code?: string
          donation_id: string
          failed_at?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          metadata?: Json | null
          status: Database["public"]["Enums"]["payment_attempt_status"]
          stripe_charge_id?: string | null
          stripe_customer_id?: string | null
          stripe_event_id?: string | null
          stripe_payment_intent_id: string
          stripe_subscription_id?: string | null
          succeeded_at?: string | null
        }
        Update: {
          amount_cents?: number
          amount_received_cents?: number | null
          created_at?: string
          currency_code?: string
          donation_id?: string
          failed_at?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          metadata?: Json | null
          status?: Database["public"]["Enums"]["payment_attempt_status"]
          stripe_charge_id?: string | null
          stripe_customer_id?: string | null
          stripe_event_id?: string | null
          stripe_payment_intent_id?: string
          stripe_subscription_id?: string | null
          succeeded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_attempts_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: false
            referencedRelation: "donations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          bank_last4: string | null
          bank_name: string | null
          billing_address: Json | null
          card_brand: string | null
          card_exp_month: number | null
          card_exp_year: number | null
          card_last4: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_default: boolean
          partner_org_id: string | null
          stripe_customer_id: string
          stripe_payment_method_id: string
          type: Database["public"]["Enums"]["payment_method_type"]
          user_id: string | null
        }
        Insert: {
          bank_last4?: string | null
          bank_name?: string | null
          billing_address?: Json | null
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_default?: boolean
          partner_org_id?: string | null
          stripe_customer_id: string
          stripe_payment_method_id: string
          type: Database["public"]["Enums"]["payment_method_type"]
          user_id?: string | null
        }
        Update: {
          bank_last4?: string | null
          bank_name?: string | null
          billing_address?: Json | null
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_default?: boolean
          partner_org_id?: string | null
          stripe_customer_id?: string
          stripe_payment_method_id?: string
          type?: Database["public"]["Enums"]["payment_method_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_partner_org_id_fkey"
            columns: ["partner_org_id"]
            isOneToOne: false
            referencedRelation: "partner_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_partner_org_id_fkey"
            columns: ["partner_org_id"]
            isOneToOne: false
            referencedRelation: "user_partner_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      people_groups: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          name: string
          parent_id: string | null
          people_id3: number
          population_pgac: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          parent_id?: string | null
          people_id3: number
          population_pgac?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          people_id3?: number
          population_pgac?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_groups_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "mv_people_group_stats"
            referencedColumns: ["people_group_id"]
          },
          {
            foreignKeyName: "people_groups_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "people_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      people_groups_properties: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          key: string
          people_group_id: string
          value: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          key: string
          people_group_id: string
          value: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          key?: string
          people_group_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_groups_properties_people_group_id_fkey"
            columns: ["people_group_id"]
            isOneToOne: false
            referencedRelation: "mv_people_group_stats"
            referencedColumns: ["people_group_id"]
          },
          {
            foreignKeyName: "people_groups_properties_people_group_id_fkey"
            columns: ["people_group_id"]
            isOneToOne: false
            referencedRelation: "people_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      people_groups_regions: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          latitude: number | null
          location_point: unknown
          longitude: number | null
          peop_name_in_country: string | null
          people_group_id: string
          people_id3_rog3: string
          population: number | null
          primary_language_rol3: string | null
          region_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          latitude?: number | null
          location_point?: unknown
          longitude?: number | null
          peop_name_in_country?: string | null
          people_group_id: string
          people_id3_rog3: string
          population?: number | null
          primary_language_rol3?: string | null
          region_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          latitude?: number | null
          location_point?: unknown
          longitude?: number | null
          peop_name_in_country?: string | null
          people_group_id?: string
          people_id3_rog3?: string
          population?: number | null
          primary_language_rol3?: string | null
          region_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_groups_regions_people_group_id_fkey"
            columns: ["people_group_id"]
            isOneToOne: false
            referencedRelation: "mv_people_group_stats"
            referencedColumns: ["people_group_id"]
          },
          {
            foreignKeyName: "people_groups_regions_people_group_id_fkey"
            columns: ["people_group_id"]
            isOneToOne: false
            referencedRelation: "people_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_groups_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "mv_region_stats"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "people_groups_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "region_funding"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "people_groups_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      people_groups_sources: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          external_id: string | null
          external_id_type: string | null
          id: string
          is_external: boolean
          people_group_id: string
          source: string
          version: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          external_id?: string | null
          external_id_type?: string | null
          id?: string
          is_external?: boolean
          people_group_id: string
          source: string
          version?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          external_id?: string | null
          external_id_type?: string | null
          id?: string
          is_external?: boolean
          people_group_id?: string
          source?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_groups_sources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_groups_sources_people_group_id_fkey"
            columns: ["people_group_id"]
            isOneToOne: false
            referencedRelation: "mv_people_group_stats"
            referencedColumns: ["people_group_id"]
          },
          {
            foreignKeyName: "people_groups_sources_people_group_id_fkey"
            columns: ["people_group_id"]
            isOneToOne: false
            referencedRelation: "people_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_items: {
        Row: {
          created_at: string | null
          created_by: string | null
          custom_text: string | null
          end_verse_id: string | null
          id: string
          order_index: number
          playlist_id: string
          playlist_item_type:
            | Database["public"]["Enums"]["playlist_item_type"]
            | null
          start_verse_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          custom_text?: string | null
          end_verse_id?: string | null
          id?: string
          order_index: number
          playlist_id: string
          playlist_item_type?:
            | Database["public"]["Enums"]["playlist_item_type"]
            | null
          start_verse_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          custom_text?: string | null
          end_verse_id?: string | null
          id?: string
          order_index?: number
          playlist_id?: string
          playlist_item_type?:
            | Database["public"]["Enums"]["playlist_item_type"]
            | null
          start_verse_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playlist_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_items_end_verse_id_fkey"
            columns: ["end_verse_id"]
            isOneToOne: false
            referencedRelation: "verses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_items_start_verse_id_fkey"
            columns: ["start_verse_id"]
            isOneToOne: false
            referencedRelation: "verses"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          image_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playlists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlists_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_refresh_queue: {
        Row: {
          enqueued_at: string | null
          id: number
          kind: string
          version_id: string
        }
        Insert: {
          enqueued_at?: string | null
          id?: number
          kind: string
          version_id: string
        }
        Update: {
          enqueued_at?: string | null
          id?: number
          kind?: string
          version_id?: string
        }
        Relationships: []
      }
      project_updates: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          project_id: string
          publish_status: Database["public"]["Enums"]["publish_status"]
          title: string
          updated_at: string | null
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          project_id: string
          publish_status?: Database["public"]["Enums"]["publish_status"]
          title: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          project_id?: string
          publish_status?: Database["public"]["Enums"]["publish_status"]
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_updates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_updates_media: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          display_order: number
          duration_seconds: number | null
          file_size: number | null
          file_type: string | null
          id: string
          media_type: Database["public"]["Enums"]["media_type"]
          object_key: string
          original_filename: string | null
          project_update_id: string
          storage_provider: string | null
          thumbnail_object_key: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          display_order?: number
          duration_seconds?: number | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          media_type: Database["public"]["Enums"]["media_type"]
          object_key: string
          original_filename?: string | null
          project_update_id: string
          storage_provider?: string | null
          thumbnail_object_key?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          display_order?: number
          duration_seconds?: number | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          media_type?: Database["public"]["Enums"]["media_type"]
          object_key?: string
          original_filename?: string | null
          project_update_id?: string
          storage_provider?: string | null
          thumbnail_object_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_updates_media_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_updates_media_project_update_id_fkey"
            columns: ["project_update_id"]
            isOneToOne: false
            referencedRelation: "project_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          location: unknown
          name: string
          project_status: Database["public"]["Enums"]["project_status"]
          publish_status: Database["public"]["Enums"]["publish_status"]
          region_id: string | null
          region_name: string | null
          source_language_entity_id: string
          source_language_name: string | null
          target_language_entity_id: string
          target_language_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          location?: unknown
          name: string
          project_status?: Database["public"]["Enums"]["project_status"]
          publish_status?: Database["public"]["Enums"]["publish_status"]
          region_id?: string | null
          region_name?: string | null
          source_language_entity_id: string
          source_language_name?: string | null
          target_language_entity_id: string
          target_language_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          location?: unknown
          name?: string
          project_status?: Database["public"]["Enums"]["project_status"]
          publish_status?: Database["public"]["Enums"]["publish_status"]
          region_id?: string | null
          region_name?: string | null
          source_language_entity_id?: string
          source_language_name?: string | null
          target_language_entity_id?: string
          target_language_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "mv_region_stats"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "projects_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "region_funding"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "projects_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_source_language_entity_id_fkey"
            columns: ["source_language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_source_language_entity_id_fkey"
            columns: ["source_language_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
          {
            foreignKeyName: "projects_target_language_entity_id_fkey"
            columns: ["target_language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_target_language_entity_id_fkey"
            columns: ["target_language_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
        ]
      }
      region_aliases: {
        Row: {
          alias_name: string
          created_at: string | null
          deleted_at: string | null
          id: string
          region_id: string
        }
        Insert: {
          alias_name: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          region_id: string
        }
        Update: {
          alias_name?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          region_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "region_aliases_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "mv_region_stats"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "region_aliases_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "region_funding"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "region_aliases_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      region_funding_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          funding_status: string
          region_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          funding_status?: string
          region_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          funding_status?: string
          region_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "region_funding_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "region_funding_overrides_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: true
            referencedRelation: "mv_region_stats"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "region_funding_overrides_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: true
            referencedRelation: "region_funding"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "region_funding_overrides_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: true
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      region_properties: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          key: string
          region_id: string
          value: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          key: string
          region_id: string
          value: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          key?: string
          region_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "region_properties_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "mv_region_stats"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "region_properties_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "region_funding"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "region_properties_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      region_sources: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          external_id: string | null
          external_id_type: string | null
          id: string
          is_external: boolean
          region_id: string
          source: string
          version: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          external_id?: string | null
          external_id_type?: string | null
          id?: string
          is_external?: boolean
          region_id: string
          source: string
          version?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          external_id?: string | null
          external_id_type?: string | null
          id?: string
          is_external?: boolean
          region_id?: string
          source?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "region_sources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "region_sources_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "mv_region_stats"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "region_sources_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "region_funding"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "region_sources_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          bbox_max_lat: number | null
          bbox_max_lon: number | null
          bbox_min_lat: number | null
          bbox_min_lon: number | null
          boundary: unknown
          boundary_simplified: unknown
          center_lat: number | null
          center_lon: number | null
          created_at: string | null
          deleted_at: string | null
          id: string
          level: Database["public"]["Enums"]["region_level"]
          name: string
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          bbox_max_lat?: number | null
          bbox_max_lon?: number | null
          bbox_min_lat?: number | null
          bbox_min_lon?: number | null
          boundary?: unknown
          boundary_simplified?: unknown
          center_lat?: number | null
          center_lon?: number | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          level: Database["public"]["Enums"]["region_level"]
          name: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          bbox_max_lat?: number | null
          bbox_max_lon?: number | null
          bbox_min_lat?: number | null
          bbox_min_lon?: number | null
          boundary?: unknown
          boundary_simplified?: unknown
          center_lat?: number | null
          center_lon?: number | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          level?: Database["public"]["Enums"]["region_level"]
          name?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "mv_region_stats"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "regions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "region_funding"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "regions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          is_allowed: boolean
          permission_key: Database["public"]["Enums"]["permission_key"]
          resource_type: Database["public"]["Enums"]["resource_type"]
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_allowed?: boolean
          permission_key: Database["public"]["Enums"]["permission_key"]
          resource_type: Database["public"]["Enums"]["resource_type"]
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_allowed?: boolean
          permission_key?: Database["public"]["Enums"]["permission_key"]
          resource_type?: Database["public"]["Enums"]["resource_type"]
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          id: string
          name: string
          resource_type: Database["public"]["Enums"]["resource_type"] | null
          role_key: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          resource_type?: Database["public"]["Enums"]["resource_type"] | null
          role_key?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          resource_type?: Database["public"]["Enums"]["resource_type"] | null
          role_key?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      segments: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          id: string
          local_path: string | null
          project_id: string | null
          remote_path: string | null
          type: Database["public"]["Enums"]["segment_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          local_path?: string | null
          project_id?: string | null
          remote_path?: string | null
          type: Database["public"]["Enums"]["segment_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          local_path?: string | null
          project_id?: string | null
          remote_path?: string | null
          type?: Database["public"]["Enums"]["segment_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "segments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sequences: {
        Row: {
          book_id: string
          chapter_id: string | null
          check_status: Database["public"]["Enums"]["check_status"]
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          end_verse_id: string | null
          id: string
          is_bible_audio: boolean | null
          name: string
          project_id: string
          publish_status: Database["public"]["Enums"]["publish_status"]
          start_verse_id: string | null
          updated_at: string | null
          upload_status: Database["public"]["Enums"]["upload_status"]
        }
        Insert: {
          book_id: string
          chapter_id?: string | null
          check_status?: Database["public"]["Enums"]["check_status"]
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_verse_id?: string | null
          id?: string
          is_bible_audio?: boolean | null
          name: string
          project_id: string
          publish_status?: Database["public"]["Enums"]["publish_status"]
          start_verse_id?: string | null
          updated_at?: string | null
          upload_status?: Database["public"]["Enums"]["upload_status"]
        }
        Update: {
          book_id?: string
          chapter_id?: string | null
          check_status?: Database["public"]["Enums"]["check_status"]
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_verse_id?: string | null
          id?: string
          is_bible_audio?: boolean | null
          name?: string
          project_id?: string
          publish_status?: Database["public"]["Enums"]["publish_status"]
          start_verse_id?: string | null
          updated_at?: string | null
          upload_status?: Database["public"]["Enums"]["upload_status"]
        }
        Relationships: [
          {
            foreignKeyName: "sequences_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "audio_version_book_progress"
            referencedColumns: ["book_id"]
          },
          {
            foreignKeyName: "sequences_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequences_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequences_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequences_end_verse_id_fkey"
            columns: ["end_verse_id"]
            isOneToOne: false
            referencedRelation: "verses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequences_start_verse_id_fkey"
            columns: ["start_verse_id"]
            isOneToOne: false
            referencedRelation: "verses"
            referencedColumns: ["id"]
          },
        ]
      }
      sequences_segments: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_deleted: boolean | null
          is_hidden: boolean | null
          is_numbered: boolean | null
          project_id: string | null
          segment_color: string | null
          segment_id: string
          segment_index: number
          sequence_id: string
          updated_at: string | null
          verse_number: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_deleted?: boolean | null
          is_hidden?: boolean | null
          is_numbered?: boolean | null
          project_id?: string | null
          segment_color?: string | null
          segment_id: string
          segment_index: number
          sequence_id: string
          updated_at?: string | null
          verse_number?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_deleted?: boolean | null
          is_hidden?: boolean | null
          is_numbered?: boolean | null
          project_id?: string | null
          segment_color?: string | null
          segment_id?: string
          segment_index?: number
          sequence_id?: string
          updated_at?: string | null
          verse_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "sequences_segments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequences_segments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequences_segments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequences_segments_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequences_segments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          app_download_id: string | null
          app_version: string
          connectivity: Database["public"]["Enums"]["connectivity_type"] | null
          continent_code: string | null
          country_code: string | null
          ended_at: string | null
          id: string
          language_entity_id: string | null
          location: unknown
          location_source:
            | Database["public"]["Enums"]["location_source_type"]
            | null
          os: string | null
          os_version: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          region_code: string | null
          started_at: string | null
          user_id: string | null
        }
        Insert: {
          app_download_id?: string | null
          app_version: string
          connectivity?: Database["public"]["Enums"]["connectivity_type"] | null
          continent_code?: string | null
          country_code?: string | null
          ended_at?: string | null
          id?: string
          language_entity_id?: string | null
          location?: unknown
          location_source?:
            | Database["public"]["Enums"]["location_source_type"]
            | null
          os?: string | null
          os_version?: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          region_code?: string | null
          started_at?: string | null
          user_id?: string | null
        }
        Update: {
          app_download_id?: string | null
          app_version?: string
          connectivity?: Database["public"]["Enums"]["connectivity_type"] | null
          continent_code?: string | null
          country_code?: string | null
          ended_at?: string | null
          id?: string
          language_entity_id?: string | null
          location?: unknown
          location_source?:
            | Database["public"]["Enums"]["location_source_type"]
            | null
          os?: string | null
          os_version?: string | null
          platform?: Database["public"]["Enums"]["platform_type"]
          region_code?: string | null
          started_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_app_download_id_fkey"
            columns: ["app_download_id"]
            isOneToOne: false
            referencedRelation: "app_downloads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      share_opens: {
        Row: {
          created_at: string | null
          id: string
          opened_at: string | null
          parent_share_id: string | null
          session_id: string | null
          share_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          opened_at?: string | null
          parent_share_id?: string | null
          session_id?: string | null
          share_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          opened_at?: string | null
          parent_share_id?: string | null
          session_id?: string | null
          share_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_opens_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_opens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shares: {
        Row: {
          id: string
          language_entity_id: string
          parent_share_id: string | null
          session_id: string
          share_entity_id: string
          share_entity_type: Database["public"]["Enums"]["share_entity_type"]
          shared_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          language_entity_id: string
          parent_share_id?: string | null
          session_id: string
          share_entity_id: string
          share_entity_type: Database["public"]["Enums"]["share_entity_type"]
          shared_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          language_entity_id?: string
          parent_share_id?: string | null
          session_id?: string
          share_entity_id?: string
          share_entity_type?: Database["public"]["Enums"]["share_entity_type"]
          shared_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shares_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shares_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
          {
            foreignKeyName: "shares_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount_cents: number
          canceled_at: string | null
          created_at: string
          currency_code: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          intent_language_entity_id: string | null
          intent_operation_id: string | null
          intent_region_id: string | null
          intent_type: Database["public"]["Enums"]["donation_intent_type"]
          interval_type: string
          original_donation_id: string | null
          partner_org_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          canceled_at?: string | null
          created_at?: string
          currency_code?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          intent_language_entity_id?: string | null
          intent_operation_id?: string | null
          intent_region_id?: string | null
          intent_type: Database["public"]["Enums"]["donation_intent_type"]
          interval_type: string
          original_donation_id?: string | null
          partner_org_id: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          canceled_at?: string | null
          created_at?: string
          currency_code?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          intent_language_entity_id?: string | null
          intent_operation_id?: string | null
          intent_region_id?: string | null
          intent_type?: Database["public"]["Enums"]["donation_intent_type"]
          interval_type?: string
          original_donation_id?: string | null
          partner_org_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_intent_language_entity_id_fkey"
            columns: ["intent_language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_intent_language_entity_id_fkey"
            columns: ["intent_language_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
          {
            foreignKeyName: "subscriptions_intent_operation_id_fkey"
            columns: ["intent_operation_id"]
            isOneToOne: false
            referencedRelation: "operation_balances"
            referencedColumns: ["operation_id"]
          },
          {
            foreignKeyName: "subscriptions_intent_operation_id_fkey"
            columns: ["intent_operation_id"]
            isOneToOne: false
            referencedRelation: "operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_intent_region_id_fkey"
            columns: ["intent_region_id"]
            isOneToOne: false
            referencedRelation: "mv_region_stats"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "subscriptions_intent_region_id_fkey"
            columns: ["intent_region_id"]
            isOneToOne: false
            referencedRelation: "region_funding"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "subscriptions_intent_region_id_fkey"
            columns: ["intent_region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_original_donation_id_fkey"
            columns: ["original_donation_id"]
            isOneToOne: false
            referencedRelation: "donations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_partner_org_id_fkey"
            columns: ["partner_org_id"]
            isOneToOne: false
            referencedRelation: "partner_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_partner_org_id_fkey"
            columns: ["partner_org_id"]
            isOneToOne: false
            referencedRelation: "user_partner_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      text_versions: {
        Row: {
          bible_version_id: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          id: string
          language_entity_id: string
          name: string
          project_id: string | null
          publish_status: Database["public"]["Enums"]["publish_status"]
          text_version_source:
            | Database["public"]["Enums"]["text_version_source"]
            | null
          updated_at: string | null
        }
        Insert: {
          bible_version_id: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          language_entity_id: string
          name: string
          project_id?: string | null
          publish_status?: Database["public"]["Enums"]["publish_status"]
          text_version_source?:
            | Database["public"]["Enums"]["text_version_source"]
            | null
          updated_at?: string | null
        }
        Update: {
          bible_version_id?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          language_entity_id?: string
          name?: string
          project_id?: string | null
          publish_status?: Database["public"]["Enums"]["publish_status"]
          text_version_source?:
            | Database["public"]["Enums"]["text_version_source"]
            | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "text_versions_bible_version_id_fkey"
            columns: ["bible_version_id"]
            isOneToOne: false
            referencedRelation: "bible_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "text_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "text_versions_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "text_versions_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
          {
            foreignKeyName: "text_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "text_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bookmark_folders: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          parent_folder_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          parent_folder_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          parent_folder_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_bookmark_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "user_bookmark_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bookmark_folders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bookmarks: {
        Row: {
          bookmark_folder_id: string | null
          bookmark_type: Database["public"]["Enums"]["bookmark_type"] | null
          color: string | null
          created_at: string | null
          end_verse_id: string | null
          id: string
          note: string | null
          start_verse_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bookmark_folder_id?: string | null
          bookmark_type?: Database["public"]["Enums"]["bookmark_type"] | null
          color?: string | null
          created_at?: string | null
          end_verse_id?: string | null
          id?: string
          note?: string | null
          start_verse_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bookmark_folder_id?: string | null
          bookmark_type?: Database["public"]["Enums"]["bookmark_type"] | null
          color?: string | null
          created_at?: string | null
          end_verse_id?: string | null
          id?: string
          note?: string | null
          start_verse_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_bookmarks_bookmark_folder_id_fkey"
            columns: ["bookmark_folder_id"]
            isOneToOne: false
            referencedRelation: "user_bookmark_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bookmarks_end_verse_id_fkey"
            columns: ["end_verse_id"]
            isOneToOne: false
            referencedRelation: "verses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bookmarks_start_verse_id_fkey"
            columns: ["start_verse_id"]
            isOneToOne: false
            referencedRelation: "verses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_current_selections: {
        Row: {
          created_at: string
          id: string
          selected_audio_version: string | null
          selected_text_version: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          selected_audio_version?: string | null
          selected_text_version?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          selected_audio_version?: string | null
          selected_text_version?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_current_selections_selected_audio_version_fkey"
            columns: ["selected_audio_version"]
            isOneToOne: false
            referencedRelation: "audio_version_book_progress"
            referencedColumns: ["audio_version_id"]
          },
          {
            foreignKeyName: "user_current_selections_selected_audio_version_fkey"
            columns: ["selected_audio_version"]
            isOneToOne: false
            referencedRelation: "audio_version_progress"
            referencedColumns: ["audio_version_id"]
          },
          {
            foreignKeyName: "user_current_selections_selected_audio_version_fkey"
            columns: ["selected_audio_version"]
            isOneToOne: false
            referencedRelation: "audio_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_current_selections_selected_text_version_fkey"
            columns: ["selected_text_version"]
            isOneToOne: false
            referencedRelation: "text_version_progress"
            referencedColumns: ["text_version_id"]
          },
          {
            foreignKeyName: "user_current_selections_selected_text_version_fkey"
            columns: ["selected_text_version"]
            isOneToOne: false
            referencedRelation: "text_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_current_selections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_playlist_groups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_playlist_groups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_playlists: {
        Row: {
          created_at: string | null
          id: string
          playlist_id: string
          updated_at: string | null
          user_id: string
          user_playlist_group_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          playlist_id: string
          updated_at?: string | null
          user_id: string
          user_playlist_group_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          playlist_id?: string
          updated_at?: string | null
          user_id?: string
          user_playlist_group_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_playlists_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_playlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_playlists_user_playlist_group_id_fkey"
            columns: ["user_playlist_group_id"]
            isOneToOne: false
            referencedRelation: "user_playlist_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          base_id: string | null
          created_at: string | null
          id: string
          is_global: boolean
          partner_org_id: string | null
          project_id: string | null
          role_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          base_id?: string | null
          created_at?: string | null
          id?: string
          is_global?: boolean
          partner_org_id?: string | null
          project_id?: string | null
          role_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          base_id?: string | null
          created_at?: string | null
          id?: string
          is_global?: boolean
          partner_org_id?: string | null
          project_id?: string | null
          role_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "user_bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_partner_org_id_fkey"
            columns: ["partner_org_id"]
            isOneToOne: false
            referencedRelation: "partner_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_partner_org_id_fkey"
            columns: ["partner_org_id"]
            isOneToOne: false
            referencedRelation: "user_partner_orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_saved_audio_versions: {
        Row: {
          audio_version_id: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          audio_version_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          audio_version_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_saved_audio_versions_audio_version_id_fkey"
            columns: ["audio_version_id"]
            isOneToOne: false
            referencedRelation: "audio_version_book_progress"
            referencedColumns: ["audio_version_id"]
          },
          {
            foreignKeyName: "user_saved_audio_versions_audio_version_id_fkey"
            columns: ["audio_version_id"]
            isOneToOne: false
            referencedRelation: "audio_version_progress"
            referencedColumns: ["audio_version_id"]
          },
          {
            foreignKeyName: "user_saved_audio_versions_audio_version_id_fkey"
            columns: ["audio_version_id"]
            isOneToOne: false
            referencedRelation: "audio_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_saved_audio_versions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_saved_image_sets: {
        Row: {
          created_at: string | null
          id: string
          set_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          set_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          set_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_saved_image_sets_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "image_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_saved_image_sets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_saved_text_versions: {
        Row: {
          created_at: string | null
          id: string
          text_version_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          text_version_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          text_version_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_saved_text_versions_text_version_id_fkey"
            columns: ["text_version_id"]
            isOneToOne: false
            referencedRelation: "text_version_progress"
            referencedColumns: ["text_version_id"]
          },
          {
            foreignKeyName: "user_saved_text_versions_text_version_id_fkey"
            columns: ["text_version_id"]
            isOneToOne: false
            referencedRelation: "text_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_saved_text_versions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_version_selections: {
        Row: {
          created_at: string | null
          current_audio_version_id: string | null
          current_text_version_id: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_audio_version_id?: string | null
          current_text_version_id?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_audio_version_id?: string | null
          current_text_version_id?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_version_selections_current_audio_version_id_fkey"
            columns: ["current_audio_version_id"]
            isOneToOne: false
            referencedRelation: "audio_version_book_progress"
            referencedColumns: ["audio_version_id"]
          },
          {
            foreignKeyName: "user_version_selections_current_audio_version_id_fkey"
            columns: ["current_audio_version_id"]
            isOneToOne: false
            referencedRelation: "audio_version_progress"
            referencedColumns: ["audio_version_id"]
          },
          {
            foreignKeyName: "user_version_selections_current_audio_version_id_fkey"
            columns: ["current_audio_version_id"]
            isOneToOne: false
            referencedRelation: "audio_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_version_selections_current_text_version_id_fkey"
            columns: ["current_text_version_id"]
            isOneToOne: false
            referencedRelation: "text_version_progress"
            referencedColumns: ["text_version_id"]
          },
          {
            foreignKeyName: "user_version_selections_current_text_version_id_fkey"
            columns: ["current_text_version_id"]
            isOneToOne: false
            referencedRelation: "text_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_version_selections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          is_anonymous: boolean
          last_name: string | null
          phone_number: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_anonymous?: boolean
          last_name?: string | null
          phone_number?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_anonymous?: boolean
          last_name?: string | null
          phone_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      verse_feedback: {
        Row: {
          actioned: Database["public"]["Enums"]["feedback_actioned"]
          created_at: string | null
          created_by: string | null
          feedback_text: string | null
          feedback_type: Database["public"]["Enums"]["feedback_type"]
          id: string
          media_files_id: string
          updated_at: string | null
          updated_by: string | null
          verse_id: string
          version: number
        }
        Insert: {
          actioned?: Database["public"]["Enums"]["feedback_actioned"]
          created_at?: string | null
          created_by?: string | null
          feedback_text?: string | null
          feedback_type: Database["public"]["Enums"]["feedback_type"]
          id?: string
          media_files_id: string
          updated_at?: string | null
          updated_by?: string | null
          verse_id: string
          version?: number
        }
        Update: {
          actioned?: Database["public"]["Enums"]["feedback_actioned"]
          created_at?: string | null
          created_by?: string | null
          feedback_text?: string | null
          feedback_type?: Database["public"]["Enums"]["feedback_type"]
          id?: string
          media_files_id?: string
          updated_at?: string | null
          updated_by?: string | null
          verse_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "verse_feedback_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verse_feedback_media_files_id_fkey"
            columns: ["media_files_id"]
            isOneToOne: false
            referencedRelation: "media_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verse_feedback_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verse_feedback_verse_id_fkey"
            columns: ["verse_id"]
            isOneToOne: false
            referencedRelation: "verses"
            referencedColumns: ["id"]
          },
        ]
      }
      verse_listens: {
        Row: {
          id: string
          language_entity_id: string
          listened_at: string | null
          origin_share_id: string | null
          session_id: string
          user_id: string | null
          verse_id: string
        }
        Insert: {
          id?: string
          language_entity_id: string
          listened_at?: string | null
          origin_share_id?: string | null
          session_id: string
          user_id?: string | null
          verse_id: string
        }
        Update: {
          id?: string
          language_entity_id?: string
          listened_at?: string | null
          origin_share_id?: string | null
          session_id?: string
          user_id?: string | null
          verse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verse_listens_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verse_listens_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
          {
            foreignKeyName: "verse_listens_origin_share_id_fkey"
            columns: ["origin_share_id"]
            isOneToOne: false
            referencedRelation: "shares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verse_listens_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verse_listens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verse_listens_verse_id_fkey"
            columns: ["verse_id"]
            isOneToOne: false
            referencedRelation: "verses"
            referencedColumns: ["id"]
          },
        ]
      }
      verse_texts: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          id: string
          publish_status: Database["public"]["Enums"]["publish_status"]
          text_version_id: string | null
          updated_at: string | null
          verse_id: string
          verse_text: string
          version: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          publish_status?: Database["public"]["Enums"]["publish_status"]
          text_version_id?: string | null
          updated_at?: string | null
          verse_id: string
          verse_text: string
          version?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          publish_status?: Database["public"]["Enums"]["publish_status"]
          text_version_id?: string | null
          updated_at?: string | null
          verse_id?: string
          verse_text?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "verse_texts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verse_texts_text_version_id_fkey"
            columns: ["text_version_id"]
            isOneToOne: false
            referencedRelation: "text_version_progress"
            referencedColumns: ["text_version_id"]
          },
          {
            foreignKeyName: "verse_texts_text_version_id_fkey"
            columns: ["text_version_id"]
            isOneToOne: false
            referencedRelation: "text_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verse_texts_verse_id_fkey"
            columns: ["verse_id"]
            isOneToOne: false
            referencedRelation: "verses"
            referencedColumns: ["id"]
          },
        ]
      }
      verses: {
        Row: {
          chapter_id: string
          created_at: string | null
          global_order: number | null
          id: string
          updated_at: string | null
          verse_number: number
        }
        Insert: {
          chapter_id: string
          created_at?: string | null
          global_order?: number | null
          id: string
          updated_at?: string | null
          verse_number: number
        }
        Update: {
          chapter_id?: string
          created_at?: string | null
          global_order?: number | null
          id?: string
          updated_at?: string | null
          verse_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "verses_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      audio_version_book_progress: {
        Row: {
          audio_version_id: string | null
          book_id: string | null
          chapters_with_audio: number | null
          total_chapters: number | null
        }
        Relationships: []
      }
      audio_version_progress: {
        Row: {
          audio_version_id: string | null
          book_fraction: number | null
          books_complete: number | null
          chapter_fraction: number | null
          chapters_with_audio: number | null
          covered_verses: number | null
          language_entity_id: string | null
          total_books: number | null
          total_chapters: number | null
          total_verses: number | null
          verse_fraction: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audio_versions_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_versions_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
        ]
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      global_translation_statistics: {
        Row: {
          active_projects_total: number | null
          audio_portions_count: number | null
          audio_portions_percentage: number | null
          completed_projects_total: number | null
          full_audio_bible_count: number | null
          full_audio_bible_percentage: number | null
          generated_at: string | null
          text_portions_count: number | null
          text_portions_percentage: number | null
          total_chapters_completed: number | null
          total_languages: number | null
        }
        Relationships: []
      }
      language_coordinates_for_map: {
        Row: {
          bible_stats_computed_at: string | null
          bible_status: number | null
          has_audio_portions: boolean | null
          has_full_audio_bible: boolean | null
          has_jesus_film: boolean | null
          has_text_portions: boolean | null
          iso639_3: string | null
          language_entity_id: string | null
          language_name: string | null
          latitude: number | null
          location: unknown
          location_source: string | null
          longitude: number | null
          region_id: string | null
          region_name: string | null
          rolv_code: string | null
        }
        Relationships: [
          {
            foreignKeyName: "language_entities_regions_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "language_entities_regions_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
          {
            foreignKeyName: "language_entities_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "mv_region_stats"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "language_entities_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "region_funding"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "language_entities_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      language_funding_balances: {
        Row: {
          budget_cents: number | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          funding_status: Database["public"]["Enums"]["funding_status"] | null
          id: string | null
          language_entity_id: string | null
          remaining_budget_cents: number | null
          updated_at: string | null
        }
        Insert: {
          budget_cents?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          funding_status?: Database["public"]["Enums"]["funding_status"] | null
          id?: string | null
          language_entity_id?: string | null
          remaining_budget_cents?: never
          updated_at?: string | null
        }
        Update: {
          budget_cents?: number | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          funding_status?: Database["public"]["Enums"]["funding_status"] | null
          id?: string | null
          language_entity_id?: string | null
          remaining_budget_cents?: never
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "language_funding_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "language_funding_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: true
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "language_funding_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: true
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
        ]
      }
      language_listening_sessions_stats: {
        Row: {
          distinct_sessions: number | null
          language_entity_id: string | null
          total_duration_seconds: number | null
        }
        Relationships: []
      }
      mv_language_stats: {
        Row: {
          bible_status: number | null
          bible_year: string | null
          computed_at: string | null
          country_code: string | null
          country_count: number | null
          fcbh_url: string | null
          frontier_population: number | null
          grn_url: string | null
          has_audio_portions: boolean | null
          has_audio_recordings: boolean | null
          has_full_audio_bible: boolean | null
          has_jesus_film: boolean | null
          has_new_testament: boolean | null
          has_portions: boolean | null
          has_whole_bible: boolean | null
          hub_country: string | null
          iso639_3: string | null
          jf_url: string | null
          jp_scale: number | null
          language_entity_id: string | null
          language_name: string | null
          least_reached: boolean | null
          least_reached_population: number | null
          nbr_countries: number | null
          nbr_pgics: number | null
          nt_year: string | null
          people_group_count: number | null
          percent_christian: number | null
          percent_evangelical: number | null
          population: number | null
          portions_year: string | null
          primary_religion: string | null
          religion_code: string | null
          rolv_code: string | null
          status: string | null
          translation_need_questionable: boolean | null
        }
        Relationships: []
      }
      mv_people_group_stats: {
        Row: {
          affinity_bloc: string | null
          bible_status: number | null
          bible_year: string | null
          computed_at: string | null
          country_count: number | null
          frontier: boolean | null
          grn: boolean | null
          has_audio_recordings: boolean | null
          has_jesus_film: boolean | null
          image_url: string | null
          jf: boolean | null
          jpscale: number | null
          language_count: number | null
          least_reached: boolean | null
          name: string | null
          nt_year: string | null
          peop_name_across_countries: string | null
          peop_name_in_country: string | null
          people_cluster: string | null
          people_group_id: string | null
          people_id3: number | null
          percent_christian_pc: number | null
          percent_christian_pd: number | null
          percent_evangelical: number | null
          population: number | null
          portions_year: string | null
          primary_language_bible_status: number | null
          primary_language_has_new_testament: boolean | null
          primary_language_has_portions: boolean | null
          primary_language_has_whole_bible: boolean | null
          primary_language_name: string | null
          primary_language_rol3: string | null
          primary_religion: string | null
          rlg3: string | null
        }
        Relationships: []
      }
      mv_region_stats: {
        Row: {
          capital: string | null
          computed_at: string | null
          continent_code: string | null
          iso2: string | null
          iso3: string | null
          jp_country_name: string | null
          jp_region_name: string | null
          jpscale_ctry: number | null
          jpscale_image_url: string | null
          jpscale_text: string | null
          language_count: number | null
          languages_full_bible: number | null
          languages_new_testament: number | null
          languages_no_scripture: number | null
          languages_portions: number | null
          people_group_count: number | null
          percent_buddhism: number | null
          percent_christianity: number | null
          percent_ethnic_religions: number | null
          percent_hinduism: number | null
          percent_islam: number | null
          percent_non_religious: number | null
          percent_other_small: number | null
          population: number | null
          region_code: number | null
          region_id: string | null
          region_name: string | null
          religion_primary: string | null
          rlg3_primary: number | null
          rog3: string | null
          security_level: number | null
          window_status: string | null
        }
        Relationships: []
      }
      operation_balances: {
        Row: {
          allocation_count: number | null
          balance_cents: number | null
          category: Database["public"]["Enums"]["operation_category"] | null
          cost_count: number | null
          created_at: string | null
          currency_code: string | null
          last_cost_at: string | null
          operation_id: string | null
          operation_name: string | null
          status: Database["public"]["Enums"]["entity_status"] | null
          total_allocated_cents: number | null
          total_costs_cents: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      people_groups_coordinates_for_map: {
        Row: {
          bible_status: number | null
          country_count: number | null
          frontier: boolean | null
          has_audio_recordings: boolean | null
          has_jesus_film: boolean | null
          image_url: string | null
          jpscale: number | null
          language_count: number | null
          latitude: number | null
          least_reached: boolean | null
          location_point: unknown
          longitude: number | null
          peop_name_in_country: string | null
          people_group_id: string | null
          people_group_name: string | null
          percent_christian_pc: number | null
          percent_evangelical: number | null
          population: number | null
          primary_language_bible_status: number | null
          primary_language_name: string | null
          primary_language_rol3: string | null
          primary_religion: string | null
          region_id: string | null
          region_name: string | null
          stats_computed_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_groups_regions_people_group_id_fkey"
            columns: ["people_group_id"]
            isOneToOne: false
            referencedRelation: "mv_people_group_stats"
            referencedColumns: ["people_group_id"]
          },
          {
            foreignKeyName: "people_groups_regions_people_group_id_fkey"
            columns: ["people_group_id"]
            isOneToOne: false
            referencedRelation: "people_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_groups_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "mv_region_stats"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "people_groups_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "region_funding"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "people_groups_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      region_funding: {
        Row: {
          budget_cents: number | null
          funding_status: string | null
          region_id: string | null
          region_level: Database["public"]["Enums"]["region_level"] | null
          region_name: string | null
          remaining_budget_cents: number | null
        }
        Relationships: []
      }
      text_version_progress: {
        Row: {
          book_fraction: number | null
          books_complete: number | null
          chapter_fraction: number | null
          complete_chapters: number | null
          covered_verses: number | null
          language_entity_id: string | null
          text_version_id: string | null
          total_books: number | null
          total_chapters: number | null
          total_verses: number | null
          verse_fraction: number | null
        }
        Relationships: [
          {
            foreignKeyName: "text_versions_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "text_versions_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
        ]
      }
      user_bases: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string | null
          is_public: boolean | null
          location: unknown
          name: string | null
          region_id: string | null
          role_id: string | null
          role_key: string | null
          role_name: string | null
          role_resource_type:
            | Database["public"]["Enums"]["resource_type"]
            | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bases_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "mv_region_stats"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "bases_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "region_funding"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "bases_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_partner_orgs: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string | null
          is_individual: boolean | null
          is_public: boolean | null
          name: string | null
          role_id: string | null
          role_key: string | null
          role_name: string | null
          role_resource_type:
            | Database["public"]["Enums"]["resource_type"]
            | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_orgs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_projects: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string | null
          location: unknown
          name: string | null
          project_status: Database["public"]["Enums"]["project_status"] | null
          publish_status: Database["public"]["Enums"]["publish_status"] | null
          region_id: string | null
          region_name: string | null
          role_id: string | null
          role_key: string | null
          role_name: string | null
          role_resource_type:
            | Database["public"]["Enums"]["resource_type"]
            | null
          source_language_entity_id: string | null
          source_language_name: string | null
          target_language_entity_id: string | null
          target_language_name: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "mv_region_stats"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "projects_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "region_funding"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "projects_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_source_language_entity_id_fkey"
            columns: ["source_language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_source_language_entity_id_fkey"
            columns: ["source_language_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
          {
            foreignKeyName: "projects_target_language_entity_id_fkey"
            columns: ["target_language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_target_language_entity_id_fkey"
            columns: ["target_language_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_global_sessions_heatmap: {
        Row: {
          grid: unknown
          intensity: number | null
          languages: Json | null
          most_recent_chapter_listen: string | null
          most_recent_session_start: string | null
          session_count: number | null
          total_duration_seconds: number | null
        }
        Relationships: []
      }
      vw_iso_country_to_region: {
        Row: {
          code: string | null
          region_id: string | null
        }
        Relationships: []
      }
      vw_language_listens_heatmap: {
        Row: {
          event_count: number | null
          grid: unknown
          language_entity_id: string | null
          last_event_at: string | null
        }
        Relationships: []
      }
      vw_languages_by_people_group: {
        Row: {
          bible_status: number | null
          frontier_population: number | null
          has_audio_recordings: boolean | null
          has_jesus_film: boolean | null
          has_new_testament: boolean | null
          has_portions: boolean | null
          has_whole_bible: boolean | null
          is_primary: boolean | null
          iso639_3: string | null
          jp_scale: number | null
          language_country_count: number | null
          language_entity_id: string | null
          language_name: string | null
          language_people_group_count: number | null
          language_population: number | null
          least_reached_population: number | null
          people_group_id: string | null
          people_group_region_id: string | null
          percent_christian: number | null
          percent_evangelical: number | null
          primary_religion: string | null
          rolv_code: string | null
        }
        Relationships: [
          {
            foreignKeyName: "language_entities_people_groups_reg_people_group_region_id_fkey"
            columns: ["people_group_region_id"]
            isOneToOne: false
            referencedRelation: "people_groups_regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "language_entities_people_groups_regions_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "language_entities_people_groups_regions_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
          {
            foreignKeyName: "people_groups_regions_people_group_id_fkey"
            columns: ["people_group_id"]
            isOneToOne: false
            referencedRelation: "mv_people_group_stats"
            referencedColumns: ["people_group_id"]
          },
          {
            foreignKeyName: "people_groups_regions_people_group_id_fkey"
            columns: ["people_group_id"]
            isOneToOne: false
            referencedRelation: "people_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_languages_in_region: {
        Row: {
          bible_status: number | null
          country_count: number | null
          frontier_population: number | null
          has_audio_recordings: boolean | null
          has_jesus_film: boolean | null
          has_new_testament: boolean | null
          has_portions: boolean | null
          has_whole_bible: boolean | null
          iso639_3: string | null
          jp_scale: number | null
          language_entity_id: string | null
          language_name: string | null
          latitude: number | null
          least_reached_population: number | null
          location: unknown
          location_source: string | null
          longitude: number | null
          people_group_count: number | null
          percent_christian: number | null
          percent_evangelical: number | null
          population: number | null
          primary_religion: string | null
          region_id: string | null
          rolv_code: string | null
        }
        Relationships: [
          {
            foreignKeyName: "language_entities_regions_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "language_entities_regions_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
          {
            foreignKeyName: "language_entities_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "mv_region_stats"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "language_entities_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "region_funding"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "language_entities_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_people_groups_by_language: {
        Row: {
          bible_status: number | null
          country_count: number | null
          frontier: boolean | null
          has_audio_recordings: boolean | null
          has_jesus_film: boolean | null
          image_url: string | null
          instance_population: number | null
          is_primary: boolean | null
          jpscale: number | null
          language_count: number | null
          language_entity_id: string | null
          latitude: number | null
          least_reached: boolean | null
          location_point: unknown
          longitude: number | null
          peop_name_in_country: string | null
          people_group_id: string | null
          people_group_name: string | null
          people_id3: number | null
          percent_christian_pc: number | null
          percent_evangelical: number | null
          population: number | null
          primary_language_bible_status: number | null
          primary_language_name: string | null
          primary_language_rol3: string | null
          primary_religion: string | null
          region_id: string | null
          region_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "language_entities_people_groups_regions_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "language_entities_people_groups_regions_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
          {
            foreignKeyName: "people_groups_regions_people_group_id_fkey"
            columns: ["people_group_id"]
            isOneToOne: false
            referencedRelation: "mv_people_group_stats"
            referencedColumns: ["people_group_id"]
          },
          {
            foreignKeyName: "people_groups_regions_people_group_id_fkey"
            columns: ["people_group_id"]
            isOneToOne: false
            referencedRelation: "people_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_groups_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "mv_region_stats"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "people_groups_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "region_funding"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "people_groups_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_people_groups_in_region: {
        Row: {
          bible_status: number | null
          country_count: number | null
          frontier: boolean | null
          has_audio_recordings: boolean | null
          has_jesus_film: boolean | null
          image_url: string | null
          instance_population: number | null
          jpscale: number | null
          language_count: number | null
          latitude: number | null
          least_reached: boolean | null
          location_point: unknown
          longitude: number | null
          peop_name_in_country: string | null
          people_group_id: string | null
          people_group_name: string | null
          people_id3: number | null
          percent_christian_pc: number | null
          percent_evangelical: number | null
          population: number | null
          primary_language_bible_status: number | null
          primary_language_name: string | null
          primary_language_rol3: string | null
          primary_religion: string | null
          region_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_groups_regions_people_group_id_fkey"
            columns: ["people_group_id"]
            isOneToOne: false
            referencedRelation: "mv_people_group_stats"
            referencedColumns: ["people_group_id"]
          },
          {
            foreignKeyName: "people_groups_regions_people_group_id_fkey"
            columns: ["people_group_id"]
            isOneToOne: false
            referencedRelation: "people_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_groups_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "mv_region_stats"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "people_groups_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "region_funding"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "people_groups_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_regions_for_language: {
        Row: {
          iso2: string | null
          iso3: string | null
          jpscale_ctry: number | null
          language_entity_id: string | null
          languages_full_bible: number | null
          languages_new_testament: number | null
          languages_no_scripture: number | null
          languages_portions: number | null
          latitude: number | null
          location: unknown
          location_source: string | null
          longitude: number | null
          percent_buddhism: number | null
          percent_christianity: number | null
          percent_ethnic_religions: number | null
          percent_hinduism: number | null
          percent_islam: number | null
          percent_non_religious: number | null
          percent_other_small: number | null
          region_id: string | null
          region_language_count: number | null
          region_name: string | null
          region_people_group_count: number | null
          region_population: number | null
          rog3: string | null
          window_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "language_entities_regions_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "language_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "language_entities_regions_language_entity_id_fkey"
            columns: ["language_entity_id"]
            isOneToOne: false
            referencedRelation: "mv_language_stats"
            referencedColumns: ["language_entity_id"]
          },
          {
            foreignKeyName: "language_entities_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "mv_region_stats"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "language_entities_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "region_funding"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "language_entities_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_regions_for_people_group: {
        Row: {
          instance_population: number | null
          iso2: string | null
          iso3: string | null
          jpscale_ctry: number | null
          languages_full_bible: number | null
          languages_new_testament: number | null
          languages_no_scripture: number | null
          languages_portions: number | null
          latitude: number | null
          location_point: unknown
          longitude: number | null
          peop_name_in_country: string | null
          people_group_id: string | null
          percent_buddhism: number | null
          percent_christianity: number | null
          percent_ethnic_religions: number | null
          percent_hinduism: number | null
          percent_islam: number | null
          percent_non_religious: number | null
          percent_other_small: number | null
          region_id: string | null
          region_language_count: number | null
          region_name: string | null
          region_people_group_count: number | null
          region_population: number | null
          rog3: string | null
          window_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_groups_regions_people_group_id_fkey"
            columns: ["people_group_id"]
            isOneToOne: false
            referencedRelation: "mv_people_group_stats"
            referencedColumns: ["people_group_id"]
          },
          {
            foreignKeyName: "people_groups_regions_people_group_id_fkey"
            columns: ["people_group_id"]
            isOneToOne: false
            referencedRelation: "people_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_groups_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "mv_region_stats"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "people_groups_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "region_funding"
            referencedColumns: ["region_id"]
          },
          {
            foreignKeyName: "people_groups_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      calculate_language_funding_status: {
        Args: { language_id: string }
        Returns: Database["public"]["Enums"]["funding_status"]
      }
      check_language_project_allocations: {
        Args: { language_id: string }
        Returns: boolean
      }
      check_project_permission: {
        Args: {
          p_action: Database["public"]["Enums"]["permission_key"]
          p_project_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      convert_to_usd: {
        Args: {
          p_amount_cents: number
          p_as_of_date: string
          p_currency_code: string
        }
        Returns: number
      }
      cp1252_softmap: { Args: { input: string }; Returns: string }
      debug_language_coordinates_stats: {
        Args: {
          p_location_source?: string
          p_max_lat: number
          p_max_lng: number
          p_min_lat: number
          p_min_lng: number
        }
        Returns: {
          bbox_sample_count: number
          mv_sample_count: number
          total_in_bbox: number
          total_in_bbox_with_source_filter: number
          total_in_mv: number
        }[]
      }
      disablelongtransactions: { Args: never; Returns: string }
      drain_progress_refresh_queue: {
        Args: never
        Returns: {
          kind: string
          version_id: string
        }[]
      }
      dropgeometrycolumn:
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
      dropgeometrytable:
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
      enablelongtransactions: { Args: never; Returns: string }
      enqueue_progress_refresh: {
        Args: { kind_in: string; version_in: string }
        Returns: undefined
      }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      find_anonymous_user_by_contact: {
        Args: { p_email?: string; p_phone?: string }
        Returns: {
          email: string
          is_anonymous: boolean
          phone: string
          user_id: string
        }[]
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_active_projects_with_progress: {
        Args: never
        Returns: {
          completed_chapters: number
          has_audio: boolean
          has_text: boolean
          language_name: string
          progress_percentage: number
          project_id: string
          project_name: string
          total_chapters: number
        }[]
      }
      get_all_language_coordinates: {
        Args: {
          p_limit?: number
          p_location_source?: string
          p_max_lat: number
          p_max_lng: number
          p_min_lat: number
          p_min_lng: number
        }
        Returns: {
          bible_stats_computed_at: string
          bible_status: number
          has_audio_portions: boolean
          has_full_audio_bible: boolean
          has_jesus_film: boolean
          has_text_portions: boolean
          iso639_3: string
          language_entity_id: string
          language_name: string
          latitude: number
          location_source: string
          longitude: number
          region_id: string
          region_name: string
          rolv_code: string
        }[]
      }
      get_all_people_group_coordinates: {
        Args: {
          p_limit?: number
          p_location_source?: string
          p_max_lat: number
          p_max_lng: number
          p_min_lat: number
          p_min_lng: number
        }
        Returns: {
          bible_status: number
          country_count: number
          frontier: boolean
          has_audio_recordings: boolean
          has_jesus_film: boolean
          image_url: string
          jpscale: number
          language_count: number
          latitude: number
          least_reached: boolean
          longitude: number
          peop_name_in_country: string
          people_group_id: string
          people_group_name: string
          percent_christian_pc: number
          percent_evangelical: number
          population: number
          primary_language_bible_status: number
          primary_language_name: string
          primary_language_rol3: string
          primary_religion: string
          region_id: string
          region_name: string
          stats_computed_at: string
        }[]
      }
      get_all_users: {
        Args: {
          p_include_anonymous?: boolean
          p_page?: number
          p_page_size?: number
          p_search_query?: string
        }
        Returns: {
          created_at: string
          email: string
          first_name: string
          is_anonymous: boolean
          last_name: string
          phone_number: string
          total_count: number
          updated_at: string
          user_id: string
          user_roles: Json
        }[]
      }
      get_chapter_global_order:
        | { Args: { chapter_text_id: string }; Returns: number }
        | { Args: { chapter_uuid: string }; Returns: number }
      get_coordinates_by_region: {
        Args: { p_region_id: string }
        Returns: {
          bible_stats_computed_at: string
          has_audio_portions: boolean
          has_full_audio_bible: boolean
          has_text_portions: boolean
          iso639_3: string
          language_entity_id: string
          language_name: string
          latitude: number
          location_source: string
          longitude: number
          region_id: string
          rolv_code: string
        }[]
      }
      get_countries_with_bible_status: {
        Args: never
        Returns: {
          bible_status_score: number
          boundary_simplified: unknown
          language_count: number
          languages_full_bible: number
          languages_new_testament: number
          languages_no_scripture: number
          languages_portions: number
          region_id: string
          region_name: string
        }[]
      }
      get_country_code_from_point: {
        Args: { lat: number; lon: number }
        Returns: string
      }
      get_global_sessions_heatmap: {
        Args: {
          p_grid_size?: number
          p_max_lat: number
          p_max_lng: number
          p_min_lat: number
          p_min_lng: number
          p_point_limit?: number
          p_time_period_hours: number
        }
        Returns: {
          age_normalized: number
          intensity: number
          languages: Json
          lat: number
          lon: number
          most_recent_chapter_listen: string
          most_recent_session_start: string
          session_count: number
          total_duration_seconds: number
        }[]
      }
      get_global_sessions_heatmap_from_view:
        | {
            Args: {
              p_language_entity_id?: string
              p_max_lat: number
              p_max_lng: number
              p_min_lat: number
              p_min_lng: number
              p_point_limit?: number
              p_region_id?: string
              p_time_period_hours: number
            }
            Returns: {
              age_normalized: number
              intensity: number
              languages: Json
              lat: number
              lon: number
              most_recent_chapter_listen: string
              most_recent_session_start: string
              session_count: number
              total_duration_seconds: number
            }[]
          }
        | {
            Args: {
              p_max_lat: number
              p_max_lng: number
              p_min_lat: number
              p_min_lng: number
              p_point_limit?: number
              p_time_period_hours: number
            }
            Returns: {
              age_normalized: number
              intensity: number
              languages: Json
              lat: number
              lon: number
              most_recent_chapter_listen: string
              most_recent_session_start: string
              session_count: number
              total_duration_seconds: number
            }[]
          }
      get_grn_coordinates_unmatched_summary: {
        Args: never
        Returns: {
          count: number
          skip_reason: string
          unique_countries: number
          unique_grn_numbers: number
        }[]
      }
      get_grn_coordinates_unmatched_unresolved: {
        Args: { p_limit?: number; p_skip_reason?: string }
        Returns: {
          cache_id: string
          country_name: string
          first_seen_at: string
          grn_number: number
          id: string
          iso_code: string
          language_name: string
          last_seen_at: string
          skip_reason: string
        }[]
      }
      get_language_coordinates: {
        Args: { p_language_entity_id: string }
        Returns: {
          bible_stats_computed_at: string
          has_audio_portions: boolean
          has_full_audio_bible: boolean
          has_text_portions: boolean
          iso639_3: string
          language_entity_id: string
          latitude: number
          location_source: string
          longitude: number
          region_id: string
          region_name: string
          rolv_code: string
        }[]
      }
      get_language_entity_hierarchy: {
        Args: {
          entity_id: string
          generations_down?: number
          generations_up?: number
        }
        Returns: {
          generation_distance: number
          hierarchy_entity_id: string
          hierarchy_entity_level: string
          hierarchy_entity_name: string
          hierarchy_parent_id: string
          relationship_type: string
        }[]
      }
      get_language_entity_path: { Args: { entity_id: string }; Returns: string }
      get_operation_balance: {
        Args: { operation_uuid: string }
        Returns: number
      }
      get_project_balance: { Args: { project_uuid: string }; Returns: number }
      get_recent_bible_audio_uploads: {
        Args: { limit_count?: number }
        Returns: {
          audio_version_id: string
          book_name: string
          chapter_number: number
          language_name: string
          media_file_id: string
          object_key: string
          uploaded_at: string
        }[]
      }
      get_recent_public_updates: {
        Args: { limit_count?: number }
        Returns: {
          body: string
          created_at: string
          language_name: string
          media_keys: string[]
          project_id: string
          project_name: string
          title: string
          update_id: string
        }[]
      }
      get_region_bbox_by_id: {
        Args: { p_region_id: string }
        Returns: {
          center_lat: number
          center_lon: number
          id: string
          level: Database["public"]["Enums"]["region_level"]
          max_lat: number
          max_lon: number
          min_lat: number
          min_lon: number
          name: string
          parent_id: string
        }[]
      }
      get_region_boundary_simplified_by_id: {
        Args: { p_region_id: string; p_tolerance?: number }
        Returns: {
          boundary: unknown
        }[]
      }
      get_region_header_and_properties_by_id: {
        Args: { p_region_id: string }
        Returns: {
          id: string
          level: Database["public"]["Enums"]["region_level"]
          name: string
          parent_id: string
          properties: Json
        }[]
      }
      get_region_hierarchy: {
        Args: {
          generations_down?: number
          generations_up?: number
          region_id: string
        }
        Returns: {
          generation_distance: number
          hierarchy_parent_id: string
          hierarchy_region_id: string
          hierarchy_region_level: string
          hierarchy_region_name: string
          relationship_type: string
        }[]
      }
      get_region_minimal_by_point: {
        Args: {
          lat: number
          lon: number
          lookup_level?: Database["public"]["Enums"]["region_level"]
        }
        Returns: {
          center_lat: number
          center_lon: number
          id: string
          level: Database["public"]["Enums"]["region_level"]
          max_lat: number
          max_lon: number
          min_lat: number
          min_lon: number
          name: string
          parent_id: string
        }[]
      }
      get_region_path: { Args: { region_id: string }; Returns: string }
      get_role_priority: { Args: { role_id: string }; Returns: number }
      get_unallocated_amount: {
        Args: { donation_uuid: string }
        Returns: number
      }
      get_user_roles: {
        Args: { target_user_id: string }
        Returns: {
          base_id: string
          is_global: boolean
          partner_org_id: string
          project_id: string
          resource_type: string
          role_key: string
          role_name: string
        }[]
      }
      get_verse_global_order:
        | { Args: { verse_text_id: string }; Returns: number }
        | { Args: { verse_uuid: string }; Returns: number }
      gettransactionid: { Args: never; Returns: unknown }
      has_active_allocation: {
        Args: {
          p_exclude_allocation_id?: string
          p_partner_org_id: string
          p_project_id: string
        }
        Returns: boolean
      }
      has_permission: {
        Args: {
          p_action: Database["public"]["Enums"]["permission_key"]
          p_resource_id: string
          p_resource_type: Database["public"]["Enums"]["resource_type"]
          p_user_id: string
        }
        Returns: boolean
      }
      is_base_member: { Args: { p_base_id: string }; Returns: boolean }
      is_partner_org_member: {
        Args: { p_partner_org_id: string }
        Returns: boolean
      }
      is_project_member: { Args: { p_project_id: string }; Returns: boolean }
      list_languages_for_region: {
        Args: { p_include_descendants?: boolean; p_region_id: string }
        Returns: {
          id: string
          level: Database["public"]["Enums"]["language_entity_level"]
          name: string
        }[]
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      mojibake_fix_hard: { Args: { value: string }; Returns: string }
      mojibake_fix_multi: { Args: { value: string }; Returns: string }
      populate_geometry_columns:
        | { Args: { use_typmod?: boolean }; Returns: string }
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      recommend_language_versions: {
        Args: {
          filter_type?: Database["public"]["Enums"]["version_filter_type"]
          include_regions?: boolean
          lookback_days?: number
          max_results?: number
        }
        Returns: {
          alias_id: string
          alias_name: string
          alias_similarity_score: number
          audio_version_count: number
          audio_versions: Json
          entity_id: string
          entity_level: string
          entity_name: string
          entity_parent_id: string
          regions: Json
          similarity_threshold_used: number
          text_version_count: number
          text_versions: Json
        }[]
      }
      refresh_all_global_orders: { Args: never; Returns: undefined }
      refresh_all_stats_mvs: { Args: never; Returns: undefined }
      refresh_language_coordinates_map: { Args: never; Returns: undefined }
      refresh_mv_language_stats: { Args: never; Returns: undefined }
      refresh_mv_people_group_stats: { Args: never; Returns: undefined }
      refresh_mv_region_stats: { Args: never; Returns: undefined }
      refresh_people_groups_coordinates_map: { Args: never; Returns: undefined }
      refresh_progress_materialized_views_concurrently: {
        Args: never
        Returns: undefined
      }
      refresh_progress_materialized_views_full: {
        Args: never
        Returns: undefined
      }
      refresh_progress_materialized_views_safe: {
        Args: never
        Returns: undefined
      }
      refresh_region_spatial_cache: {
        Args: { p_region_id: string }
        Returns: undefined
      }
      resolve_grn_coordinates_unmatched: {
        Args: {
          p_ids: string[]
          p_resolution_notes?: string
          p_resolved_by?: string
        }
        Returns: number
      }
      resolve_project_id: {
        Args: { p_record_id: string; p_table_name: string }
        Returns: string
      }
      search_language_aliases: {
        Args: {
          include_regions?: boolean
          max_results?: number
          min_similarity?: number
          search_query: string
        }
        Returns: {
          alias_id: string
          alias_name: string
          alias_similarity_score: number
          entity_id: string
          entity_level: string
          entity_name: string
          entity_parent_id: string
          regions: Json
          similarity_threshold_used: number
        }[]
      }
      search_language_aliases_with_versions: {
        Args: {
          filter_type?: Database["public"]["Enums"]["version_filter_type"]
          include_regions?: boolean
          max_results?: number
          min_similarity?: number
          search_query: string
        }
        Returns: {
          alias_id: string
          alias_name: string
          alias_similarity_score: number
          audio_version_count: number
          audio_versions: Json
          entity_id: string
          entity_level: string
          entity_name: string
          entity_parent_id: string
          regions: Json
          similarity_threshold_used: number
          text_version_count: number
          text_versions: Json
        }[]
      }
      search_operations: {
        Args: {
          max_results?: number
          min_similarity?: number
          search_query: string
        }
        Returns: {
          category: string
          operation_id: string
          operation_name: string
          similarity_score: number
        }[]
      }
      search_partner_orgs: {
        Args: { max_results?: number; search_query: string }
        Returns: {
          description: string
          id: string
          name: string
          similarity_score: number
        }[]
      }
      search_projects: {
        Args: {
          max_results?: number
          min_similarity?: number
          search_query: string
        }
        Returns: {
          project_id: string
          project_name: string
          similarity_score: number
          target_language_entity_id: string
          target_language_name: string
        }[]
      }
      search_region_aliases: {
        Args: {
          include_languages?: boolean
          max_results?: number
          min_similarity?: number
          search_query: string
        }
        Returns: {
          alias_id: string
          alias_name: string
          alias_similarity_score: number
          languages: Json
          region_id: string
          region_level: string
          region_name: string
          region_parent_id: string
          similarity_threshold_used: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_askml:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geom: unknown }; Returns: number }
        | { Args: { geog: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      transform_grn_coordinates_cache_to_language_entities_regions: {
        Args: never
        Returns: {
          matched: number
          processed: number
          skipped_no_language_entity: number
          skipped_no_region: number
          upserted: number
        }[]
      }
      transform_jp_countries_cache_to_regions: {
        Args: never
        Returns: {
          aliases_created: number
          countries_created: number
          countries_matched: number
          countries_processed: number
          errors: Json
          regions_updated: number
          sources_created: number
        }[]
      }
      transform_jp_people_groups_cache:
        | {
            Args: never
            Returns: {
              errors: Json
              languages_created: number
              languages_linked: number
              people_groups_created: number
              people_groups_regions_created: number
              people_groups_regions_updated: number
              people_groups_updated: number
              processed_count: number
              total_remaining: number
              unmatched_languages_count: number
              unmatched_regions_count: number
            }[]
          }
        | {
            Args: { batch_size?: number; start_offset?: number }
            Returns: {
              errors: Json
              languages_created: number
              languages_linked: number
              people_groups_created: number
              people_groups_regions_created: number
              people_groups_regions_updated: number
              people_groups_updated: number
              processed_count: number
              total_remaining: number
              unmatched_languages_count: number
              unmatched_regions_count: number
            }[]
          }
      transform_language_caches_to_entities: {
        Args: never
        Returns: {
          grn_created: number
          grn_matched: number
          jp_created: number
          jp_matched: number
        }[]
      }
      try_fix_mojibake: { Args: { value: string }; Returns: string }
      try_fix_mojibake_v2: { Args: { value: string }; Returns: string }
      unlockrows: { Args: { "": string }; Returns: number }
      update_region_funding_status: {
        Args: { region_id: string }
        Returns: undefined
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      validate_grn_matching_coverage: {
        Args: never
        Returns: {
          entries_with_sources: number
          entries_without_sources: number
          missing_grn_ids: number[]
          total_grn_entries: number
        }[]
      }
      validate_grn_matching_duplicate_ids: {
        Args: never
        Returns: {
          entity_count: number
          entity_ids: string[]
          entity_names: string[]
          grn_language_id: string
        }[]
      }
      validate_grn_matching_iso_consistency: {
        Args: never
        Returns: {
          are_related: boolean
          entity_count: number
          entity_ids: string[]
          entity_names: string[]
          iso639_3: string
        }[]
      }
      validate_grn_matching_name_consistency: {
        Args: never
        Returns: {
          entity_name: string
          grn_id_count: number
          grn_names: string[]
          language_entity_id: string
        }[]
      }
      validate_grn_matching_parent_child: {
        Args: never
        Returns: {
          entity_id: string
          entity_name: string
          entity_parent_id: string
          grn_language_id: number
          grn_name: string
          grn_parent_id: number
          parent_grn_id_matches: boolean
        }[]
      }
      validate_grn_matching_summary: {
        Args: never
        Returns: {
          check_name: string
          details: Json
          issue_count: number
          status: string
        }[]
      }
      validate_verse_range:
        | {
            Args: { end_verse_text_id: string; start_verse_text_id: string }
            Returns: boolean
          }
        | {
            Args: { end_verse_uuid: string; start_verse_uuid: string }
            Returns: boolean
          }
    }
    Enums: {
      bookmark_type: "passage"
      budget_item_category: "meals" | "housing" | "transport" | "equipment"
      change_type: "create" | "update" | "delete"
      check_status: "pending" | "approved" | "rejected" | "requires_review"
      connectivity_type: "wifi" | "cellular" | "offline" | "unknown"
      contribution_status: "approved" | "not_approved"
      donation_intent_type: "language" | "region" | "operation" | "unrestricted"
      donation_status:
        | "draft"
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "refunded"
        | "cancelled"
      entity_status:
        | "draft"
        | "available"
        | "funded"
        | "archived"
        | "in_progress"
      feedback_actioned: "pending" | "actioned" | "rejected"
      feedback_type: "approved" | "change_required"
      funding_status:
        | "draft"
        | "available"
        | "in_progress"
        | "funded"
        | "archived"
      language_entity_level: "family" | "language" | "dialect" | "mother_tongue"
      location_source_type: "device" | "ip" | "unknown"
      media_type: "audio" | "video" | "image"
      operation_category:
        | "travel"
        | "administration"
        | "legal"
        | "server"
        | "marketing"
        | "development"
      payment_attempt_status:
        | "requires_payment_method"
        | "requires_confirmation"
        | "requires_action"
        | "processing"
        | "requires_capture"
        | "succeeded"
        | "canceled"
        | "failed"
      payment_method_type: "card" | "us_bank_account" | "sepa_debit"
      permission_key:
        | "system.admin"
        | "team.read"
        | "team.write"
        | "team.delete"
        | "team.invite"
        | "team.manage_roles"
        | "project.read"
        | "project.write"
        | "project.delete"
        | "project.invite"
        | "project.manage_roles"
        | "base.read"
        | "base.write"
        | "base.delete"
        | "base.manage_roles"
        | "partner.read"
        | "partner.manage_roles"
        | "budget.read"
        | "budget.write"
        | "contribution.read"
        | "contribution.write"
        | "verse_feedback.read"
        | "verse_feedback.write"
        | "verse_feedback.delete"
      platform_type: "ios" | "android" | "web" | "desktop"
      playlist_item_type: "passage" | "custom_text"
      project_status: "precreated" | "active" | "completed" | "cancelled"
      publish_status: "pending" | "published" | "archived"
      region_level:
        | "continent"
        | "world_region"
        | "country"
        | "state"
        | "province"
        | "district"
        | "town"
        | "village"
      resource_type: "global" | "project" | "base" | "partner"
      scripture_coverage: "none" | "portions" | "ot" | "nt" | "full_bible"
      segment_type: "source" | "target"
      share_entity_type: "app" | "chapter" | "playlist" | "verse" | "passage"
      subscription_status:
        | "active"
        | "canceled"
        | "past_due"
        | "unpaid"
        | "incomplete"
        | "incomplete_expired"
        | "trialing"
        | "paused"
      target_type:
        | "chapter"
        | "book"
        | "sermon"
        | "passage"
        | "verse"
        | "podcast"
        | "film_segment"
        | "audio_segment"
      testament: "old" | "new"
      text_version_source:
        | "official_translation"
        | "ai_transcription"
        | "user_submitted"
      transaction_kind: "payment" | "refund" | "adjustment" | "transfer"
      upload_status: "pending" | "uploading" | "completed" | "failed"
      version_filter_type:
        | "audio_only"
        | "text_only"
        | "both_required"
        | "either"
      wallet_tx_type: "deposit" | "withdrawal" | "adjustment"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      bookmark_type: ["passage"],
      budget_item_category: ["meals", "housing", "transport", "equipment"],
      change_type: ["create", "update", "delete"],
      check_status: ["pending", "approved", "rejected", "requires_review"],
      connectivity_type: ["wifi", "cellular", "offline", "unknown"],
      contribution_status: ["approved", "not_approved"],
      donation_intent_type: ["language", "region", "operation", "unrestricted"],
      donation_status: [
        "draft",
        "pending",
        "processing",
        "completed",
        "failed",
        "refunded",
        "cancelled",
      ],
      entity_status: [
        "draft",
        "available",
        "funded",
        "archived",
        "in_progress",
      ],
      feedback_actioned: ["pending", "actioned", "rejected"],
      feedback_type: ["approved", "change_required"],
      funding_status: [
        "draft",
        "available",
        "in_progress",
        "funded",
        "archived",
      ],
      language_entity_level: ["family", "language", "dialect", "mother_tongue"],
      location_source_type: ["device", "ip", "unknown"],
      media_type: ["audio", "video", "image"],
      operation_category: [
        "travel",
        "administration",
        "legal",
        "server",
        "marketing",
        "development",
      ],
      payment_attempt_status: [
        "requires_payment_method",
        "requires_confirmation",
        "requires_action",
        "processing",
        "requires_capture",
        "succeeded",
        "canceled",
        "failed",
      ],
      payment_method_type: ["card", "us_bank_account", "sepa_debit"],
      permission_key: [
        "system.admin",
        "team.read",
        "team.write",
        "team.delete",
        "team.invite",
        "team.manage_roles",
        "project.read",
        "project.write",
        "project.delete",
        "project.invite",
        "project.manage_roles",
        "base.read",
        "base.write",
        "base.delete",
        "base.manage_roles",
        "partner.read",
        "partner.manage_roles",
        "budget.read",
        "budget.write",
        "contribution.read",
        "contribution.write",
        "verse_feedback.read",
        "verse_feedback.write",
        "verse_feedback.delete",
      ],
      platform_type: ["ios", "android", "web", "desktop"],
      playlist_item_type: ["passage", "custom_text"],
      project_status: ["precreated", "active", "completed", "cancelled"],
      publish_status: ["pending", "published", "archived"],
      region_level: [
        "continent",
        "world_region",
        "country",
        "state",
        "province",
        "district",
        "town",
        "village",
      ],
      resource_type: ["global", "project", "base", "partner"],
      scripture_coverage: ["none", "portions", "ot", "nt", "full_bible"],
      segment_type: ["source", "target"],
      share_entity_type: ["app", "chapter", "playlist", "verse", "passage"],
      subscription_status: [
        "active",
        "canceled",
        "past_due",
        "unpaid",
        "incomplete",
        "incomplete_expired",
        "trialing",
        "paused",
      ],
      target_type: [
        "chapter",
        "book",
        "sermon",
        "passage",
        "verse",
        "podcast",
        "film_segment",
        "audio_segment",
      ],
      testament: ["old", "new"],
      text_version_source: [
        "official_translation",
        "ai_transcription",
        "user_submitted",
      ],
      transaction_kind: ["payment", "refund", "adjustment", "transfer"],
      upload_status: ["pending", "uploading", "completed", "failed"],
      version_filter_type: [
        "audio_only",
        "text_only",
        "both_required",
        "either",
      ],
      wallet_tx_type: ["deposit", "withdrawal", "adjustment"],
    },
  },
} as const


export type Json = string | number | boolean | null | {
    [key: string]: Json | undefined;
} | Json[];
export type Database = {
    graphql_public: {
        Tables: {
            [_ in never]: never;
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            graphql: {
                Args: {
                    extensions?: Json;
                    operationName?: string;
                    query?: string;
                    variables?: Json;
                };
                Returns: Json;
            };
        };
        Enums: {
            [_ in never]: never;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
    public: {
        Tables: {
            app_downloads: {
                Row: {
                    app_version: string;
                    continent_code: string | null;
                    country_code: string | null;
                    device_id: string;
                    downloaded_at: string | null;
                    id: string;
                    location: unknown;
                    origin_share_id: string | null;
                    os: string | null;
                    os_version: string | null;
                    platform: Database["public"]["Enums"]["platform_type"];
                    region_code: string | null;
                    user_id: string | null;
                };
                Insert: {
                    app_version: string;
                    continent_code?: string | null;
                    country_code?: string | null;
                    device_id: string;
                    downloaded_at?: string | null;
                    id?: string;
                    location?: unknown;
                    origin_share_id?: string | null;
                    os?: string | null;
                    os_version?: string | null;
                    platform: Database["public"]["Enums"]["platform_type"];
                    region_code?: string | null;
                    user_id?: string | null;
                };
                Update: {
                    app_version?: string;
                    continent_code?: string | null;
                    country_code?: string | null;
                    device_id?: string;
                    downloaded_at?: string | null;
                    id?: string;
                    location?: unknown;
                    origin_share_id?: string | null;
                    os?: string | null;
                    os_version?: string | null;
                    platform?: Database["public"]["Enums"]["platform_type"];
                    region_code?: string | null;
                    user_id?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "app_downloads_origin_share_id_fkey";
                        columns: ["origin_share_id"];
                        isOneToOne: false;
                        referencedRelation: "shares";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "app_downloads_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    }
                ];
            };
            audio_versions: {
                Row: {
                    bible_version_id: string;
                    created_at: string | null;
                    created_by: string | null;
                    deleted_at: string | null;
                    id: string;
                    language_entity_id: string;
                    name: string;
                    project_id: string | null;
                    updated_at: string | null;
                };
                Insert: {
                    bible_version_id: string;
                    created_at?: string | null;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    id?: string;
                    language_entity_id: string;
                    name: string;
                    project_id?: string | null;
                    updated_at?: string | null;
                };
                Update: {
                    bible_version_id?: string;
                    created_at?: string | null;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    id?: string;
                    language_entity_id?: string;
                    name?: string;
                    project_id?: string | null;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "audio_versions_bible_version_id_fkey";
                        columns: ["bible_version_id"];
                        isOneToOne: false;
                        referencedRelation: "bible_versions";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "audio_versions_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "audio_versions_language_entity_id_fkey";
                        columns: ["language_entity_id"];
                        isOneToOne: false;
                        referencedRelation: "language_entities";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "audio_versions_project_id_fkey";
                        columns: ["project_id"];
                        isOneToOne: false;
                        referencedRelation: "projects";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "audio_versions_project_id_fkey";
                        columns: ["project_id"];
                        isOneToOne: false;
                        referencedRelation: "vw_project_balances";
                        referencedColumns: ["project_id"];
                    },
                    {
                        foreignKeyName: "audio_versions_project_id_fkey";
                        columns: ["project_id"];
                        isOneToOne: false;
                        referencedRelation: "vw_project_funding_summary";
                        referencedColumns: ["project_id"];
                    }
                ];
            };
            bases: {
                Row: {
                    created_at: string | null;
                    created_by: string | null;
                    id: string;
                    location: unknown;
                    name: string;
                    region_id: string | null;
                    updated_at: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    created_by?: string | null;
                    id?: string;
                    location?: unknown;
                    name: string;
                    region_id?: string | null;
                    updated_at?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    created_by?: string | null;
                    id?: string;
                    location?: unknown;
                    name?: string;
                    region_id?: string | null;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "bases_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    }
                ];
            };
            bases_teams: {
                Row: {
                    assigned_at: string;
                    base_id: string;
                    id: string;
                    role_id: string;
                    team_id: string;
                    unassigned_at: string | null;
                };
                Insert: {
                    assigned_at?: string;
                    base_id: string;
                    id?: string;
                    role_id: string;
                    team_id: string;
                    unassigned_at?: string | null;
                };
                Update: {
                    assigned_at?: string;
                    base_id?: string;
                    id?: string;
                    role_id?: string;
                    team_id?: string;
                    unassigned_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "bases_teams_base_id_fkey";
                        columns: ["base_id"];
                        isOneToOne: false;
                        referencedRelation: "bases";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "bases_teams_role_id_fkey";
                        columns: ["role_id"];
                        isOneToOne: false;
                        referencedRelation: "roles";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "bases_teams_team_id_fkey";
                        columns: ["team_id"];
                        isOneToOne: false;
                        referencedRelation: "teams";
                        referencedColumns: ["id"];
                    }
                ];
            };
            bible_versions: {
                Row: {
                    created_at: string | null;
                    id: string;
                    name: string;
                    structure_notes: string | null;
                    updated_at: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    id: string;
                    name: string;
                    structure_notes?: string | null;
                    updated_at?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    id?: string;
                    name?: string;
                    structure_notes?: string | null;
                    updated_at?: string | null;
                };
                Relationships: [];
            };
            books: {
                Row: {
                    bible_version_id: string;
                    book_number: number;
                    created_at: string | null;
                    global_order: number | null;
                    id: string;
                    name: string;
                    testament: Database["public"]["Enums"]["testament"] | null;
                    updated_at: string | null;
                };
                Insert: {
                    bible_version_id: string;
                    book_number: number;
                    created_at?: string | null;
                    global_order?: number | null;
                    id: string;
                    name: string;
                    testament?: Database["public"]["Enums"]["testament"] | null;
                    updated_at?: string | null;
                };
                Update: {
                    bible_version_id?: string;
                    book_number?: number;
                    created_at?: string | null;
                    global_order?: number | null;
                    id?: string;
                    name?: string;
                    testament?: Database["public"]["Enums"]["testament"] | null;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "books_bible_version_id_fkey";
                        columns: ["bible_version_id"];
                        isOneToOne: false;
                        referencedRelation: "bible_versions";
                        referencedColumns: ["id"];
                    }
                ];
            };
            chapter_listens: {
                Row: {
                    chapter_id: string;
                    id: string;
                    language_entity_id: string;
                    listened_at: string | null;
                    origin_share_id: string | null;
                    session_id: string;
                    user_id: string | null;
                };
                Insert: {
                    chapter_id: string;
                    id?: string;
                    language_entity_id: string;
                    listened_at?: string | null;
                    origin_share_id?: string | null;
                    session_id: string;
                    user_id?: string | null;
                };
                Update: {
                    chapter_id?: string;
                    id?: string;
                    language_entity_id?: string;
                    listened_at?: string | null;
                    origin_share_id?: string | null;
                    session_id?: string;
                    user_id?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "chapter_listens_chapter_id_fkey";
                        columns: ["chapter_id"];
                        isOneToOne: false;
                        referencedRelation: "chapters";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "chapter_listens_language_entity_id_fkey";
                        columns: ["language_entity_id"];
                        isOneToOne: false;
                        referencedRelation: "language_entities";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "chapter_listens_origin_share_id_fkey";
                        columns: ["origin_share_id"];
                        isOneToOne: false;
                        referencedRelation: "shares";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "chapter_listens_session_id_fkey";
                        columns: ["session_id"];
                        isOneToOne: false;
                        referencedRelation: "sessions";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "chapter_listens_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    }
                ];
            };
            chapters: {
                Row: {
                    book_id: string;
                    chapter_number: number;
                    created_at: string | null;
                    global_order: number | null;
                    id: string;
                    total_verses: number;
                    updated_at: string | null;
                };
                Insert: {
                    book_id: string;
                    chapter_number: number;
                    created_at?: string | null;
                    global_order?: number | null;
                    id: string;
                    total_verses: number;
                    updated_at?: string | null;
                };
                Update: {
                    book_id?: string;
                    chapter_number?: number;
                    created_at?: string | null;
                    global_order?: number | null;
                    id?: string;
                    total_verses?: number;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "chapters_book_id_fkey";
                        columns: ["book_id"];
                        isOneToOne: false;
                        referencedRelation: "books";
                        referencedColumns: ["id"];
                    }
                ];
            };
            donation_allocations: {
                Row: {
                    amount_cents: number;
                    created_at: string;
                    created_by: string;
                    currency_code: string;
                    donation_id: string;
                    effective_from: string;
                    effective_to: string | null;
                    id: string;
                    notes: string | null;
                    operation_id: string | null;
                    project_id: string | null;
                };
                Insert: {
                    amount_cents: number;
                    created_at?: string;
                    created_by: string;
                    currency_code?: string;
                    donation_id: string;
                    effective_from?: string;
                    effective_to?: string | null;
                    id?: string;
                    notes?: string | null;
                    operation_id?: string | null;
                    project_id?: string | null;
                };
                Update: {
                    amount_cents?: number;
                    created_at?: string;
                    created_by?: string;
                    currency_code?: string;
                    donation_id?: string;
                    effective_from?: string;
                    effective_to?: string | null;
                    id?: string;
                    notes?: string | null;
                    operation_id?: string | null;
                    project_id?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "donation_allocations_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "donation_allocations_donation_id_fkey";
                        columns: ["donation_id"];
                        isOneToOne: false;
                        referencedRelation: "donations";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "donation_allocations_donation_id_fkey";
                        columns: ["donation_id"];
                        isOneToOne: false;
                        referencedRelation: "vw_donation_remaining";
                        referencedColumns: ["donation_id"];
                    },
                    {
                        foreignKeyName: "donation_allocations_donation_id_fkey";
                        columns: ["donation_id"];
                        isOneToOne: false;
                        referencedRelation: "vw_unallocated_donations";
                        referencedColumns: ["donation_id"];
                    },
                    {
                        foreignKeyName: "donation_allocations_operation_id_fkey";
                        columns: ["operation_id"];
                        isOneToOne: false;
                        referencedRelation: "operations";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "donation_allocations_operation_id_fkey";
                        columns: ["operation_id"];
                        isOneToOne: false;
                        referencedRelation: "vw_operation_balances";
                        referencedColumns: ["operation_id"];
                    },
                    {
                        foreignKeyName: "donation_allocations_project_id_fkey";
                        columns: ["project_id"];
                        isOneToOne: false;
                        referencedRelation: "projects";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "donation_allocations_project_id_fkey";
                        columns: ["project_id"];
                        isOneToOne: false;
                        referencedRelation: "vw_project_balances";
                        referencedColumns: ["project_id"];
                    },
                    {
                        foreignKeyName: "donation_allocations_project_id_fkey";
                        columns: ["project_id"];
                        isOneToOne: false;
                        referencedRelation: "vw_project_funding_summary";
                        referencedColumns: ["project_id"];
                    }
                ];
            };
            donations: {
                Row: {
                    amount_cents: number;
                    cancelled_at: string | null;
                    completed_at: string | null;
                    created_at: string;
                    created_by: string | null;
                    currency_code: string;
                    deleted_at: string | null;
                    id: string;
                    intent_language_entity_id: string | null;
                    intent_operation_id: string | null;
                    intent_region_id: string | null;
                    intent_type: Database["public"]["Enums"]["donation_intent_type"];
                    is_recurring: boolean;
                    partner_org_id: string | null;
                    payment_method: Database["public"]["Enums"]["payment_method_type"];
                    status: Database["public"]["Enums"]["donation_status"];
                    stripe_customer_id: string;
                    stripe_payment_intent_id: string | null;
                    stripe_subscription_id: string | null;
                    updated_at: string | null;
                    user_id: string | null;
                };
                Insert: {
                    amount_cents: number;
                    cancelled_at?: string | null;
                    completed_at?: string | null;
                    created_at?: string;
                    created_by?: string | null;
                    currency_code?: string;
                    deleted_at?: string | null;
                    id?: string;
                    intent_language_entity_id?: string | null;
                    intent_operation_id?: string | null;
                    intent_region_id?: string | null;
                    intent_type: Database["public"]["Enums"]["donation_intent_type"];
                    is_recurring?: boolean;
                    partner_org_id?: string | null;
                    payment_method: Database["public"]["Enums"]["payment_method_type"];
                    status?: Database["public"]["Enums"]["donation_status"];
                    stripe_customer_id: string;
                    stripe_payment_intent_id?: string | null;
                    stripe_subscription_id?: string | null;
                    updated_at?: string | null;
                    user_id?: string | null;
                };
                Update: {
                    amount_cents?: number;
                    cancelled_at?: string | null;
                    completed_at?: string | null;
                    created_at?: string;
                    created_by?: string | null;
                    currency_code?: string;
                    deleted_at?: string | null;
                    id?: string;
                    intent_language_entity_id?: string | null;
                    intent_operation_id?: string | null;
                    intent_region_id?: string | null;
                    intent_type?: Database["public"]["Enums"]["donation_intent_type"];
                    is_recurring?: boolean;
                    partner_org_id?: string | null;
                    payment_method?: Database["public"]["Enums"]["payment_method_type"];
                    status?: Database["public"]["Enums"]["donation_status"];
                    stripe_customer_id?: string;
                    stripe_payment_intent_id?: string | null;
                    stripe_subscription_id?: string | null;
                    updated_at?: string | null;
                    user_id?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "donations_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "donations_intent_language_entity_id_fkey";
                        columns: ["intent_language_entity_id"];
                        isOneToOne: false;
                        referencedRelation: "language_entities";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "donations_intent_operation_id_fkey";
                        columns: ["intent_operation_id"];
                        isOneToOne: false;
                        referencedRelation: "operations";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "donations_intent_operation_id_fkey";
                        columns: ["intent_operation_id"];
                        isOneToOne: false;
                        referencedRelation: "vw_operation_balances";
                        referencedColumns: ["operation_id"];
                    },
                    {
                        foreignKeyName: "donations_intent_region_id_fkey";
                        columns: ["intent_region_id"];
                        isOneToOne: false;
                        referencedRelation: "regions";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "donations_partner_org_id_fkey";
                        columns: ["partner_org_id"];
                        isOneToOne: false;
                        referencedRelation: "partner_orgs";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "donations_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    }
                ];
            };
            exchange_rates: {
                Row: {
                    as_of_date: string;
                    base_currency: string;
                    fetched_at: string;
                    id: string;
                    provider: string;
                    rates: Json;
                };
                Insert: {
                    as_of_date: string;
                    base_currency?: string;
                    fetched_at?: string;
                    id?: string;
                    provider: string;
                    rates: Json;
                };
                Update: {
                    as_of_date?: string;
                    base_currency?: string;
                    fetched_at?: string;
                    id?: string;
                    provider?: string;
                    rates?: Json;
                };
                Relationships: [];
            };
            funding_settings: {
                Row: {
                    created_at: string;
                    deposit_percent: number;
                    id: string;
                    recurring_months: number;
                    updated_at: string | null;
                };
                Insert: {
                    created_at?: string;
                    deposit_percent?: number;
                    id?: string;
                    recurring_months?: number;
                    updated_at?: string | null;
                };
                Update: {
                    created_at?: string;
                    deposit_percent?: number;
                    id?: string;
                    recurring_months?: number;
                    updated_at?: string | null;
                };
                Relationships: [];
            };
            image_sets: {
                Row: {
                    created_at: string | null;
                    created_by: string | null;
                    id: string;
                    name: string;
                    updated_at: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    created_by?: string | null;
                    id?: string;
                    name: string;
                    updated_at?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    created_by?: string | null;
                    id?: string;
                    name?: string;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "image_sets_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    }
                ];
            };
            images: {
                Row: {
                    created_at: string | null;
                    created_by: string | null;
                    deleted_at: string | null;
                    file_type: string | null;
                    id: string;
                    object_key: string | null;
                    original_filename: string | null;
                    publish_status: Database["public"]["Enums"]["publish_status"];
                    set_id: string | null;
                    storage_provider: string | null;
                    target_id: string;
                    target_type: Database["public"]["Enums"]["target_type"];
                    updated_at: string | null;
                    version: number;
                };
                Insert: {
                    created_at?: string | null;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    file_type?: string | null;
                    id?: string;
                    object_key?: string | null;
                    original_filename?: string | null;
                    publish_status?: Database["public"]["Enums"]["publish_status"];
                    set_id?: string | null;
                    storage_provider?: string | null;
                    target_id: string;
                    target_type: Database["public"]["Enums"]["target_type"];
                    updated_at?: string | null;
                    version?: number;
                };
                Update: {
                    created_at?: string | null;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    file_type?: string | null;
                    id?: string;
                    object_key?: string | null;
                    original_filename?: string | null;
                    publish_status?: Database["public"]["Enums"]["publish_status"];
                    set_id?: string | null;
                    storage_provider?: string | null;
                    target_id?: string;
                    target_type?: Database["public"]["Enums"]["target_type"];
                    updated_at?: string | null;
                    version?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: "images_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "images_set_id_fkey";
                        columns: ["set_id"];
                        isOneToOne: false;
                        referencedRelation: "image_sets";
                        referencedColumns: ["id"];
                    }
                ];
            };
            language_aliases: {
                Row: {
                    alias_name: string;
                    created_at: string | null;
                    deleted_at: string | null;
                    id: string;
                    language_entity_id: string;
                };
                Insert: {
                    alias_name: string;
                    created_at?: string | null;
                    deleted_at?: string | null;
                    id?: string;
                    language_entity_id: string;
                };
                Update: {
                    alias_name?: string;
                    created_at?: string | null;
                    deleted_at?: string | null;
                    id?: string;
                    language_entity_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "language_aliases_language_entity_id_fkey";
                        columns: ["language_entity_id"];
                        isOneToOne: false;
                        referencedRelation: "language_entities";
                        referencedColumns: ["id"];
                    }
                ];
            };
            language_entities: {
                Row: {
                    created_at: string | null;
                    deleted_at: string | null;
                    funding_status: Database["public"]["Enums"]["entity_status"] | null;
                    id: string;
                    level: Database["public"]["Enums"]["language_entity_level"];
                    name: string;
                    parent_id: string | null;
                    updated_at: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    deleted_at?: string | null;
                    funding_status?: Database["public"]["Enums"]["entity_status"] | null;
                    id?: string;
                    level: Database["public"]["Enums"]["language_entity_level"];
                    name: string;
                    parent_id?: string | null;
                    updated_at?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    deleted_at?: string | null;
                    funding_status?: Database["public"]["Enums"]["entity_status"] | null;
                    id?: string;
                    level?: Database["public"]["Enums"]["language_entity_level"];
                    name?: string;
                    parent_id?: string | null;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "language_entities_parent_id_fkey";
                        columns: ["parent_id"];
                        isOneToOne: false;
                        referencedRelation: "language_entities";
                        referencedColumns: ["id"];
                    }
                ];
            };
            language_entities_regions: {
                Row: {
                    created_at: string | null;
                    deleted_at: string | null;
                    dominance_level: number | null;
                    id: string;
                    language_entity_id: string;
                    region_id: string;
                    updated_at: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    deleted_at?: string | null;
                    dominance_level?: number | null;
                    id?: string;
                    language_entity_id: string;
                    region_id: string;
                    updated_at?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    deleted_at?: string | null;
                    dominance_level?: number | null;
                    id?: string;
                    language_entity_id?: string;
                    region_id?: string;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "language_entities_regions_language_entity_id_fkey";
                        columns: ["language_entity_id"];
                        isOneToOne: false;
                        referencedRelation: "language_entities";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "language_entities_regions_region_id_fkey";
                        columns: ["region_id"];
                        isOneToOne: false;
                        referencedRelation: "regions";
                        referencedColumns: ["id"];
                    }
                ];
            };
            language_entity_sources: {
                Row: {
                    created_at: string | null;
                    created_by: string | null;
                    deleted_at: string | null;
                    external_id: string | null;
                    external_id_type: string | null;
                    id: string;
                    is_external: boolean;
                    language_entity_id: string;
                    source: string;
                    version: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    external_id?: string | null;
                    external_id_type?: string | null;
                    id?: string;
                    is_external?: boolean;
                    language_entity_id: string;
                    source: string;
                    version?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    external_id?: string | null;
                    external_id_type?: string | null;
                    id?: string;
                    is_external?: boolean;
                    language_entity_id?: string;
                    source?: string;
                    version?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "language_entity_sources_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "language_entity_sources_language_entity_id_fkey";
                        columns: ["language_entity_id"];
                        isOneToOne: false;
                        referencedRelation: "language_entities";
                        referencedColumns: ["id"];
                    }
                ];
            };
            language_properties: {
                Row: {
                    created_at: string | null;
                    deleted_at: string | null;
                    id: string;
                    key: string;
                    language_entity_id: string;
                    value: string;
                };
                Insert: {
                    created_at?: string | null;
                    deleted_at?: string | null;
                    id?: string;
                    key: string;
                    language_entity_id: string;
                    value: string;
                };
                Update: {
                    created_at?: string | null;
                    deleted_at?: string | null;
                    id?: string;
                    key?: string;
                    language_entity_id?: string;
                    value?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "language_properties_language_entity_id_fkey";
                        columns: ["language_entity_id"];
                        isOneToOne: false;
                        referencedRelation: "language_entities";
                        referencedColumns: ["id"];
                    }
                ];
            };
            media_file_listens: {
                Row: {
                    duration_seconds: number;
                    id: string;
                    language_entity_id: string;
                    listened_at: string | null;
                    media_file_id: string;
                    origin_share_id: string | null;
                    position_seconds: number;
                    session_id: string;
                    user_id: string | null;
                };
                Insert: {
                    duration_seconds: number;
                    id?: string;
                    language_entity_id: string;
                    listened_at?: string | null;
                    media_file_id: string;
                    origin_share_id?: string | null;
                    position_seconds: number;
                    session_id: string;
                    user_id?: string | null;
                };
                Update: {
                    duration_seconds?: number;
                    id?: string;
                    language_entity_id?: string;
                    listened_at?: string | null;
                    media_file_id?: string;
                    origin_share_id?: string | null;
                    position_seconds?: number;
                    session_id?: string;
                    user_id?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "media_file_listens_language_entity_id_fkey";
                        columns: ["language_entity_id"];
                        isOneToOne: false;
                        referencedRelation: "language_entities";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "media_file_listens_media_file_id_fkey";
                        columns: ["media_file_id"];
                        isOneToOne: false;
                        referencedRelation: "media_files";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "media_file_listens_origin_share_id_fkey";
                        columns: ["origin_share_id"];
                        isOneToOne: false;
                        referencedRelation: "shares";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "media_file_listens_session_id_fkey";
                        columns: ["session_id"];
                        isOneToOne: false;
                        referencedRelation: "sessions";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "media_file_listens_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    }
                ];
            };
            media_files: {
                Row: {
                    audio_version_id: string | null;
                    chapter_id: string | null;
                    check_status: Database["public"]["Enums"]["check_status"] | null;
                    created_at: string | null;
                    created_by: string | null;
                    deleted_at: string | null;
                    duration_seconds: number | null;
                    end_verse_id: string | null;
                    file_size: number | null;
                    file_type: string | null;
                    id: string;
                    is_bible_audio: boolean | null;
                    language_entity_id: string;
                    media_type: Database["public"]["Enums"]["media_type"];
                    object_key: string | null;
                    original_filename: string | null;
                    publish_status: Database["public"]["Enums"]["publish_status"] | null;
                    start_verse_id: string | null;
                    storage_provider: string | null;
                    updated_at: string | null;
                    upload_status: Database["public"]["Enums"]["upload_status"] | null;
                    version: number | null;
                };
                Insert: {
                    audio_version_id?: string | null;
                    chapter_id?: string | null;
                    check_status?: Database["public"]["Enums"]["check_status"] | null;
                    created_at?: string | null;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    duration_seconds?: number | null;
                    end_verse_id?: string | null;
                    file_size?: number | null;
                    file_type?: string | null;
                    id?: string;
                    is_bible_audio?: boolean | null;
                    language_entity_id: string;
                    media_type: Database["public"]["Enums"]["media_type"];
                    object_key?: string | null;
                    original_filename?: string | null;
                    publish_status?: Database["public"]["Enums"]["publish_status"] | null;
                    start_verse_id?: string | null;
                    storage_provider?: string | null;
                    updated_at?: string | null;
                    upload_status?: Database["public"]["Enums"]["upload_status"] | null;
                    version?: number | null;
                };
                Update: {
                    audio_version_id?: string | null;
                    chapter_id?: string | null;
                    check_status?: Database["public"]["Enums"]["check_status"] | null;
                    created_at?: string | null;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    duration_seconds?: number | null;
                    end_verse_id?: string | null;
                    file_size?: number | null;
                    file_type?: string | null;
                    id?: string;
                    is_bible_audio?: boolean | null;
                    language_entity_id?: string;
                    media_type?: Database["public"]["Enums"]["media_type"];
                    object_key?: string | null;
                    original_filename?: string | null;
                    publish_status?: Database["public"]["Enums"]["publish_status"] | null;
                    start_verse_id?: string | null;
                    storage_provider?: string | null;
                    updated_at?: string | null;
                    upload_status?: Database["public"]["Enums"]["upload_status"] | null;
                    version?: number | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "media_files_audio_version_id_fkey";
                        columns: ["audio_version_id"];
                        isOneToOne: false;
                        referencedRelation: "audio_version_progress_summary";
                        referencedColumns: ["audio_version_id"];
                    },
                    {
                        foreignKeyName: "media_files_audio_version_id_fkey";
                        columns: ["audio_version_id"];
                        isOneToOne: false;
                        referencedRelation: "audio_versions";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "media_files_audio_version_id_fkey";
                        columns: ["audio_version_id"];
                        isOneToOne: false;
                        referencedRelation: "language_entity_best_audio_version";
                        referencedColumns: ["audio_version_id"];
                    },
                    {
                        foreignKeyName: "media_files_audio_version_id_fkey";
                        columns: ["audio_version_id"];
                        isOneToOne: false;
                        referencedRelation: "mv_audio_version_progress_summary";
                        referencedColumns: ["audio_version_id"];
                    },
                    {
                        foreignKeyName: "media_files_chapter_id_fkey";
                        columns: ["chapter_id"];
                        isOneToOne: false;
                        referencedRelation: "chapters";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "media_files_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "media_files_end_verse_id_fkey";
                        columns: ["end_verse_id"];
                        isOneToOne: false;
                        referencedRelation: "verses";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "media_files_language_entity_id_fkey";
                        columns: ["language_entity_id"];
                        isOneToOne: false;
                        referencedRelation: "language_entities";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "media_files_start_verse_id_fkey";
                        columns: ["start_verse_id"];
                        isOneToOne: false;
                        referencedRelation: "verses";
                        referencedColumns: ["id"];
                    }
                ];
            };
            media_files_tags: {
                Row: {
                    created_at: string | null;
                    created_by: string | null;
                    id: string;
                    media_file_id: string;
                    tag_id: string;
                    updated_at: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    created_by?: string | null;
                    id?: string;
                    media_file_id: string;
                    tag_id: string;
                    updated_at?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    created_by?: string | null;
                    id?: string;
                    media_file_id?: string;
                    tag_id?: string;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "media_files_tags_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "media_files_tags_media_file_id_fkey";
                        columns: ["media_file_id"];
                        isOneToOne: false;
                        referencedRelation: "media_files";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "media_files_tags_tag_id_fkey";
                        columns: ["tag_id"];
                        isOneToOne: false;
                        referencedRelation: "tags";
                        referencedColumns: ["id"];
                    }
                ];
            };
            media_files_targets: {
                Row: {
                    created_at: string | null;
                    created_by: string | null;
                    deleted_at: string | null;
                    id: string;
                    media_file_id: string;
                    target_id: string;
                    target_type: Database["public"]["Enums"]["target_type"];
                    updated_at: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    id?: string;
                    media_file_id: string;
                    target_id: string;
                    target_type: Database["public"]["Enums"]["target_type"];
                    updated_at?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    id?: string;
                    media_file_id?: string;
                    target_id?: string;
                    target_type?: Database["public"]["Enums"]["target_type"];
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "media_files_targets_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "media_files_targets_media_file_id_fkey";
                        columns: ["media_file_id"];
                        isOneToOne: false;
                        referencedRelation: "media_files";
                        referencedColumns: ["id"];
                    }
                ];
            };
            media_files_verses: {
                Row: {
                    created_at: string | null;
                    created_by: string | null;
                    deleted_at: string | null;
                    denormalized_audio_version_id: string | null;
                    duration_seconds: number;
                    id: string;
                    media_file_id: string;
                    start_time_seconds: number;
                    updated_at: string | null;
                    verse_id: string;
                };
                Insert: {
                    created_at?: string | null;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    denormalized_audio_version_id?: string | null;
                    duration_seconds: number;
                    id?: string;
                    media_file_id: string;
                    start_time_seconds: number;
                    updated_at?: string | null;
                    verse_id: string;
                };
                Update: {
                    created_at?: string | null;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    denormalized_audio_version_id?: string | null;
                    duration_seconds?: number;
                    id?: string;
                    media_file_id?: string;
                    start_time_seconds?: number;
                    updated_at?: string | null;
                    verse_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "media_files_verses_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "media_files_verses_denormalized_audio_version_id_fkey";
                        columns: ["denormalized_audio_version_id"];
                        isOneToOne: false;
                        referencedRelation: "audio_version_progress_summary";
                        referencedColumns: ["audio_version_id"];
                    },
                    {
                        foreignKeyName: "media_files_verses_denormalized_audio_version_id_fkey";
                        columns: ["denormalized_audio_version_id"];
                        isOneToOne: false;
                        referencedRelation: "audio_versions";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "media_files_verses_denormalized_audio_version_id_fkey";
                        columns: ["denormalized_audio_version_id"];
                        isOneToOne: false;
                        referencedRelation: "language_entity_best_audio_version";
                        referencedColumns: ["audio_version_id"];
                    },
                    {
                        foreignKeyName: "media_files_verses_denormalized_audio_version_id_fkey";
                        columns: ["denormalized_audio_version_id"];
                        isOneToOne: false;
                        referencedRelation: "mv_audio_version_progress_summary";
                        referencedColumns: ["audio_version_id"];
                    },
                    {
                        foreignKeyName: "media_files_verses_media_file_id_fkey";
                        columns: ["media_file_id"];
                        isOneToOne: false;
                        referencedRelation: "media_files";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "media_files_verses_verse_id_fkey";
                        columns: ["verse_id"];
                        isOneToOne: false;
                        referencedRelation: "verses";
                        referencedColumns: ["id"];
                    }
                ];
            };
            operation_costs: {
                Row: {
                    amount_cents: number;
                    category: Database["public"]["Enums"]["operation_category"];
                    created_at: string;
                    created_by: string;
                    currency_code: string;
                    description: string;
                    id: string;
                    occurred_at: string;
                    operation_id: string;
                    receipt_url: string | null;
                    updated_at: string | null;
                };
                Insert: {
                    amount_cents: number;
                    category: Database["public"]["Enums"]["operation_category"];
                    created_at?: string;
                    created_by: string;
                    currency_code?: string;
                    description: string;
                    id?: string;
                    occurred_at?: string;
                    operation_id: string;
                    receipt_url?: string | null;
                    updated_at?: string | null;
                };
                Update: {
                    amount_cents?: number;
                    category?: Database["public"]["Enums"]["operation_category"];
                    created_at?: string;
                    created_by?: string;
                    currency_code?: string;
                    description?: string;
                    id?: string;
                    occurred_at?: string;
                    operation_id?: string;
                    receipt_url?: string | null;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "operation_costs_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "operation_costs_operation_id_fkey";
                        columns: ["operation_id"];
                        isOneToOne: false;
                        referencedRelation: "operations";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "operation_costs_operation_id_fkey";
                        columns: ["operation_id"];
                        isOneToOne: false;
                        referencedRelation: "vw_operation_balances";
                        referencedColumns: ["operation_id"];
                    }
                ];
            };
            operations: {
                Row: {
                    category: Database["public"]["Enums"]["operation_category"];
                    created_at: string;
                    created_by: string | null;
                    deleted_at: string | null;
                    description: string | null;
                    display_order: number;
                    id: string;
                    is_public: boolean;
                    name: string;
                    status: Database["public"]["Enums"]["entity_status"];
                    updated_at: string | null;
                };
                Insert: {
                    category: Database["public"]["Enums"]["operation_category"];
                    created_at?: string;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    description?: string | null;
                    display_order?: number;
                    id?: string;
                    is_public?: boolean;
                    name: string;
                    status?: Database["public"]["Enums"]["entity_status"];
                    updated_at?: string | null;
                };
                Update: {
                    category?: Database["public"]["Enums"]["operation_category"];
                    created_at?: string;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    description?: string | null;
                    display_order?: number;
                    id?: string;
                    is_public?: boolean;
                    name?: string;
                    status?: Database["public"]["Enums"]["entity_status"];
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "operations_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    }
                ];
            };
            partner_orgs: {
                Row: {
                    created_at: string;
                    created_by: string | null;
                    description: string | null;
                    id: string;
                    is_individual: boolean;
                    is_public: boolean;
                    name: string;
                    updated_at: string | null;
                };
                Insert: {
                    created_at?: string;
                    created_by?: string | null;
                    description?: string | null;
                    id?: string;
                    is_individual?: boolean;
                    is_public?: boolean;
                    name: string;
                    updated_at?: string | null;
                };
                Update: {
                    created_at?: string;
                    created_by?: string | null;
                    description?: string | null;
                    id?: string;
                    is_individual?: boolean;
                    is_public?: boolean;
                    name?: string;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "partner_orgs_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    }
                ];
            };
            partner_wallet_transactions: {
                Row: {
                    amount_cents: number;
                    created_at: string;
                    created_by: string | null;
                    currency_code: string;
                    id: string;
                    occurred_at: string;
                    reference: string | null;
                    tx_type: Database["public"]["Enums"]["wallet_tx_type"];
                    wallet_id: string;
                };
                Insert: {
                    amount_cents: number;
                    created_at?: string;
                    created_by?: string | null;
                    currency_code?: string;
                    id?: string;
                    occurred_at?: string;
                    reference?: string | null;
                    tx_type: Database["public"]["Enums"]["wallet_tx_type"];
                    wallet_id: string;
                };
                Update: {
                    amount_cents?: number;
                    created_at?: string;
                    created_by?: string | null;
                    currency_code?: string;
                    id?: string;
                    occurred_at?: string;
                    reference?: string | null;
                    tx_type?: Database["public"]["Enums"]["wallet_tx_type"];
                    wallet_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "partner_wallet_transactions_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "partner_wallet_transactions_wallet_id_fkey";
                        columns: ["wallet_id"];
                        isOneToOne: false;
                        referencedRelation: "partner_wallets";
                        referencedColumns: ["id"];
                    }
                ];
            };
            partner_wallets: {
                Row: {
                    created_at: string;
                    id: string;
                    partner_org_id: string;
                };
                Insert: {
                    created_at?: string;
                    id?: string;
                    partner_org_id: string;
                };
                Update: {
                    created_at?: string;
                    id?: string;
                    partner_org_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "partner_wallets_partner_org_id_fkey";
                        columns: ["partner_org_id"];
                        isOneToOne: true;
                        referencedRelation: "partner_orgs";
                        referencedColumns: ["id"];
                    }
                ];
            };
            passages: {
                Row: {
                    book_id: string;
                    created_at: string | null;
                    created_by: string | null;
                    end_verse_id: string;
                    id: string;
                    start_verse_id: string;
                    updated_at: string | null;
                };
                Insert: {
                    book_id: string;
                    created_at?: string | null;
                    created_by?: string | null;
                    end_verse_id: string;
                    id?: string;
                    start_verse_id: string;
                    updated_at?: string | null;
                };
                Update: {
                    book_id?: string;
                    created_at?: string | null;
                    created_by?: string | null;
                    end_verse_id?: string;
                    id?: string;
                    start_verse_id?: string;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "passages_book_id_fkey";
                        columns: ["book_id"];
                        isOneToOne: false;
                        referencedRelation: "books";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "passages_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "passages_end_verse_id_fkey";
                        columns: ["end_verse_id"];
                        isOneToOne: false;
                        referencedRelation: "verses";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "passages_start_verse_id_fkey";
                        columns: ["start_verse_id"];
                        isOneToOne: false;
                        referencedRelation: "verses";
                        referencedColumns: ["id"];
                    }
                ];
            };
            payment_attempts: {
                Row: {
                    amount_cents: number;
                    amount_received_cents: number | null;
                    created_at: string;
                    currency_code: string;
                    donation_id: string;
                    failed_at: string | null;
                    failure_code: string | null;
                    failure_message: string | null;
                    id: string;
                    metadata: Json | null;
                    status: Database["public"]["Enums"]["payment_attempt_status"];
                    stripe_charge_id: string | null;
                    stripe_event_id: string | null;
                    stripe_payment_intent_id: string;
                    succeeded_at: string | null;
                };
                Insert: {
                    amount_cents: number;
                    amount_received_cents?: number | null;
                    created_at?: string;
                    currency_code?: string;
                    donation_id: string;
                    failed_at?: string | null;
                    failure_code?: string | null;
                    failure_message?: string | null;
                    id?: string;
                    metadata?: Json | null;
                    status: Database["public"]["Enums"]["payment_attempt_status"];
                    stripe_charge_id?: string | null;
                    stripe_event_id?: string | null;
                    stripe_payment_intent_id: string;
                    succeeded_at?: string | null;
                };
                Update: {
                    amount_cents?: number;
                    amount_received_cents?: number | null;
                    created_at?: string;
                    currency_code?: string;
                    donation_id?: string;
                    failed_at?: string | null;
                    failure_code?: string | null;
                    failure_message?: string | null;
                    id?: string;
                    metadata?: Json | null;
                    status?: Database["public"]["Enums"]["payment_attempt_status"];
                    stripe_charge_id?: string | null;
                    stripe_event_id?: string | null;
                    stripe_payment_intent_id?: string;
                    succeeded_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "payment_attempts_donation_id_fkey";
                        columns: ["donation_id"];
                        isOneToOne: false;
                        referencedRelation: "donations";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "payment_attempts_donation_id_fkey";
                        columns: ["donation_id"];
                        isOneToOne: false;
                        referencedRelation: "vw_donation_remaining";
                        referencedColumns: ["donation_id"];
                    },
                    {
                        foreignKeyName: "payment_attempts_donation_id_fkey";
                        columns: ["donation_id"];
                        isOneToOne: false;
                        referencedRelation: "vw_unallocated_donations";
                        referencedColumns: ["donation_id"];
                    }
                ];
            };
            payment_methods: {
                Row: {
                    bank_last4: string | null;
                    bank_name: string | null;
                    billing_address: Json | null;
                    card_brand: string | null;
                    card_exp_month: number | null;
                    card_exp_year: number | null;
                    card_last4: string | null;
                    created_at: string;
                    deleted_at: string | null;
                    id: string;
                    is_default: boolean;
                    partner_org_id: string | null;
                    stripe_customer_id: string;
                    stripe_payment_method_id: string;
                    type: Database["public"]["Enums"]["payment_method_type"];
                    user_id: string | null;
                };
                Insert: {
                    bank_last4?: string | null;
                    bank_name?: string | null;
                    billing_address?: Json | null;
                    card_brand?: string | null;
                    card_exp_month?: number | null;
                    card_exp_year?: number | null;
                    card_last4?: string | null;
                    created_at?: string;
                    deleted_at?: string | null;
                    id?: string;
                    is_default?: boolean;
                    partner_org_id?: string | null;
                    stripe_customer_id: string;
                    stripe_payment_method_id: string;
                    type: Database["public"]["Enums"]["payment_method_type"];
                    user_id?: string | null;
                };
                Update: {
                    bank_last4?: string | null;
                    bank_name?: string | null;
                    billing_address?: Json | null;
                    card_brand?: string | null;
                    card_exp_month?: number | null;
                    card_exp_year?: number | null;
                    card_last4?: string | null;
                    created_at?: string;
                    deleted_at?: string | null;
                    id?: string;
                    is_default?: boolean;
                    partner_org_id?: string | null;
                    stripe_customer_id?: string;
                    stripe_payment_method_id?: string;
                    type?: Database["public"]["Enums"]["payment_method_type"];
                    user_id?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "payment_methods_partner_org_id_fkey";
                        columns: ["partner_org_id"];
                        isOneToOne: false;
                        referencedRelation: "partner_orgs";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "payment_methods_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    }
                ];
            };
            playlist_items: {
                Row: {
                    created_at: string | null;
                    created_by: string | null;
                    custom_text: string | null;
                    end_verse_id: string | null;
                    id: string;
                    order_index: number;
                    playlist_id: string;
                    playlist_item_type: Database["public"]["Enums"]["playlist_item_type"] | null;
                    start_verse_id: string | null;
                    updated_at: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    created_by?: string | null;
                    custom_text?: string | null;
                    end_verse_id?: string | null;
                    id?: string;
                    order_index: number;
                    playlist_id: string;
                    playlist_item_type?: Database["public"]["Enums"]["playlist_item_type"] | null;
                    start_verse_id?: string | null;
                    updated_at?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    created_by?: string | null;
                    custom_text?: string | null;
                    end_verse_id?: string | null;
                    id?: string;
                    order_index?: number;
                    playlist_id?: string;
                    playlist_item_type?: Database["public"]["Enums"]["playlist_item_type"] | null;
                    start_verse_id?: string | null;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "playlist_items_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "playlist_items_end_verse_id_fkey";
                        columns: ["end_verse_id"];
                        isOneToOne: false;
                        referencedRelation: "verses";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "playlist_items_playlist_id_fkey";
                        columns: ["playlist_id"];
                        isOneToOne: false;
                        referencedRelation: "playlists";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "playlist_items_start_verse_id_fkey";
                        columns: ["start_verse_id"];
                        isOneToOne: false;
                        referencedRelation: "verses";
                        referencedColumns: ["id"];
                    }
                ];
            };
            playlists: {
                Row: {
                    created_at: string | null;
                    created_by: string | null;
                    description: string | null;
                    id: string;
                    image_id: string | null;
                    title: string;
                    updated_at: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    created_by?: string | null;
                    description?: string | null;
                    id?: string;
                    image_id?: string | null;
                    title: string;
                    updated_at?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    created_by?: string | null;
                    description?: string | null;
                    id?: string;
                    image_id?: string | null;
                    title?: string;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "playlists_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "playlists_image_id_fkey";
                        columns: ["image_id"];
                        isOneToOne: false;
                        referencedRelation: "images";
                        referencedColumns: ["id"];
                    }
                ];
            };
            progress_refresh_queue: {
                Row: {
                    enqueued_at: string | null;
                    id: number;
                    kind: string;
                    version_id: string;
                };
                Insert: {
                    enqueued_at?: string | null;
                    id?: number;
                    kind: string;
                    version_id: string;
                };
                Update: {
                    enqueued_at?: string | null;
                    id?: number;
                    kind?: string;
                    version_id?: string;
                };
                Relationships: [];
            };
            project_budget_costs: {
                Row: {
                    amount_cents: number;
                    category: Database["public"]["Enums"]["budget_item_category"];
                    created_at: string;
                    created_by: string | null;
                    currency_code: string;
                    description: string | null;
                    fx_rate_used: number | null;
                    id: string;
                    note: string | null;
                    occurred_at: string;
                    project_id: string;
                    receipt_url: string | null;
                    reporting_usd_cents: number | null;
                };
                Insert: {
                    amount_cents: number;
                    category: Database["public"]["Enums"]["budget_item_category"];
                    created_at?: string;
                    created_by?: string | null;
                    currency_code?: string;
                    description?: string | null;
                    fx_rate_used?: number | null;
                    id?: string;
                    note?: string | null;
                    occurred_at?: string;
                    project_id: string;
                    receipt_url?: string | null;
                    reporting_usd_cents?: number | null;
                };
                Update: {
                    amount_cents?: number;
                    category?: Database["public"]["Enums"]["budget_item_category"];
                    created_at?: string;
                    created_by?: string | null;
                    currency_code?: string;
                    description?: string | null;
                    fx_rate_used?: number | null;
                    id?: string;
                    note?: string | null;
                    occurred_at?: string;
                    project_id?: string;
                    receipt_url?: string | null;
                    reporting_usd_cents?: number | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "project_budget_actual_costs_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "project_budget_actual_costs_project_id_fkey";
                        columns: ["project_id"];
                        isOneToOne: false;
                        referencedRelation: "projects";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "project_budget_actual_costs_project_id_fkey";
                        columns: ["project_id"];
                        isOneToOne: false;
                        referencedRelation: "vw_project_balances";
                        referencedColumns: ["project_id"];
                    },
                    {
                        foreignKeyName: "project_budget_actual_costs_project_id_fkey";
                        columns: ["project_id"];
                        isOneToOne: false;
                        referencedRelation: "vw_project_funding_summary";
                        referencedColumns: ["project_id"];
                    }
                ];
            };
            project_updates: {
                Row: {
                    body: string;
                    created_at: string;
                    created_by: string | null;
                    deleted_at: string | null;
                    id: string;
                    project_id: string;
                    title: string;
                    updated_at: string | null;
                };
                Insert: {
                    body: string;
                    created_at?: string;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    id?: string;
                    project_id: string;
                    title: string;
                    updated_at?: string | null;
                };
                Update: {
                    body?: string;
                    created_at?: string;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    id?: string;
                    project_id?: string;
                    title?: string;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "project_updates_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "project_updates_project_id_fkey";
                        columns: ["project_id"];
                        isOneToOne: false;
                        referencedRelation: "projects";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "project_updates_project_id_fkey";
                        columns: ["project_id"];
                        isOneToOne: false;
                        referencedRelation: "vw_project_balances";
                        referencedColumns: ["project_id"];
                    },
                    {
                        foreignKeyName: "project_updates_project_id_fkey";
                        columns: ["project_id"];
                        isOneToOne: false;
                        referencedRelation: "vw_project_funding_summary";
                        referencedColumns: ["project_id"];
                    }
                ];
            };
            project_updates_media: {
                Row: {
                    caption: string | null;
                    created_at: string;
                    created_by: string | null;
                    deleted_at: string | null;
                    display_order: number;
                    duration_seconds: number | null;
                    file_size: number | null;
                    file_type: string | null;
                    id: string;
                    media_type: Database["public"]["Enums"]["media_type"];
                    object_key: string;
                    original_filename: string | null;
                    project_update_id: string;
                    storage_provider: string | null;
                    thumbnail_object_key: string | null;
                };
                Insert: {
                    caption?: string | null;
                    created_at?: string;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    display_order?: number;
                    duration_seconds?: number | null;
                    file_size?: number | null;
                    file_type?: string | null;
                    id?: string;
                    media_type: Database["public"]["Enums"]["media_type"];
                    object_key: string;
                    original_filename?: string | null;
                    project_update_id: string;
                    storage_provider?: string | null;
                    thumbnail_object_key?: string | null;
                };
                Update: {
                    caption?: string | null;
                    created_at?: string;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    display_order?: number;
                    duration_seconds?: number | null;
                    file_size?: number | null;
                    file_type?: string | null;
                    id?: string;
                    media_type?: Database["public"]["Enums"]["media_type"];
                    object_key?: string;
                    original_filename?: string | null;
                    project_update_id?: string;
                    storage_provider?: string | null;
                    thumbnail_object_key?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "project_updates_media_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "project_updates_media_project_update_id_fkey";
                        columns: ["project_update_id"];
                        isOneToOne: false;
                        referencedRelation: "project_updates";
                        referencedColumns: ["id"];
                    }
                ];
            };
            projects: {
                Row: {
                    created_at: string | null;
                    created_by: string | null;
                    deleted_at: string | null;
                    description: string | null;
                    funding_status: Database["public"]["Enums"]["funding_status"];
                    id: string;
                    location: unknown;
                    name: string;
                    project_status: Database["public"]["Enums"]["project_status"];
                    region_id: string | null;
                    source_language_entity_id: string;
                    target_language_entity_id: string;
                    updated_at: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    description?: string | null;
                    funding_status?: Database["public"]["Enums"]["funding_status"];
                    id?: string;
                    location?: unknown;
                    name: string;
                    project_status?: Database["public"]["Enums"]["project_status"];
                    region_id?: string | null;
                    source_language_entity_id: string;
                    target_language_entity_id: string;
                    updated_at?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    description?: string | null;
                    funding_status?: Database["public"]["Enums"]["funding_status"];
                    id?: string;
                    location?: unknown;
                    name?: string;
                    project_status?: Database["public"]["Enums"]["project_status"];
                    region_id?: string | null;
                    source_language_entity_id?: string;
                    target_language_entity_id?: string;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "projects_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "projects_region_id_fkey";
                        columns: ["region_id"];
                        isOneToOne: false;
                        referencedRelation: "regions";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "projects_source_language_entity_id_fkey";
                        columns: ["source_language_entity_id"];
                        isOneToOne: false;
                        referencedRelation: "language_entities";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "projects_target_language_entity_id_fkey";
                        columns: ["target_language_entity_id"];
                        isOneToOne: false;
                        referencedRelation: "language_entities";
                        referencedColumns: ["id"];
                    }
                ];
            };
            projects_teams: {
                Row: {
                    assigned_at: string;
                    id: string;
                    is_primary: boolean;
                    project_id: string;
                    project_role_id: string | null;
                    team_id: string;
                    unassigned_at: string | null;
                };
                Insert: {
                    assigned_at?: string;
                    id?: string;
                    is_primary?: boolean;
                    project_id: string;
                    project_role_id?: string | null;
                    team_id: string;
                    unassigned_at?: string | null;
                };
                Update: {
                    assigned_at?: string;
                    id?: string;
                    is_primary?: boolean;
                    project_id?: string;
                    project_role_id?: string | null;
                    team_id?: string;
                    unassigned_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "projects_teams_project_id_fkey";
                        columns: ["project_id"];
                        isOneToOne: false;
                        referencedRelation: "projects";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "projects_teams_project_id_fkey";
                        columns: ["project_id"];
                        isOneToOne: false;
                        referencedRelation: "vw_project_balances";
                        referencedColumns: ["project_id"];
                    },
                    {
                        foreignKeyName: "projects_teams_project_id_fkey";
                        columns: ["project_id"];
                        isOneToOne: false;
                        referencedRelation: "vw_project_funding_summary";
                        referencedColumns: ["project_id"];
                    },
                    {
                        foreignKeyName: "projects_teams_project_role_id_fkey";
                        columns: ["project_role_id"];
                        isOneToOne: false;
                        referencedRelation: "roles";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "projects_teams_team_id_fkey";
                        columns: ["team_id"];
                        isOneToOne: false;
                        referencedRelation: "teams";
                        referencedColumns: ["id"];
                    }
                ];
            };
            region_aliases: {
                Row: {
                    alias_name: string;
                    created_at: string | null;
                    deleted_at: string | null;
                    id: string;
                    region_id: string;
                };
                Insert: {
                    alias_name: string;
                    created_at?: string | null;
                    deleted_at?: string | null;
                    id?: string;
                    region_id: string;
                };
                Update: {
                    alias_name?: string;
                    created_at?: string | null;
                    deleted_at?: string | null;
                    id?: string;
                    region_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "region_aliases_region_id_fkey";
                        columns: ["region_id"];
                        isOneToOne: false;
                        referencedRelation: "regions";
                        referencedColumns: ["id"];
                    }
                ];
            };
            region_properties: {
                Row: {
                    created_at: string | null;
                    deleted_at: string | null;
                    id: string;
                    key: string;
                    region_id: string;
                    value: string;
                };
                Insert: {
                    created_at?: string | null;
                    deleted_at?: string | null;
                    id?: string;
                    key: string;
                    region_id: string;
                    value: string;
                };
                Update: {
                    created_at?: string | null;
                    deleted_at?: string | null;
                    id?: string;
                    key?: string;
                    region_id?: string;
                    value?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "region_properties_region_id_fkey";
                        columns: ["region_id"];
                        isOneToOne: false;
                        referencedRelation: "regions";
                        referencedColumns: ["id"];
                    }
                ];
            };
            region_sources: {
                Row: {
                    created_at: string | null;
                    created_by: string | null;
                    deleted_at: string | null;
                    external_id: string | null;
                    external_id_type: string | null;
                    id: string;
                    is_external: boolean;
                    region_id: string;
                    source: string;
                    version: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    external_id?: string | null;
                    external_id_type?: string | null;
                    id?: string;
                    is_external?: boolean;
                    region_id: string;
                    source: string;
                    version?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    external_id?: string | null;
                    external_id_type?: string | null;
                    id?: string;
                    is_external?: boolean;
                    region_id?: string;
                    source?: string;
                    version?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "region_sources_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "region_sources_region_id_fkey";
                        columns: ["region_id"];
                        isOneToOne: false;
                        referencedRelation: "regions";
                        referencedColumns: ["id"];
                    }
                ];
            };
            regions: {
                Row: {
                    bbox_max_lat: number | null;
                    bbox_max_lon: number | null;
                    bbox_min_lat: number | null;
                    bbox_min_lon: number | null;
                    boundary: unknown;
                    boundary_simplified: unknown;
                    center_lat: number | null;
                    center_lon: number | null;
                    created_at: string | null;
                    deleted_at: string | null;
                    funding_status: Database["public"]["Enums"]["entity_status"] | null;
                    id: string;
                    level: Database["public"]["Enums"]["region_level"];
                    name: string;
                    parent_id: string | null;
                    updated_at: string | null;
                };
                Insert: {
                    bbox_max_lat?: number | null;
                    bbox_max_lon?: number | null;
                    bbox_min_lat?: number | null;
                    bbox_min_lon?: number | null;
                    boundary?: unknown;
                    boundary_simplified?: unknown;
                    center_lat?: number | null;
                    center_lon?: number | null;
                    created_at?: string | null;
                    deleted_at?: string | null;
                    funding_status?: Database["public"]["Enums"]["entity_status"] | null;
                    id?: string;
                    level: Database["public"]["Enums"]["region_level"];
                    name: string;
                    parent_id?: string | null;
                    updated_at?: string | null;
                };
                Update: {
                    bbox_max_lat?: number | null;
                    bbox_max_lon?: number | null;
                    bbox_min_lat?: number | null;
                    bbox_min_lon?: number | null;
                    boundary?: unknown;
                    boundary_simplified?: unknown;
                    center_lat?: number | null;
                    center_lon?: number | null;
                    created_at?: string | null;
                    deleted_at?: string | null;
                    funding_status?: Database["public"]["Enums"]["entity_status"] | null;
                    id?: string;
                    level?: Database["public"]["Enums"]["region_level"];
                    name?: string;
                    parent_id?: string | null;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "regions_parent_id_fkey";
                        columns: ["parent_id"];
                        isOneToOne: false;
                        referencedRelation: "regions";
                        referencedColumns: ["id"];
                    }
                ];
            };
            role_permissions: {
                Row: {
                    created_at: string;
                    id: string;
                    is_allowed: boolean;
                    permission_key: Database["public"]["Enums"]["permission_key"];
                    resource_type: Database["public"]["Enums"]["resource_type"];
                    role_id: string;
                };
                Insert: {
                    created_at?: string;
                    id?: string;
                    is_allowed?: boolean;
                    permission_key: Database["public"]["Enums"]["permission_key"];
                    resource_type: Database["public"]["Enums"]["resource_type"];
                    role_id: string;
                };
                Update: {
                    created_at?: string;
                    id?: string;
                    is_allowed?: boolean;
                    permission_key?: Database["public"]["Enums"]["permission_key"];
                    resource_type?: Database["public"]["Enums"]["resource_type"];
                    role_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "role_permissions_role_id_fkey";
                        columns: ["role_id"];
                        isOneToOne: false;
                        referencedRelation: "roles";
                        referencedColumns: ["id"];
                    }
                ];
            };
            roles: {
                Row: {
                    created_at: string | null;
                    id: string;
                    name: string;
                    resource_type: Database["public"]["Enums"]["resource_type"] | null;
                    role_key: string | null;
                    updated_at: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    id?: string;
                    name: string;
                    resource_type?: Database["public"]["Enums"]["resource_type"] | null;
                    role_key?: string | null;
                    updated_at?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    id?: string;
                    name?: string;
                    resource_type?: Database["public"]["Enums"]["resource_type"] | null;
                    role_key?: string | null;
                    updated_at?: string | null;
                };
                Relationships: [];
            };
            segments: {
                Row: {
                    created_at: string | null;
                    created_by: string | null;
                    deleted_at: string | null;
                    id: string;
                    local_path: string | null;
                    remote_path: string | null;
                    type: Database["public"]["Enums"]["segment_type"];
                    updated_at: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    id?: string;
                    local_path?: string | null;
                    remote_path?: string | null;
                    type: Database["public"]["Enums"]["segment_type"];
                    updated_at?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    id?: string;
                    local_path?: string | null;
                    remote_path?: string | null;
                    type?: Database["public"]["Enums"]["segment_type"];
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "segments_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    }
                ];
            };
            segments_targets: {
                Row: {
                    created_at: string | null;
                    created_by: string | null;
                    deleted_at: string | null;
                    id: string;
                    segment_id: string;
                    target_id: string;
                    target_type: Database["public"]["Enums"]["target_type"];
                    updated_at: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    id?: string;
                    segment_id: string;
                    target_id: string;
                    target_type: Database["public"]["Enums"]["target_type"];
                    updated_at?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    id?: string;
                    segment_id?: string;
                    target_id?: string;
                    target_type?: Database["public"]["Enums"]["target_type"];
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "segments_targets_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "segments_targets_segment_id_fkey";
                        columns: ["segment_id"];
                        isOneToOne: false;
                        referencedRelation: "segments";
                        referencedColumns: ["id"];
                    }
                ];
            };
            sequences: {
                Row: {
                    book_id: string;
                    created_at: string | null;
                    created_by: string | null;
                    deleted_at: string | null;
                    description: string | null;
                    end_verse_id: string | null;
                    id: string;
                    is_bible_audio: boolean | null;
                    name: string;
                    project_id: string;
                    start_verse_id: string | null;
                    updated_at: string | null;
                };
                Insert: {
                    book_id: string;
                    created_at?: string | null;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    description?: string | null;
                    end_verse_id?: string | null;
                    id?: string;
                    is_bible_audio?: boolean | null;
                    name: string;
                    project_id: string;
                    start_verse_id?: string | null;
                    updated_at?: string | null;
                };
                Update: {
                    book_id?: string;
                    created_at?: string | null;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    description?: string | null;
                    end_verse_id?: string | null;
                    id?: string;
                    is_bible_audio?: boolean | null;
                    name?: string;
                    project_id?: string;
                    start_verse_id?: string | null;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "sequences_book_id_fkey";
                        columns: ["book_id"];
                        isOneToOne: false;
                        referencedRelation: "books";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "sequences_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "sequences_end_verse_id_fkey";
                        columns: ["end_verse_id"];
                        isOneToOne: false;
                        referencedRelation: "verses";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "sequences_project_id_fkey";
                        columns: ["project_id"];
                        isOneToOne: false;
                        referencedRelation: "projects";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "sequences_project_id_fkey";
                        columns: ["project_id"];
                        isOneToOne: false;
                        referencedRelation: "vw_project_balances";
                        referencedColumns: ["project_id"];
                    },
                    {
                        foreignKeyName: "sequences_project_id_fkey";
                        columns: ["project_id"];
                        isOneToOne: false;
                        referencedRelation: "vw_project_funding_summary";
                        referencedColumns: ["project_id"];
                    },
                    {
                        foreignKeyName: "sequences_start_verse_id_fkey";
                        columns: ["start_verse_id"];
                        isOneToOne: false;
                        referencedRelation: "verses";
                        referencedColumns: ["id"];
                    }
                ];
            };
            sequences_segments: {
                Row: {
                    created_at: string | null;
                    created_by: string | null;
                    id: string;
                    is_deleted: boolean | null;
                    is_numbered: boolean | null;
                    segment_color: string | null;
                    segment_id: string;
                    segment_index: number;
                    sequence_id: string;
                    updated_at: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    created_by?: string | null;
                    id?: string;
                    is_deleted?: boolean | null;
                    is_numbered?: boolean | null;
                    segment_color?: string | null;
                    segment_id: string;
                    segment_index: number;
                    sequence_id: string;
                    updated_at?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    created_by?: string | null;
                    id?: string;
                    is_deleted?: boolean | null;
                    is_numbered?: boolean | null;
                    segment_color?: string | null;
                    segment_id?: string;
                    segment_index?: number;
                    sequence_id?: string;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "sequences_segments_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "sequences_segments_segment_id_fkey";
                        columns: ["segment_id"];
                        isOneToOne: false;
                        referencedRelation: "segments";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "sequences_segments_sequence_id_fkey";
                        columns: ["sequence_id"];
                        isOneToOne: false;
                        referencedRelation: "sequences";
                        referencedColumns: ["id"];
                    }
                ];
            };
            sequences_tags: {
                Row: {
                    created_at: string | null;
                    created_by: string | null;
                    id: string;
                    sequence_id: string;
                    tag_id: string;
                    updated_at: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    created_by?: string | null;
                    id?: string;
                    sequence_id: string;
                    tag_id: string;
                    updated_at?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    created_by?: string | null;
                    id?: string;
                    sequence_id?: string;
                    tag_id?: string;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "sequences_tags_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "sequences_tags_sequence_id_fkey";
                        columns: ["sequence_id"];
                        isOneToOne: false;
                        referencedRelation: "sequences";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "sequences_tags_tag_id_fkey";
                        columns: ["tag_id"];
                        isOneToOne: false;
                        referencedRelation: "tags";
                        referencedColumns: ["id"];
                    }
                ];
            };
            sequences_targets: {
                Row: {
                    created_at: string | null;
                    created_by: string | null;
                    deleted_at: string | null;
                    id: string;
                    sequence_id: string;
                    target_id: string;
                    target_type: Database["public"]["Enums"]["target_type"];
                    updated_at: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    id?: string;
                    sequence_id: string;
                    target_id: string;
                    target_type: Database["public"]["Enums"]["target_type"];
                    updated_at?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    id?: string;
                    sequence_id?: string;
                    target_id?: string;
                    target_type?: Database["public"]["Enums"]["target_type"];
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "sequences_targets_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "sequences_targets_sequence_id_fkey";
                        columns: ["sequence_id"];
                        isOneToOne: false;
                        referencedRelation: "sequences";
                        referencedColumns: ["id"];
                    }
                ];
            };
            sessions: {
                Row: {
                    app_download_id: string | null;
                    app_version: string;
                    connectivity: Database["public"]["Enums"]["connectivity_type"] | null;
                    continent_code: string | null;
                    country_code: string | null;
                    ended_at: string | null;
                    id: string;
                    location: unknown;
                    location_source: Database["public"]["Enums"]["location_source_type"] | null;
                    os: string | null;
                    os_version: string | null;
                    platform: Database["public"]["Enums"]["platform_type"];
                    region_code: string | null;
                    started_at: string | null;
                    user_id: string | null;
                };
                Insert: {
                    app_download_id?: string | null;
                    app_version: string;
                    connectivity?: Database["public"]["Enums"]["connectivity_type"] | null;
                    continent_code?: string | null;
                    country_code?: string | null;
                    ended_at?: string | null;
                    id?: string;
                    location?: unknown;
                    location_source?: Database["public"]["Enums"]["location_source_type"] | null;
                    os?: string | null;
                    os_version?: string | null;
                    platform: Database["public"]["Enums"]["platform_type"];
                    region_code?: string | null;
                    started_at?: string | null;
                    user_id?: string | null;
                };
                Update: {
                    app_download_id?: string | null;
                    app_version?: string;
                    connectivity?: Database["public"]["Enums"]["connectivity_type"] | null;
                    continent_code?: string | null;
                    country_code?: string | null;
                    ended_at?: string | null;
                    id?: string;
                    location?: unknown;
                    location_source?: Database["public"]["Enums"]["location_source_type"] | null;
                    os?: string | null;
                    os_version?: string | null;
                    platform?: Database["public"]["Enums"]["platform_type"];
                    region_code?: string | null;
                    started_at?: string | null;
                    user_id?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "sessions_app_download_id_fkey";
                        columns: ["app_download_id"];
                        isOneToOne: false;
                        referencedRelation: "app_downloads";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "sessions_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    }
                ];
            };
            share_opens: {
                Row: {
                    created_at: string | null;
                    id: string;
                    opened_at: string | null;
                    parent_share_id: string | null;
                    session_id: string | null;
                    share_id: string;
                    user_id: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    id?: string;
                    opened_at?: string | null;
                    parent_share_id?: string | null;
                    session_id?: string | null;
                    share_id: string;
                    user_id?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    id?: string;
                    opened_at?: string | null;
                    parent_share_id?: string | null;
                    session_id?: string | null;
                    share_id?: string;
                    user_id?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "share_opens_session_id_fkey";
                        columns: ["session_id"];
                        isOneToOne: false;
                        referencedRelation: "sessions";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "share_opens_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    }
                ];
            };
            shares: {
                Row: {
                    id: string;
                    language_entity_id: string;
                    parent_share_id: string | null;
                    session_id: string;
                    share_entity_id: string;
                    share_entity_type: Database["public"]["Enums"]["share_entity_type"];
                    shared_at: string | null;
                    user_id: string | null;
                };
                Insert: {
                    id?: string;
                    language_entity_id: string;
                    parent_share_id?: string | null;
                    session_id: string;
                    share_entity_id: string;
                    share_entity_type: Database["public"]["Enums"]["share_entity_type"];
                    shared_at?: string | null;
                    user_id?: string | null;
                };
                Update: {
                    id?: string;
                    language_entity_id?: string;
                    parent_share_id?: string | null;
                    session_id?: string;
                    share_entity_id?: string;
                    share_entity_type?: Database["public"]["Enums"]["share_entity_type"];
                    shared_at?: string | null;
                    user_id?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "shares_language_entity_id_fkey";
                        columns: ["language_entity_id"];
                        isOneToOne: false;
                        referencedRelation: "language_entities";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "shares_session_id_fkey";
                        columns: ["session_id"];
                        isOneToOne: false;
                        referencedRelation: "sessions";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "shares_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    }
                ];
            };
            spatial_ref_sys: {
                Row: {
                    auth_name: string | null;
                    auth_srid: number | null;
                    proj4text: string | null;
                    srid: number;
                    srtext: string | null;
                };
                Insert: {
                    auth_name?: string | null;
                    auth_srid?: number | null;
                    proj4text?: string | null;
                    srid: number;
                    srtext?: string | null;
                };
                Update: {
                    auth_name?: string | null;
                    auth_srid?: number | null;
                    proj4text?: string | null;
                    srid?: number;
                    srtext?: string | null;
                };
                Relationships: [];
            };
            stripe_events: {
                Row: {
                    error_message: string | null;
                    id: string;
                    payload: Json;
                    processed_at: string | null;
                    success: boolean | null;
                    type: string;
                };
                Insert: {
                    error_message?: string | null;
                    id: string;
                    payload: Json;
                    processed_at?: string | null;
                    success?: boolean | null;
                    type: string;
                };
                Update: {
                    error_message?: string | null;
                    id?: string;
                    payload?: Json;
                    processed_at?: string | null;
                    success?: boolean | null;
                    type?: string;
                };
                Relationships: [];
            };
            tags: {
                Row: {
                    created_at: string | null;
                    created_by: string | null;
                    id: string;
                    key: string;
                    updated_at: string | null;
                    value: string;
                };
                Insert: {
                    created_at?: string | null;
                    created_by?: string | null;
                    id?: string;
                    key: string;
                    updated_at?: string | null;
                    value: string;
                };
                Update: {
                    created_at?: string | null;
                    created_by?: string | null;
                    id?: string;
                    key?: string;
                    updated_at?: string | null;
                    value?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "tags_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    }
                ];
            };
            teams: {
                Row: {
                    created_at: string | null;
                    created_by: string | null;
                    id: string;
                    name: string;
                    type: string | null;
                    updated_at: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    created_by?: string | null;
                    id?: string;
                    name: string;
                    type?: string | null;
                    updated_at?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    created_by?: string | null;
                    id?: string;
                    name?: string;
                    type?: string | null;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "teams_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    }
                ];
            };
            text_versions: {
                Row: {
                    bible_version_id: string;
                    created_at: string | null;
                    created_by: string | null;
                    deleted_at: string | null;
                    id: string;
                    language_entity_id: string;
                    name: string;
                    project_id: string | null;
                    text_version_source: Database["public"]["Enums"]["text_version_source"] | null;
                    updated_at: string | null;
                };
                Insert: {
                    bible_version_id: string;
                    created_at?: string | null;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    id?: string;
                    language_entity_id: string;
                    name: string;
                    project_id?: string | null;
                    text_version_source?: Database["public"]["Enums"]["text_version_source"] | null;
                    updated_at?: string | null;
                };
                Update: {
                    bible_version_id?: string;
                    created_at?: string | null;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    id?: string;
                    language_entity_id?: string;
                    name?: string;
                    project_id?: string | null;
                    text_version_source?: Database["public"]["Enums"]["text_version_source"] | null;
                    updated_at?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "text_versions_bible_version_id_fkey";
                        columns: ["bible_version_id"];
                        isOneToOne: false;
                        referencedRelation: "bible_versions";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "text_versions_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "text_versions_language_entity_id_fkey";
                        columns: ["language_entity_id"];
                        isOneToOne: false;
                        referencedRelation: "language_entities";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "text_versions_project_id_fkey";
                        columns: ["project_id"];
                        isOneToOne: false;
                        referencedRelation: "projects";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "text_versions_project_id_fkey";
                        columns: ["project_id"];
                        isOneToOne: false;
                        referencedRelation: "vw_project_balances";
                        referencedColumns: ["project_id"];
                    },
                    {
                        foreignKeyName: "text_versions_project_id_fkey";
                        columns: ["project_id"];
                        isOneToOne: false;
                        referencedRelation: "vw_project_funding_summary";
                        referencedColumns: ["project_id"];
                    }
                ];
            };
            transactions: {
                Row: {
                    amount_cents: number;
                    created_at: string;
                    created_by: string | null;
                    currency_code: string;
                    donation_allocation_id: string | null;
                    donation_id: string | null;
                    fee_cents: number | null;
                    fee_covered_by_donor: boolean | null;
                    id: string;
                    kind: Database["public"]["Enums"]["transaction_kind"];
                    occurred_at: string;
                    payment_attempt_id: string | null;
                    project_id: string | null;
                    sponsorship_id: string;
                    stripe_charge_id: string | null;
                    stripe_event_id: string | null;
                    stripe_invoice_id: string | null;
                    stripe_payment_intent_id: string | null;
                    stripe_subscription_id: string | null;
                    user_id: string | null;
                };
                Insert: {
                    amount_cents: number;
                    created_at?: string;
                    created_by?: string | null;
                    currency_code?: string;
                    donation_allocation_id?: string | null;
                    donation_id?: string | null;
                    fee_cents?: number | null;
                    fee_covered_by_donor?: boolean | null;
                    id?: string;
                    kind: Database["public"]["Enums"]["transaction_kind"];
                    occurred_at?: string;
                    payment_attempt_id?: string | null;
                    project_id?: string | null;
                    sponsorship_id: string;
                    stripe_charge_id?: string | null;
                    stripe_event_id?: string | null;
                    stripe_invoice_id?: string | null;
                    stripe_payment_intent_id?: string | null;
                    stripe_subscription_id?: string | null;
                    user_id?: string | null;
                };
                Update: {
                    amount_cents?: number;
                    created_at?: string;
                    created_by?: string | null;
                    currency_code?: string;
                    donation_allocation_id?: string | null;
                    donation_id?: string | null;
                    fee_cents?: number | null;
                    fee_covered_by_donor?: boolean | null;
                    id?: string;
                    kind?: Database["public"]["Enums"]["transaction_kind"];
                    occurred_at?: string;
                    payment_attempt_id?: string | null;
                    project_id?: string | null;
                    sponsorship_id?: string;
                    stripe_charge_id?: string | null;
                    stripe_event_id?: string | null;
                    stripe_invoice_id?: string | null;
                    stripe_payment_intent_id?: string | null;
                    stripe_subscription_id?: string | null;
                    user_id?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "contributions_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "contributions_project_id_fkey";
                        columns: ["project_id"];
                        isOneToOne: false;
                        referencedRelation: "projects";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "contributions_project_id_fkey";
                        columns: ["project_id"];
                        isOneToOne: false;
                        referencedRelation: "vw_project_balances";
                        referencedColumns: ["project_id"];
                    },
                    {
                        foreignKeyName: "contributions_project_id_fkey";
                        columns: ["project_id"];
                        isOneToOne: false;
                        referencedRelation: "vw_project_funding_summary";
                        referencedColumns: ["project_id"];
                    },
                    {
                        foreignKeyName: "contributions_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "transactions_donation_allocation_id_fkey";
                        columns: ["donation_allocation_id"];
                        isOneToOne: false;
                        referencedRelation: "donation_allocations";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "transactions_donation_id_fkey";
                        columns: ["donation_id"];
                        isOneToOne: false;
                        referencedRelation: "donations";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "transactions_donation_id_fkey";
                        columns: ["donation_id"];
                        isOneToOne: false;
                        referencedRelation: "vw_donation_remaining";
                        referencedColumns: ["donation_id"];
                    },
                    {
                        foreignKeyName: "transactions_donation_id_fkey";
                        columns: ["donation_id"];
                        isOneToOne: false;
                        referencedRelation: "vw_unallocated_donations";
                        referencedColumns: ["donation_id"];
                    },
                    {
                        foreignKeyName: "transactions_payment_attempt_id_fkey";
                        columns: ["payment_attempt_id"];
                        isOneToOne: false;
                        referencedRelation: "payment_attempts";
                        referencedColumns: ["id"];
                    }
                ];
            };
            user_bookmark_folders: {
                Row: {
                    color: string | null;
                    created_at: string | null;
                    id: string;
                    name: string;
                    parent_folder_id: string | null;
                    updated_at: string | null;
                    user_id: string;
                };
                Insert: {
                    color?: string | null;
                    created_at?: string | null;
                    id?: string;
                    name: string;
                    parent_folder_id?: string | null;
                    updated_at?: string | null;
                    user_id: string;
                };
                Update: {
                    color?: string | null;
                    created_at?: string | null;
                    id?: string;
                    name?: string;
                    parent_folder_id?: string | null;
                    updated_at?: string | null;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "user_bookmark_folders_parent_folder_id_fkey";
                        columns: ["parent_folder_id"];
                        isOneToOne: false;
                        referencedRelation: "user_bookmark_folders";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "user_bookmark_folders_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    }
                ];
            };
            user_bookmarks: {
                Row: {
                    bookmark_folder_id: string | null;
                    bookmark_type: Database["public"]["Enums"]["bookmark_type"] | null;
                    color: string | null;
                    created_at: string | null;
                    end_verse_id: string | null;
                    id: string;
                    note: string | null;
                    start_verse_id: string | null;
                    updated_at: string | null;
                    user_id: string;
                };
                Insert: {
                    bookmark_folder_id?: string | null;
                    bookmark_type?: Database["public"]["Enums"]["bookmark_type"] | null;
                    color?: string | null;
                    created_at?: string | null;
                    end_verse_id?: string | null;
                    id?: string;
                    note?: string | null;
                    start_verse_id?: string | null;
                    updated_at?: string | null;
                    user_id: string;
                };
                Update: {
                    bookmark_folder_id?: string | null;
                    bookmark_type?: Database["public"]["Enums"]["bookmark_type"] | null;
                    color?: string | null;
                    created_at?: string | null;
                    end_verse_id?: string | null;
                    id?: string;
                    note?: string | null;
                    start_verse_id?: string | null;
                    updated_at?: string | null;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "user_bookmarks_bookmark_folder_id_fkey";
                        columns: ["bookmark_folder_id"];
                        isOneToOne: false;
                        referencedRelation: "user_bookmark_folders";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "user_bookmarks_end_verse_id_fkey";
                        columns: ["end_verse_id"];
                        isOneToOne: false;
                        referencedRelation: "verses";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "user_bookmarks_start_verse_id_fkey";
                        columns: ["start_verse_id"];
                        isOneToOne: false;
                        referencedRelation: "verses";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "user_bookmarks_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    }
                ];
            };
            user_contributions: {
                Row: {
                    change_type: Database["public"]["Enums"]["change_type"];
                    changed_at: string | null;
                    changed_by: string;
                    id: string;
                    reviewed_at: string | null;
                    reviewed_by: string | null;
                    status: Database["public"]["Enums"]["contribution_status"];
                    target_id: string;
                    target_table: string;
                    version: number;
                };
                Insert: {
                    change_type: Database["public"]["Enums"]["change_type"];
                    changed_at?: string | null;
                    changed_by: string;
                    id?: string;
                    reviewed_at?: string | null;
                    reviewed_by?: string | null;
                    status?: Database["public"]["Enums"]["contribution_status"];
                    target_id: string;
                    target_table: string;
                    version?: number;
                };
                Update: {
                    change_type?: Database["public"]["Enums"]["change_type"];
                    changed_at?: string | null;
                    changed_by?: string;
                    id?: string;
                    reviewed_at?: string | null;
                    reviewed_by?: string | null;
                    status?: Database["public"]["Enums"]["contribution_status"];
                    target_id?: string;
                    target_table?: string;
                    version?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: "user_contributions_changed_by_fkey";
                        columns: ["changed_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "user_contributions_reviewed_by_fkey";
                        columns: ["reviewed_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    }
                ];
            };
            user_current_selections: {
                Row: {
                    created_at: string;
                    id: string;
                    selected_audio_version: string | null;
                    selected_text_version: string | null;
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    created_at?: string;
                    id?: string;
                    selected_audio_version?: string | null;
                    selected_text_version?: string | null;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    created_at?: string;
                    id?: string;
                    selected_audio_version?: string | null;
                    selected_text_version?: string | null;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "user_current_selections_selected_audio_version_fkey";
                        columns: ["selected_audio_version"];
                        isOneToOne: false;
                        referencedRelation: "audio_version_progress_summary";
                        referencedColumns: ["audio_version_id"];
                    },
                    {
                        foreignKeyName: "user_current_selections_selected_audio_version_fkey";
                        columns: ["selected_audio_version"];
                        isOneToOne: false;
                        referencedRelation: "audio_versions";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "user_current_selections_selected_audio_version_fkey";
                        columns: ["selected_audio_version"];
                        isOneToOne: false;
                        referencedRelation: "language_entity_best_audio_version";
                        referencedColumns: ["audio_version_id"];
                    },
                    {
                        foreignKeyName: "user_current_selections_selected_audio_version_fkey";
                        columns: ["selected_audio_version"];
                        isOneToOne: false;
                        referencedRelation: "mv_audio_version_progress_summary";
                        referencedColumns: ["audio_version_id"];
                    },
                    {
                        foreignKeyName: "user_current_selections_selected_text_version_fkey";
                        columns: ["selected_text_version"];
                        isOneToOne: false;
                        referencedRelation: "language_entity_best_text_version";
                        referencedColumns: ["text_version_id"];
                    },
                    {
                        foreignKeyName: "user_current_selections_selected_text_version_fkey";
                        columns: ["selected_text_version"];
                        isOneToOne: false;
                        referencedRelation: "mv_text_version_progress_summary";
                        referencedColumns: ["text_version_id"];
                    },
                    {
                        foreignKeyName: "user_current_selections_selected_text_version_fkey";
                        columns: ["selected_text_version"];
                        isOneToOne: false;
                        referencedRelation: "text_version_progress_summary";
                        referencedColumns: ["text_version_id"];
                    },
                    {
                        foreignKeyName: "user_current_selections_selected_text_version_fkey";
                        columns: ["selected_text_version"];
                        isOneToOne: false;
                        referencedRelation: "text_versions";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "user_current_selections_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: true;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    }
                ];
            };
            user_playlist_groups: {
                Row: {
                    created_at: string | null;
                    description: string | null;
                    id: string;
                    name: string;
                    updated_at: string | null;
                    user_id: string;
                };
                Insert: {
                    created_at?: string | null;
                    description?: string | null;
                    id?: string;
                    name: string;
                    updated_at?: string | null;
                    user_id: string;
                };
                Update: {
                    created_at?: string | null;
                    description?: string | null;
                    id?: string;
                    name?: string;
                    updated_at?: string | null;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "user_playlist_groups_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    }
                ];
            };
            user_playlists: {
                Row: {
                    created_at: string | null;
                    id: string;
                    playlist_id: string;
                    updated_at: string | null;
                    user_id: string;
                    user_playlist_group_id: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    id?: string;
                    playlist_id: string;
                    updated_at?: string | null;
                    user_id: string;
                    user_playlist_group_id?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    id?: string;
                    playlist_id?: string;
                    updated_at?: string | null;
                    user_id?: string;
                    user_playlist_group_id?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "user_playlists_playlist_id_fkey";
                        columns: ["playlist_id"];
                        isOneToOne: false;
                        referencedRelation: "playlists";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "user_playlists_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "user_playlists_user_playlist_group_id_fkey";
                        columns: ["user_playlist_group_id"];
                        isOneToOne: false;
                        referencedRelation: "user_playlist_groups";
                        referencedColumns: ["id"];
                    }
                ];
            };
            user_roles: {
                Row: {
                    context_id: string | null;
                    context_type: string | null;
                    created_at: string | null;
                    id: string;
                    role_id: string;
                    updated_at: string | null;
                    user_id: string;
                };
                Insert: {
                    context_id?: string | null;
                    context_type?: string | null;
                    created_at?: string | null;
                    id?: string;
                    role_id: string;
                    updated_at?: string | null;
                    user_id: string;
                };
                Update: {
                    context_id?: string | null;
                    context_type?: string | null;
                    created_at?: string | null;
                    id?: string;
                    role_id?: string;
                    updated_at?: string | null;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "user_roles_role_id_fkey";
                        columns: ["role_id"];
                        isOneToOne: false;
                        referencedRelation: "roles";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "user_roles_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    }
                ];
            };
            user_saved_audio_versions: {
                Row: {
                    audio_version_id: string;
                    created_at: string | null;
                    id: string;
                    updated_at: string | null;
                    user_id: string;
                };
                Insert: {
                    audio_version_id: string;
                    created_at?: string | null;
                    id?: string;
                    updated_at?: string | null;
                    user_id: string;
                };
                Update: {
                    audio_version_id?: string;
                    created_at?: string | null;
                    id?: string;
                    updated_at?: string | null;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "user_saved_audio_versions_audio_version_id_fkey";
                        columns: ["audio_version_id"];
                        isOneToOne: false;
                        referencedRelation: "audio_version_progress_summary";
                        referencedColumns: ["audio_version_id"];
                    },
                    {
                        foreignKeyName: "user_saved_audio_versions_audio_version_id_fkey";
                        columns: ["audio_version_id"];
                        isOneToOne: false;
                        referencedRelation: "audio_versions";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "user_saved_audio_versions_audio_version_id_fkey";
                        columns: ["audio_version_id"];
                        isOneToOne: false;
                        referencedRelation: "language_entity_best_audio_version";
                        referencedColumns: ["audio_version_id"];
                    },
                    {
                        foreignKeyName: "user_saved_audio_versions_audio_version_id_fkey";
                        columns: ["audio_version_id"];
                        isOneToOne: false;
                        referencedRelation: "mv_audio_version_progress_summary";
                        referencedColumns: ["audio_version_id"];
                    },
                    {
                        foreignKeyName: "user_saved_audio_versions_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    }
                ];
            };
            user_saved_image_sets: {
                Row: {
                    created_at: string | null;
                    id: string;
                    set_id: string;
                    updated_at: string | null;
                    user_id: string;
                };
                Insert: {
                    created_at?: string | null;
                    id?: string;
                    set_id: string;
                    updated_at?: string | null;
                    user_id: string;
                };
                Update: {
                    created_at?: string | null;
                    id?: string;
                    set_id?: string;
                    updated_at?: string | null;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "user_saved_image_sets_set_id_fkey";
                        columns: ["set_id"];
                        isOneToOne: false;
                        referencedRelation: "image_sets";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "user_saved_image_sets_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    }
                ];
            };
            user_saved_text_versions: {
                Row: {
                    created_at: string | null;
                    id: string;
                    text_version_id: string;
                    updated_at: string | null;
                    user_id: string;
                };
                Insert: {
                    created_at?: string | null;
                    id?: string;
                    text_version_id: string;
                    updated_at?: string | null;
                    user_id: string;
                };
                Update: {
                    created_at?: string | null;
                    id?: string;
                    text_version_id?: string;
                    updated_at?: string | null;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "user_saved_text_versions_text_version_id_fkey";
                        columns: ["text_version_id"];
                        isOneToOne: false;
                        referencedRelation: "language_entity_best_text_version";
                        referencedColumns: ["text_version_id"];
                    },
                    {
                        foreignKeyName: "user_saved_text_versions_text_version_id_fkey";
                        columns: ["text_version_id"];
                        isOneToOne: false;
                        referencedRelation: "mv_text_version_progress_summary";
                        referencedColumns: ["text_version_id"];
                    },
                    {
                        foreignKeyName: "user_saved_text_versions_text_version_id_fkey";
                        columns: ["text_version_id"];
                        isOneToOne: false;
                        referencedRelation: "text_version_progress_summary";
                        referencedColumns: ["text_version_id"];
                    },
                    {
                        foreignKeyName: "user_saved_text_versions_text_version_id_fkey";
                        columns: ["text_version_id"];
                        isOneToOne: false;
                        referencedRelation: "text_versions";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "user_saved_text_versions_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    }
                ];
            };
            user_version_selections: {
                Row: {
                    created_at: string | null;
                    current_audio_version_id: string | null;
                    current_text_version_id: string | null;
                    id: string;
                    updated_at: string | null;
                    user_id: string;
                };
                Insert: {
                    created_at?: string | null;
                    current_audio_version_id?: string | null;
                    current_text_version_id?: string | null;
                    id?: string;
                    updated_at?: string | null;
                    user_id: string;
                };
                Update: {
                    created_at?: string | null;
                    current_audio_version_id?: string | null;
                    current_text_version_id?: string | null;
                    id?: string;
                    updated_at?: string | null;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "user_version_selections_current_audio_version_id_fkey";
                        columns: ["current_audio_version_id"];
                        isOneToOne: false;
                        referencedRelation: "audio_version_progress_summary";
                        referencedColumns: ["audio_version_id"];
                    },
                    {
                        foreignKeyName: "user_version_selections_current_audio_version_id_fkey";
                        columns: ["current_audio_version_id"];
                        isOneToOne: false;
                        referencedRelation: "audio_versions";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "user_version_selections_current_audio_version_id_fkey";
                        columns: ["current_audio_version_id"];
                        isOneToOne: false;
                        referencedRelation: "language_entity_best_audio_version";
                        referencedColumns: ["audio_version_id"];
                    },
                    {
                        foreignKeyName: "user_version_selections_current_audio_version_id_fkey";
                        columns: ["current_audio_version_id"];
                        isOneToOne: false;
                        referencedRelation: "mv_audio_version_progress_summary";
                        referencedColumns: ["audio_version_id"];
                    },
                    {
                        foreignKeyName: "user_version_selections_current_text_version_id_fkey";
                        columns: ["current_text_version_id"];
                        isOneToOne: false;
                        referencedRelation: "language_entity_best_text_version";
                        referencedColumns: ["text_version_id"];
                    },
                    {
                        foreignKeyName: "user_version_selections_current_text_version_id_fkey";
                        columns: ["current_text_version_id"];
                        isOneToOne: false;
                        referencedRelation: "mv_text_version_progress_summary";
                        referencedColumns: ["text_version_id"];
                    },
                    {
                        foreignKeyName: "user_version_selections_current_text_version_id_fkey";
                        columns: ["current_text_version_id"];
                        isOneToOne: false;
                        referencedRelation: "text_version_progress_summary";
                        referencedColumns: ["text_version_id"];
                    },
                    {
                        foreignKeyName: "user_version_selections_current_text_version_id_fkey";
                        columns: ["current_text_version_id"];
                        isOneToOne: false;
                        referencedRelation: "text_versions";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "user_version_selections_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: true;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    }
                ];
            };
            users: {
                Row: {
                    created_at: string | null;
                    email: string | null;
                    first_name: string | null;
                    id: string;
                    is_anonymous: boolean;
                    last_name: string | null;
                    phone_number: string | null;
                    updated_at: string | null;
                };
                Insert: {
                    created_at?: string | null;
                    email?: string | null;
                    first_name?: string | null;
                    id?: string;
                    is_anonymous?: boolean;
                    last_name?: string | null;
                    phone_number?: string | null;
                    updated_at?: string | null;
                };
                Update: {
                    created_at?: string | null;
                    email?: string | null;
                    first_name?: string | null;
                    id?: string;
                    is_anonymous?: boolean;
                    last_name?: string | null;
                    phone_number?: string | null;
                    updated_at?: string | null;
                };
                Relationships: [];
            };
            verse_feedback: {
                Row: {
                    actioned: Database["public"]["Enums"]["feedback_actioned"];
                    created_at: string | null;
                    created_by: string | null;
                    feedback_text: string | null;
                    feedback_type: Database["public"]["Enums"]["feedback_type"];
                    id: string;
                    media_files_id: string;
                    updated_at: string | null;
                    updated_by: string | null;
                    verse_id: string;
                    version: number;
                };
                Insert: {
                    actioned?: Database["public"]["Enums"]["feedback_actioned"];
                    created_at?: string | null;
                    created_by?: string | null;
                    feedback_text?: string | null;
                    feedback_type: Database["public"]["Enums"]["feedback_type"];
                    id?: string;
                    media_files_id: string;
                    updated_at?: string | null;
                    updated_by?: string | null;
                    verse_id: string;
                    version?: number;
                };
                Update: {
                    actioned?: Database["public"]["Enums"]["feedback_actioned"];
                    created_at?: string | null;
                    created_by?: string | null;
                    feedback_text?: string | null;
                    feedback_type?: Database["public"]["Enums"]["feedback_type"];
                    id?: string;
                    media_files_id?: string;
                    updated_at?: string | null;
                    updated_by?: string | null;
                    verse_id?: string;
                    version?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: "verse_feedback_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "verse_feedback_media_files_id_fkey";
                        columns: ["media_files_id"];
                        isOneToOne: false;
                        referencedRelation: "media_files";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "verse_feedback_updated_by_fkey";
                        columns: ["updated_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "verse_feedback_verse_id_fkey";
                        columns: ["verse_id"];
                        isOneToOne: false;
                        referencedRelation: "verses";
                        referencedColumns: ["id"];
                    }
                ];
            };
            verse_listens: {
                Row: {
                    id: string;
                    language_entity_id: string;
                    listened_at: string | null;
                    origin_share_id: string | null;
                    session_id: string;
                    user_id: string | null;
                    verse_id: string;
                };
                Insert: {
                    id?: string;
                    language_entity_id: string;
                    listened_at?: string | null;
                    origin_share_id?: string | null;
                    session_id: string;
                    user_id?: string | null;
                    verse_id: string;
                };
                Update: {
                    id?: string;
                    language_entity_id?: string;
                    listened_at?: string | null;
                    origin_share_id?: string | null;
                    session_id?: string;
                    user_id?: string | null;
                    verse_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "verse_listens_language_entity_id_fkey";
                        columns: ["language_entity_id"];
                        isOneToOne: false;
                        referencedRelation: "language_entities";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "verse_listens_origin_share_id_fkey";
                        columns: ["origin_share_id"];
                        isOneToOne: false;
                        referencedRelation: "shares";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "verse_listens_session_id_fkey";
                        columns: ["session_id"];
                        isOneToOne: false;
                        referencedRelation: "sessions";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "verse_listens_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "verse_listens_verse_id_fkey";
                        columns: ["verse_id"];
                        isOneToOne: false;
                        referencedRelation: "verses";
                        referencedColumns: ["id"];
                    }
                ];
            };
            verse_texts: {
                Row: {
                    created_at: string | null;
                    created_by: string | null;
                    deleted_at: string | null;
                    id: string;
                    publish_status: Database["public"]["Enums"]["publish_status"];
                    text_version_id: string | null;
                    updated_at: string | null;
                    verse_id: string;
                    verse_text: string;
                    version: number;
                };
                Insert: {
                    created_at?: string | null;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    id?: string;
                    publish_status?: Database["public"]["Enums"]["publish_status"];
                    text_version_id?: string | null;
                    updated_at?: string | null;
                    verse_id: string;
                    verse_text: string;
                    version?: number;
                };
                Update: {
                    created_at?: string | null;
                    created_by?: string | null;
                    deleted_at?: string | null;
                    id?: string;
                    publish_status?: Database["public"]["Enums"]["publish_status"];
                    text_version_id?: string | null;
                    updated_at?: string | null;
                    verse_id?: string;
                    verse_text?: string;
                    version?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: "verse_texts_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "verse_texts_text_version_id_fkey";
                        columns: ["text_version_id"];
                        isOneToOne: false;
                        referencedRelation: "language_entity_best_text_version";
                        referencedColumns: ["text_version_id"];
                    },
                    {
                        foreignKeyName: "verse_texts_text_version_id_fkey";
                        columns: ["text_version_id"];
                        isOneToOne: false;
                        referencedRelation: "mv_text_version_progress_summary";
                        referencedColumns: ["text_version_id"];
                    },
                    {
                        foreignKeyName: "verse_texts_text_version_id_fkey";
                        columns: ["text_version_id"];
                        isOneToOne: false;
                        referencedRelation: "text_version_progress_summary";
                        referencedColumns: ["text_version_id"];
                    },
                    {
                        foreignKeyName: "verse_texts_text_version_id_fkey";
                        columns: ["text_version_id"];
                        isOneToOne: false;
                        referencedRelation: "text_versions";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "verse_texts_verse_id_fkey";
                        columns: ["verse_id"];
                        isOneToOne: false;
                        referencedRelation: "verses";
                        referencedColumns: ["id"];
                    }
                ];
            };
            verses: {
                Row: {
                    chapter_id: string;
                    created_at: string | null;
                    global_order: number | null;
                    id: string;
                    updated_at: string | null;
                    verse_number: number;
                };
                Insert: {
                    chapter_id: string;
                    created_at?: string | null;
                    global_order?: number | null;
                    id: string;
                    updated_at?: string | null;
                    verse_number: number;
                };
                Update: {
                    chapter_id?: string;
                    created_at?: string | null;
                    global_order?: number | null;
                    id?: string;
                    updated_at?: string | null;
                    verse_number?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: "verses_chapter_id_fkey";
                        columns: ["chapter_id"];
                        isOneToOne: false;
                        referencedRelation: "chapters";
                        referencedColumns: ["id"];
                    }
                ];
            };
        };
        Views: {
            audio_version_progress_summary: {
                Row: {
                    audio_version_id: string | null;
                    book_fraction: number | null;
                    books_complete: number | null;
                    chapter_fraction: number | null;
                    chapters_with_audio: number | null;
                    covered_verses: number | null;
                    total_books: number | null;
                    total_chapters: number | null;
                    total_verses: number | null;
                    verse_fraction: number | null;
                };
                Relationships: [];
            };
            geography_columns: {
                Row: {
                    coord_dimension: number | null;
                    f_geography_column: unknown;
                    f_table_catalog: unknown;
                    f_table_name: unknown;
                    f_table_schema: unknown;
                    srid: number | null;
                    type: string | null;
                };
                Relationships: [];
            };
            geometry_columns: {
                Row: {
                    coord_dimension: number | null;
                    f_geometry_column: unknown;
                    f_table_catalog: string | null;
                    f_table_name: unknown;
                    f_table_schema: unknown;
                    srid: number | null;
                    type: string | null;
                };
                Insert: {
                    coord_dimension?: number | null;
                    f_geometry_column?: unknown;
                    f_table_catalog?: string | null;
                    f_table_name?: unknown;
                    f_table_schema?: unknown;
                    srid?: number | null;
                    type?: string | null;
                };
                Update: {
                    coord_dimension?: number | null;
                    f_geometry_column?: unknown;
                    f_table_catalog?: string | null;
                    f_table_name?: unknown;
                    f_table_schema?: unknown;
                    srid?: number | null;
                    type?: string | null;
                };
                Relationships: [];
            };
            language_entity_best_audio_version: {
                Row: {
                    audio_version_id: string | null;
                    language_entity_id: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "audio_versions_language_entity_id_fkey";
                        columns: ["language_entity_id"];
                        isOneToOne: false;
                        referencedRelation: "language_entities";
                        referencedColumns: ["id"];
                    }
                ];
            };
            language_entity_best_text_version: {
                Row: {
                    language_entity_id: string | null;
                    text_version_id: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "text_versions_language_entity_id_fkey";
                        columns: ["language_entity_id"];
                        isOneToOne: false;
                        referencedRelation: "language_entities";
                        referencedColumns: ["id"];
                    }
                ];
            };
            mv_audio_version_progress_summary: {
                Row: {
                    audio_version_id: string | null;
                    book_fraction: number | null;
                    books_complete: number | null;
                    chapter_fraction: number | null;
                    chapters_with_audio: number | null;
                    covered_verses: number | null;
                    total_books: number | null;
                    total_chapters: number | null;
                    total_verses: number | null;
                    verse_fraction: number | null;
                };
                Relationships: [];
            };
            mv_language_listens_stats: {
                Row: {
                    country_code: string | null;
                    downloads: number | null;
                    language_entity_id: string | null;
                    last_download_at: string | null;
                    last_listened_at: string | null;
                    popular_chapters: Json | null;
                    region_id: string | null;
                    total_listened_seconds: number | null;
                };
                Relationships: [];
            };
            mv_text_version_progress_summary: {
                Row: {
                    book_fraction: number | null;
                    books_complete: number | null;
                    chapter_fraction: number | null;
                    complete_chapters: number | null;
                    covered_verses: number | null;
                    text_version_id: string | null;
                    total_books: number | null;
                    total_chapters: number | null;
                    total_verses: number | null;
                    verse_fraction: number | null;
                };
                Relationships: [];
            };
            text_version_progress_summary: {
                Row: {
                    book_fraction: number | null;
                    books_complete: number | null;
                    chapter_fraction: number | null;
                    complete_chapters: number | null;
                    covered_verses: number | null;
                    text_version_id: string | null;
                    total_books: number | null;
                    total_chapters: number | null;
                    total_verses: number | null;
                    verse_fraction: number | null;
                };
                Relationships: [];
            };
            vw_country_language_listens_heatmap: {
                Row: {
                    country_code: string | null;
                    event_count: number | null;
                    grid: unknown;
                    language_entity_id: string | null;
                    last_event_at: string | null;
                    region_id: string | null;
                };
                Relationships: [];
            };
            vw_donation_remaining: {
                Row: {
                    allocated_cents: number | null;
                    completed_at: string | null;
                    created_at: string | null;
                    currency_code: string | null;
                    donation_id: string | null;
                    intent_language_entity_id: string | null;
                    intent_operation_id: string | null;
                    intent_region_id: string | null;
                    intent_type: Database["public"]["Enums"]["donation_intent_type"] | null;
                    is_recurring: boolean | null;
                    partner_org_id: string | null;
                    remaining_cents: number | null;
                    status: Database["public"]["Enums"]["donation_status"] | null;
                    total_donation_cents: number | null;
                    user_id: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "donations_intent_language_entity_id_fkey";
                        columns: ["intent_language_entity_id"];
                        isOneToOne: false;
                        referencedRelation: "language_entities";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "donations_intent_operation_id_fkey";
                        columns: ["intent_operation_id"];
                        isOneToOne: false;
                        referencedRelation: "operations";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "donations_intent_operation_id_fkey";
                        columns: ["intent_operation_id"];
                        isOneToOne: false;
                        referencedRelation: "vw_operation_balances";
                        referencedColumns: ["operation_id"];
                    },
                    {
                        foreignKeyName: "donations_intent_region_id_fkey";
                        columns: ["intent_region_id"];
                        isOneToOne: false;
                        referencedRelation: "regions";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "donations_partner_org_id_fkey";
                        columns: ["partner_org_id"];
                        isOneToOne: false;
                        referencedRelation: "partner_orgs";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "donations_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    }
                ];
            };
            vw_iso_country_to_region: {
                Row: {
                    code: string | null;
                    region_id: string | null;
                };
                Relationships: [];
            };
            vw_language_listens_heatmap: {
                Row: {
                    event_count: number | null;
                    grid: unknown;
                    language_entity_id: string | null;
                    last_event_at: string | null;
                };
                Relationships: [];
            };
            vw_language_listens_stats: {
                Row: {
                    country_code: string | null;
                    downloads: number | null;
                    language_entity_id: string | null;
                    last_download_at: string | null;
                    last_listened_at: string | null;
                    popular_chapters: Json | null;
                    region_id: string | null;
                    total_listened_seconds: number | null;
                };
                Relationships: [];
            };
            vw_operation_balances: {
                Row: {
                    allocation_count: number | null;
                    balance_cents: number | null;
                    category: Database["public"]["Enums"]["operation_category"] | null;
                    cost_count: number | null;
                    created_at: string | null;
                    currency_code: string | null;
                    last_cost_at: string | null;
                    operation_id: string | null;
                    operation_name: string | null;
                    status: Database["public"]["Enums"]["entity_status"] | null;
                    total_allocated_cents: number | null;
                    total_costs_cents: number | null;
                    updated_at: string | null;
                };
                Relationships: [];
            };
            vw_project_balances: {
                Row: {
                    allocation_count: number | null;
                    balance_cents: number | null;
                    cost_count: number | null;
                    currency_code: string | null;
                    language_entity_id: string | null;
                    last_cost_at: string | null;
                    last_transaction_at: string | null;
                    project_id: string | null;
                    project_name: string | null;
                    total_allocated_cents: number | null;
                    total_costs_cents: number | null;
                    total_transactions_cents: number | null;
                    transaction_count: number | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "projects_target_language_entity_id_fkey";
                        columns: ["language_entity_id"];
                        isOneToOne: false;
                        referencedRelation: "language_entities";
                        referencedColumns: ["id"];
                    }
                ];
            };
            vw_project_funding_summary: {
                Row: {
                    allocation_count: number | null;
                    balance_cents: number | null;
                    cost_count: number | null;
                    currency_code: string | null;
                    funding_health: string | null;
                    language_entity_id: string | null;
                    language_name: string | null;
                    last_cost_at: string | null;
                    last_transaction_at: string | null;
                    project_id: string | null;
                    project_name: string | null;
                    total_allocated_cents: number | null;
                    total_costs_cents: number | null;
                    total_transactions_cents: number | null;
                    transaction_count: number | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "projects_target_language_entity_id_fkey";
                        columns: ["language_entity_id"];
                        isOneToOne: false;
                        referencedRelation: "language_entities";
                        referencedColumns: ["id"];
                    }
                ];
            };
            vw_unallocated_donations: {
                Row: {
                    allocated_cents: number | null;
                    completed_at: string | null;
                    created_at: string | null;
                    currency_code: string | null;
                    donation_id: string | null;
                    intent_language_entity_id: string | null;
                    intent_operation_id: string | null;
                    intent_region_id: string | null;
                    intent_type: Database["public"]["Enums"]["donation_intent_type"] | null;
                    is_recurring: boolean | null;
                    partner_org_id: string | null;
                    remaining_cents: number | null;
                    status: Database["public"]["Enums"]["donation_status"] | null;
                    total_donation_cents: number | null;
                    user_id: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "donations_intent_language_entity_id_fkey";
                        columns: ["intent_language_entity_id"];
                        isOneToOne: false;
                        referencedRelation: "language_entities";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "donations_intent_operation_id_fkey";
                        columns: ["intent_operation_id"];
                        isOneToOne: false;
                        referencedRelation: "operations";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "donations_intent_operation_id_fkey";
                        columns: ["intent_operation_id"];
                        isOneToOne: false;
                        referencedRelation: "vw_operation_balances";
                        referencedColumns: ["operation_id"];
                    },
                    {
                        foreignKeyName: "donations_intent_region_id_fkey";
                        columns: ["intent_region_id"];
                        isOneToOne: false;
                        referencedRelation: "regions";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "donations_partner_org_id_fkey";
                        columns: ["partner_org_id"];
                        isOneToOne: false;
                        referencedRelation: "partner_orgs";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "donations_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: false;
                        referencedRelation: "users";
                        referencedColumns: ["id"];
                    }
                ];
            };
        };
        Functions: {
            _postgis_deprecate: {
                Args: {
                    newname: string;
                    oldname: string;
                    version: string;
                };
                Returns: undefined;
            };
            _postgis_index_extent: {
                Args: {
                    col: string;
                    tbl: unknown;
                };
                Returns: unknown;
            };
            _postgis_pgsql_version: {
                Args: never;
                Returns: string;
            };
            _postgis_scripts_pgsql_version: {
                Args: never;
                Returns: string;
            };
            _postgis_selectivity: {
                Args: {
                    att_name: string;
                    geom: unknown;
                    mode?: string;
                    tbl: unknown;
                };
                Returns: number;
            };
            _postgis_stats: {
                Args: {
                    ""?: string;
                    att_name: string;
                    tbl: unknown;
                };
                Returns: string;
            };
            _st_3dintersects: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            _st_contains: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            _st_containsproperly: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            _st_coveredby: {
                Args: {
                    geog1: unknown;
                    geog2: unknown;
                };
                Returns: boolean;
            } | {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            _st_covers: {
                Args: {
                    geog1: unknown;
                    geog2: unknown;
                };
                Returns: boolean;
            } | {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            _st_crosses: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            _st_dwithin: {
                Args: {
                    geog1: unknown;
                    geog2: unknown;
                    tolerance: number;
                    use_spheroid?: boolean;
                };
                Returns: boolean;
            };
            _st_equals: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            _st_intersects: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            _st_linecrossingdirection: {
                Args: {
                    line1: unknown;
                    line2: unknown;
                };
                Returns: number;
            };
            _st_longestline: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: unknown;
            };
            _st_maxdistance: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: number;
            };
            _st_orderingequals: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            _st_overlaps: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            _st_sortablehash: {
                Args: {
                    geom: unknown;
                };
                Returns: number;
            };
            _st_touches: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            _st_voronoi: {
                Args: {
                    clip?: unknown;
                    g1: unknown;
                    return_polygons?: boolean;
                    tolerance?: number;
                };
                Returns: unknown;
            };
            _st_within: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            addauth: {
                Args: {
                    "": string;
                };
                Returns: boolean;
            };
            addgeometrycolumn: {
                Args: {
                    column_name: string;
                    new_dim: number;
                    new_srid: number;
                    new_type: string;
                    schema_name: string;
                    table_name: string;
                    use_typmod?: boolean;
                };
                Returns: string;
            } | {
                Args: {
                    column_name: string;
                    new_dim: number;
                    new_srid: number;
                    new_type: string;
                    table_name: string;
                    use_typmod?: boolean;
                };
                Returns: string;
            } | {
                Args: {
                    catalog_name: string;
                    column_name: string;
                    new_dim: number;
                    new_srid_in: number;
                    new_type: string;
                    schema_name: string;
                    table_name: string;
                    use_typmod?: boolean;
                };
                Returns: string;
            };
            convert_to_usd: {
                Args: {
                    p_amount_cents: number;
                    p_as_of_date: string;
                    p_currency_code: string;
                };
                Returns: number;
            };
            cp1252_softmap: {
                Args: {
                    input: string;
                };
                Returns: string;
            };
            disablelongtransactions: {
                Args: never;
                Returns: string;
            };
            drain_progress_refresh_queue: {
                Args: never;
                Returns: {
                    kind: string;
                    version_id: string;
                }[];
            };
            dropgeometrycolumn: {
                Args: {
                    column_name: string;
                    schema_name: string;
                    table_name: string;
                };
                Returns: string;
            } | {
                Args: {
                    column_name: string;
                    table_name: string;
                };
                Returns: string;
            } | {
                Args: {
                    catalog_name: string;
                    column_name: string;
                    schema_name: string;
                    table_name: string;
                };
                Returns: string;
            };
            dropgeometrytable: {
                Args: {
                    schema_name: string;
                    table_name: string;
                };
                Returns: string;
            } | {
                Args: {
                    table_name: string;
                };
                Returns: string;
            } | {
                Args: {
                    catalog_name: string;
                    schema_name: string;
                    table_name: string;
                };
                Returns: string;
            };
            enablelongtransactions: {
                Args: never;
                Returns: string;
            };
            enqueue_progress_refresh: {
                Args: {
                    kind_in: string;
                    version_in: string;
                };
                Returns: undefined;
            };
            equals: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            geometry: {
                Args: {
                    "": string;
                };
                Returns: unknown;
            };
            geometry_above: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            geometry_below: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            geometry_cmp: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: number;
            };
            geometry_contained_3d: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            geometry_contains: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            geometry_contains_3d: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            geometry_distance_box: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: number;
            };
            geometry_distance_centroid: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: number;
            };
            geometry_eq: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            geometry_ge: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            geometry_gt: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            geometry_le: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            geometry_left: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            geometry_lt: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            geometry_overabove: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            geometry_overbelow: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            geometry_overlaps: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            geometry_overlaps_3d: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            geometry_overleft: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            geometry_overright: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            geometry_right: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            geometry_same: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            geometry_same_3d: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            geometry_within: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            geomfromewkt: {
                Args: {
                    "": string;
                };
                Returns: unknown;
            };
            get_chapter_global_order: {
                Args: {
                    chapter_text_id: string;
                };
                Returns: number;
            } | {
                Args: {
                    chapter_uuid: string;
                };
                Returns: number;
            };
            get_country_code_from_point: {
                Args: {
                    lat: number;
                    lon: number;
                };
                Returns: string;
            };
            get_language_entity_hierarchy: {
                Args: {
                    entity_id: string;
                    generations_down?: number;
                    generations_up?: number;
                };
                Returns: {
                    generation_distance: number;
                    hierarchy_entity_id: string;
                    hierarchy_entity_level: string;
                    hierarchy_entity_name: string;
                    hierarchy_parent_id: string;
                    relationship_type: string;
                }[];
            };
            get_language_entity_path: {
                Args: {
                    entity_id: string;
                };
                Returns: string;
            };
            get_operation_balance: {
                Args: {
                    operation_uuid: string;
                };
                Returns: number;
            };
            get_project_balance: {
                Args: {
                    project_uuid: string;
                };
                Returns: number;
            };
            get_region_bbox_by_id: {
                Args: {
                    p_region_id: string;
                };
                Returns: {
                    center_lat: number;
                    center_lon: number;
                    id: string;
                    level: Database["public"]["Enums"]["region_level"];
                    max_lat: number;
                    max_lon: number;
                    min_lat: number;
                    min_lon: number;
                    name: string;
                    parent_id: string;
                }[];
            };
            get_region_boundary_simplified_by_id: {
                Args: {
                    p_region_id: string;
                    p_tolerance?: number;
                };
                Returns: {
                    boundary: unknown;
                }[];
            };
            get_region_header_and_properties_by_id: {
                Args: {
                    p_region_id: string;
                };
                Returns: {
                    id: string;
                    level: Database["public"]["Enums"]["region_level"];
                    name: string;
                    parent_id: string;
                    properties: Json;
                }[];
            };
            get_region_hierarchy: {
                Args: {
                    generations_down?: number;
                    generations_up?: number;
                    region_id: string;
                };
                Returns: {
                    generation_distance: number;
                    hierarchy_parent_id: string;
                    hierarchy_region_id: string;
                    hierarchy_region_level: string;
                    hierarchy_region_name: string;
                    relationship_type: string;
                }[];
            };
            get_region_minimal_by_point: {
                Args: {
                    lat: number;
                    lon: number;
                    lookup_level?: Database["public"]["Enums"]["region_level"];
                };
                Returns: {
                    center_lat: number;
                    center_lon: number;
                    id: string;
                    level: Database["public"]["Enums"]["region_level"];
                    max_lat: number;
                    max_lon: number;
                    min_lat: number;
                    min_lon: number;
                    name: string;
                    parent_id: string;
                }[];
            };
            get_region_path: {
                Args: {
                    region_id: string;
                };
                Returns: string;
            };
            get_unallocated_amount: {
                Args: {
                    donation_uuid: string;
                };
                Returns: number;
            };
            get_user_roles: {
                Args: {
                    target_user_id: string;
                };
                Returns: {
                    context_id: string;
                    context_type: string;
                    resource_type: string;
                    role_key: string;
                    role_name: string;
                }[];
            };
            get_verse_global_order: {
                Args: {
                    verse_text_id: string;
                };
                Returns: number;
            } | {
                Args: {
                    verse_uuid: string;
                };
                Returns: number;
            };
            gettransactionid: {
                Args: never;
                Returns: unknown;
            };
            has_permission: {
                Args: {
                    p_action: Database["public"]["Enums"]["permission_key"];
                    p_resource_id: string;
                    p_resource_type: Database["public"]["Enums"]["resource_type"];
                    p_user_id: string;
                };
                Returns: boolean;
            };
            list_languages_for_region: {
                Args: {
                    p_include_descendants?: boolean;
                    p_region_id: string;
                };
                Returns: {
                    id: string;
                    level: Database["public"]["Enums"]["language_entity_level"];
                    name: string;
                }[];
            };
            longtransactionsenabled: {
                Args: never;
                Returns: boolean;
            };
            mojibake_fix_hard: {
                Args: {
                    value: string;
                };
                Returns: string;
            };
            mojibake_fix_multi: {
                Args: {
                    value: string;
                };
                Returns: string;
            };
            populate_geometry_columns: {
                Args: {
                    use_typmod?: boolean;
                };
                Returns: string;
            } | {
                Args: {
                    tbl_oid: unknown;
                    use_typmod?: boolean;
                };
                Returns: number;
            };
            postgis_constraint_dims: {
                Args: {
                    geomcolumn: string;
                    geomschema: string;
                    geomtable: string;
                };
                Returns: number;
            };
            postgis_constraint_srid: {
                Args: {
                    geomcolumn: string;
                    geomschema: string;
                    geomtable: string;
                };
                Returns: number;
            };
            postgis_constraint_type: {
                Args: {
                    geomcolumn: string;
                    geomschema: string;
                    geomtable: string;
                };
                Returns: string;
            };
            postgis_extensions_upgrade: {
                Args: never;
                Returns: string;
            };
            postgis_full_version: {
                Args: never;
                Returns: string;
            };
            postgis_geos_version: {
                Args: never;
                Returns: string;
            };
            postgis_lib_build_date: {
                Args: never;
                Returns: string;
            };
            postgis_lib_revision: {
                Args: never;
                Returns: string;
            };
            postgis_lib_version: {
                Args: never;
                Returns: string;
            };
            postgis_libjson_version: {
                Args: never;
                Returns: string;
            };
            postgis_liblwgeom_version: {
                Args: never;
                Returns: string;
            };
            postgis_libprotobuf_version: {
                Args: never;
                Returns: string;
            };
            postgis_libxml_version: {
                Args: never;
                Returns: string;
            };
            postgis_proj_version: {
                Args: never;
                Returns: string;
            };
            postgis_scripts_build_date: {
                Args: never;
                Returns: string;
            };
            postgis_scripts_installed: {
                Args: never;
                Returns: string;
            };
            postgis_scripts_released: {
                Args: never;
                Returns: string;
            };
            postgis_svn_version: {
                Args: never;
                Returns: string;
            };
            postgis_type_name: {
                Args: {
                    coord_dimension: number;
                    geomname: string;
                    use_new_name?: boolean;
                };
                Returns: string;
            };
            postgis_version: {
                Args: never;
                Returns: string;
            };
            postgis_wagyu_version: {
                Args: never;
                Returns: string;
            };
            recommend_language_versions: {
                Args: {
                    filter_type?: Database["public"]["Enums"]["version_filter_type"];
                    include_regions?: boolean;
                    lookback_days?: number;
                    max_results?: number;
                };
                Returns: {
                    alias_id: string;
                    alias_name: string;
                    alias_similarity_score: number;
                    audio_version_count: number;
                    audio_versions: Json;
                    entity_id: string;
                    entity_level: string;
                    entity_name: string;
                    entity_parent_id: string;
                    regions: Json;
                    similarity_threshold_used: number;
                    text_version_count: number;
                    text_versions: Json;
                }[];
            };
            refresh_all_global_orders: {
                Args: never;
                Returns: undefined;
            };
            refresh_progress_materialized_views_concurrently: {
                Args: never;
                Returns: undefined;
            };
            refresh_progress_materialized_views_full: {
                Args: never;
                Returns: undefined;
            };
            refresh_progress_materialized_views_safe: {
                Args: never;
                Returns: undefined;
            };
            refresh_region_spatial_cache: {
                Args: {
                    p_region_id: string;
                };
                Returns: undefined;
            };
            search_language_aliases: {
                Args: {
                    include_regions?: boolean;
                    max_results?: number;
                    min_similarity?: number;
                    search_query: string;
                };
                Returns: {
                    alias_id: string;
                    alias_name: string;
                    alias_similarity_score: number;
                    entity_id: string;
                    entity_level: string;
                    entity_name: string;
                    entity_parent_id: string;
                    regions: Json;
                    similarity_threshold_used: number;
                }[];
            };
            search_language_aliases_with_versions: {
                Args: {
                    filter_type?: Database["public"]["Enums"]["version_filter_type"];
                    include_regions?: boolean;
                    max_results?: number;
                    min_similarity?: number;
                    search_query: string;
                };
                Returns: {
                    alias_id: string;
                    alias_name: string;
                    alias_similarity_score: number;
                    audio_version_count: number;
                    audio_versions: Json;
                    entity_id: string;
                    entity_level: string;
                    entity_name: string;
                    entity_parent_id: string;
                    regions: Json;
                    similarity_threshold_used: number;
                    text_version_count: number;
                    text_versions: Json;
                }[];
            };
            search_partner_orgs: {
                Args: {
                    max_results?: number;
                    search_query: string;
                };
                Returns: {
                    description: string;
                    id: string;
                    name: string;
                    similarity_score: number;
                }[];
            };
            search_region_aliases: {
                Args: {
                    include_languages?: boolean;
                    max_results?: number;
                    min_similarity?: number;
                    search_query: string;
                };
                Returns: {
                    alias_id: string;
                    alias_name: string;
                    alias_similarity_score: number;
                    languages: Json;
                    region_id: string;
                    region_level: string;
                    region_name: string;
                    region_parent_id: string;
                    similarity_threshold_used: number;
                }[];
            };
            show_limit: {
                Args: never;
                Returns: number;
            };
            show_trgm: {
                Args: {
                    "": string;
                };
                Returns: string[];
            };
            st_3dclosestpoint: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: unknown;
            };
            st_3ddistance: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: number;
            };
            st_3dintersects: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            st_3dlongestline: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: unknown;
            };
            st_3dmakebox: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: unknown;
            };
            st_3dmaxdistance: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: number;
            };
            st_3dshortestline: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: unknown;
            };
            st_addpoint: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: unknown;
            };
            st_angle: {
                Args: {
                    line1: unknown;
                    line2: unknown;
                };
                Returns: number;
            } | {
                Args: {
                    pt1: unknown;
                    pt2: unknown;
                    pt3: unknown;
                    pt4?: unknown;
                };
                Returns: number;
            };
            st_area: {
                Args: {
                    geog: unknown;
                    use_spheroid?: boolean;
                };
                Returns: number;
            } | {
                Args: {
                    "": string;
                };
                Returns: number;
            };
            st_asencodedpolyline: {
                Args: {
                    geom: unknown;
                    nprecision?: number;
                };
                Returns: string;
            };
            st_asewkt: {
                Args: {
                    "": string;
                };
                Returns: string;
            };
            st_asgeojson: {
                Args: {
                    geom_column?: string;
                    maxdecimaldigits?: number;
                    pretty_bool?: boolean;
                    r: Record<string, unknown>;
                };
                Returns: string;
            } | {
                Args: {
                    geom: unknown;
                    maxdecimaldigits?: number;
                    options?: number;
                };
                Returns: string;
            } | {
                Args: {
                    geog: unknown;
                    maxdecimaldigits?: number;
                    options?: number;
                };
                Returns: string;
            } | {
                Args: {
                    "": string;
                };
                Returns: string;
            };
            st_asgml: {
                Args: {
                    geom: unknown;
                    maxdecimaldigits?: number;
                    options?: number;
                };
                Returns: string;
            } | {
                Args: {
                    geom: unknown;
                    id?: string;
                    maxdecimaldigits?: number;
                    nprefix?: string;
                    options?: number;
                    version: number;
                };
                Returns: string;
            } | {
                Args: {
                    geog: unknown;
                    id?: string;
                    maxdecimaldigits?: number;
                    nprefix?: string;
                    options?: number;
                    version: number;
                };
                Returns: string;
            } | {
                Args: {
                    geog: unknown;
                    id?: string;
                    maxdecimaldigits?: number;
                    nprefix?: string;
                    options?: number;
                };
                Returns: string;
            } | {
                Args: {
                    "": string;
                };
                Returns: string;
            };
            st_askml: {
                Args: {
                    geom: unknown;
                    maxdecimaldigits?: number;
                    nprefix?: string;
                };
                Returns: string;
            } | {
                Args: {
                    geog: unknown;
                    maxdecimaldigits?: number;
                    nprefix?: string;
                };
                Returns: string;
            } | {
                Args: {
                    "": string;
                };
                Returns: string;
            };
            st_aslatlontext: {
                Args: {
                    geom: unknown;
                    tmpl?: string;
                };
                Returns: string;
            };
            st_asmarc21: {
                Args: {
                    format?: string;
                    geom: unknown;
                };
                Returns: string;
            };
            st_asmvtgeom: {
                Args: {
                    bounds: unknown;
                    buffer?: number;
                    clip_geom?: boolean;
                    extent?: number;
                    geom: unknown;
                };
                Returns: unknown;
            };
            st_assvg: {
                Args: {
                    geom: unknown;
                    maxdecimaldigits?: number;
                    rel?: number;
                };
                Returns: string;
            } | {
                Args: {
                    geog: unknown;
                    maxdecimaldigits?: number;
                    rel?: number;
                };
                Returns: string;
            } | {
                Args: {
                    "": string;
                };
                Returns: string;
            };
            st_astext: {
                Args: {
                    "": string;
                };
                Returns: string;
            };
            st_astwkb: {
                Args: {
                    geom: unknown[];
                    ids: number[];
                    prec?: number;
                    prec_m?: number;
                    prec_z?: number;
                    with_boxes?: boolean;
                    with_sizes?: boolean;
                };
                Returns: string;
            } | {
                Args: {
                    geom: unknown;
                    prec?: number;
                    prec_m?: number;
                    prec_z?: number;
                    with_boxes?: boolean;
                    with_sizes?: boolean;
                };
                Returns: string;
            };
            st_asx3d: {
                Args: {
                    geom: unknown;
                    maxdecimaldigits?: number;
                    options?: number;
                };
                Returns: string;
            };
            st_azimuth: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: number;
            } | {
                Args: {
                    geog1: unknown;
                    geog2: unknown;
                };
                Returns: number;
            };
            st_boundingdiagonal: {
                Args: {
                    fits?: boolean;
                    geom: unknown;
                };
                Returns: unknown;
            };
            st_buffer: {
                Args: {
                    geom: unknown;
                    options?: string;
                    radius: number;
                };
                Returns: unknown;
            } | {
                Args: {
                    geom: unknown;
                    quadsegs: number;
                    radius: number;
                };
                Returns: unknown;
            };
            st_centroid: {
                Args: {
                    "": string;
                };
                Returns: unknown;
            };
            st_clipbybox2d: {
                Args: {
                    box: unknown;
                    geom: unknown;
                };
                Returns: unknown;
            };
            st_closestpoint: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: unknown;
            };
            st_collect: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: unknown;
            };
            st_concavehull: {
                Args: {
                    param_allow_holes?: boolean;
                    param_geom: unknown;
                    param_pctconvex: number;
                };
                Returns: unknown;
            };
            st_contains: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            st_containsproperly: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            st_coorddim: {
                Args: {
                    geometry: unknown;
                };
                Returns: number;
            };
            st_coveredby: {
                Args: {
                    geog1: unknown;
                    geog2: unknown;
                };
                Returns: boolean;
            } | {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            st_covers: {
                Args: {
                    geog1: unknown;
                    geog2: unknown;
                };
                Returns: boolean;
            } | {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            st_crosses: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            st_curvetoline: {
                Args: {
                    flags?: number;
                    geom: unknown;
                    tol?: number;
                    toltype?: number;
                };
                Returns: unknown;
            };
            st_delaunaytriangles: {
                Args: {
                    flags?: number;
                    g1: unknown;
                    tolerance?: number;
                };
                Returns: unknown;
            };
            st_difference: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                    gridsize?: number;
                };
                Returns: unknown;
            };
            st_disjoint: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            st_distance: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: number;
            } | {
                Args: {
                    geog1: unknown;
                    geog2: unknown;
                    use_spheroid?: boolean;
                };
                Returns: number;
            };
            st_distancesphere: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: number;
            } | {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                    radius: number;
                };
                Returns: number;
            };
            st_distancespheroid: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: number;
            };
            st_dwithin: {
                Args: {
                    geog1: unknown;
                    geog2: unknown;
                    tolerance: number;
                    use_spheroid?: boolean;
                };
                Returns: boolean;
            };
            st_equals: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            st_expand: {
                Args: {
                    dm?: number;
                    dx: number;
                    dy: number;
                    dz?: number;
                    geom: unknown;
                };
                Returns: unknown;
            } | {
                Args: {
                    box: unknown;
                    dx: number;
                    dy: number;
                    dz?: number;
                };
                Returns: unknown;
            } | {
                Args: {
                    box: unknown;
                    dx: number;
                    dy: number;
                };
                Returns: unknown;
            };
            st_force3d: {
                Args: {
                    geom: unknown;
                    zvalue?: number;
                };
                Returns: unknown;
            };
            st_force3dm: {
                Args: {
                    geom: unknown;
                    mvalue?: number;
                };
                Returns: unknown;
            };
            st_force3dz: {
                Args: {
                    geom: unknown;
                    zvalue?: number;
                };
                Returns: unknown;
            };
            st_force4d: {
                Args: {
                    geom: unknown;
                    mvalue?: number;
                    zvalue?: number;
                };
                Returns: unknown;
            };
            st_generatepoints: {
                Args: {
                    area: unknown;
                    npoints: number;
                };
                Returns: unknown;
            } | {
                Args: {
                    area: unknown;
                    npoints: number;
                    seed: number;
                };
                Returns: unknown;
            };
            st_geogfromtext: {
                Args: {
                    "": string;
                };
                Returns: unknown;
            };
            st_geographyfromtext: {
                Args: {
                    "": string;
                };
                Returns: unknown;
            };
            st_geohash: {
                Args: {
                    geom: unknown;
                    maxchars?: number;
                };
                Returns: string;
            } | {
                Args: {
                    geog: unknown;
                    maxchars?: number;
                };
                Returns: string;
            };
            st_geomcollfromtext: {
                Args: {
                    "": string;
                };
                Returns: unknown;
            };
            st_geometricmedian: {
                Args: {
                    fail_if_not_converged?: boolean;
                    g: unknown;
                    max_iter?: number;
                    tolerance?: number;
                };
                Returns: unknown;
            };
            st_geometryfromtext: {
                Args: {
                    "": string;
                };
                Returns: unknown;
            };
            st_geomfromewkt: {
                Args: {
                    "": string;
                };
                Returns: unknown;
            };
            st_geomfromgeojson: {
                Args: {
                    "": Json;
                };
                Returns: unknown;
            } | {
                Args: {
                    "": Json;
                };
                Returns: unknown;
            } | {
                Args: {
                    "": string;
                };
                Returns: unknown;
            };
            st_geomfromgml: {
                Args: {
                    "": string;
                };
                Returns: unknown;
            };
            st_geomfromkml: {
                Args: {
                    "": string;
                };
                Returns: unknown;
            };
            st_geomfrommarc21: {
                Args: {
                    marc21xml: string;
                };
                Returns: unknown;
            };
            st_geomfromtext: {
                Args: {
                    "": string;
                };
                Returns: unknown;
            };
            st_gmltosql: {
                Args: {
                    "": string;
                };
                Returns: unknown;
            };
            st_hasarc: {
                Args: {
                    geometry: unknown;
                };
                Returns: boolean;
            };
            st_hausdorffdistance: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: number;
            };
            st_hexagon: {
                Args: {
                    cell_i: number;
                    cell_j: number;
                    origin?: unknown;
                    size: number;
                };
                Returns: unknown;
            };
            st_hexagongrid: {
                Args: {
                    bounds: unknown;
                    size: number;
                };
                Returns: Record<string, unknown>[];
            };
            st_interpolatepoint: {
                Args: {
                    line: unknown;
                    point: unknown;
                };
                Returns: number;
            };
            st_intersection: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                    gridsize?: number;
                };
                Returns: unknown;
            };
            st_intersects: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            } | {
                Args: {
                    geog1: unknown;
                    geog2: unknown;
                };
                Returns: boolean;
            };
            st_isvaliddetail: {
                Args: {
                    flags?: number;
                    geom: unknown;
                };
                Returns: Database["public"]["CompositeTypes"]["valid_detail"];
                SetofOptions: {
                    from: "*";
                    to: "valid_detail";
                    isOneToOne: true;
                    isSetofReturn: false;
                };
            };
            st_length: {
                Args: {
                    geog: unknown;
                    use_spheroid?: boolean;
                };
                Returns: number;
            } | {
                Args: {
                    "": string;
                };
                Returns: number;
            };
            st_letters: {
                Args: {
                    font?: Json;
                    letters: string;
                };
                Returns: unknown;
            };
            st_linecrossingdirection: {
                Args: {
                    line1: unknown;
                    line2: unknown;
                };
                Returns: number;
            };
            st_linefromencodedpolyline: {
                Args: {
                    nprecision?: number;
                    txtin: string;
                };
                Returns: unknown;
            };
            st_linefromtext: {
                Args: {
                    "": string;
                };
                Returns: unknown;
            };
            st_linelocatepoint: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: number;
            };
            st_linetocurve: {
                Args: {
                    geometry: unknown;
                };
                Returns: unknown;
            };
            st_locatealong: {
                Args: {
                    geometry: unknown;
                    leftrightoffset?: number;
                    measure: number;
                };
                Returns: unknown;
            };
            st_locatebetween: {
                Args: {
                    frommeasure: number;
                    geometry: unknown;
                    leftrightoffset?: number;
                    tomeasure: number;
                };
                Returns: unknown;
            };
            st_locatebetweenelevations: {
                Args: {
                    fromelevation: number;
                    geometry: unknown;
                    toelevation: number;
                };
                Returns: unknown;
            };
            st_longestline: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: unknown;
            };
            st_makebox2d: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: unknown;
            };
            st_makeline: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: unknown;
            };
            st_makevalid: {
                Args: {
                    geom: unknown;
                    params: string;
                };
                Returns: unknown;
            };
            st_maxdistance: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: number;
            };
            st_minimumboundingcircle: {
                Args: {
                    inputgeom: unknown;
                    segs_per_quarter?: number;
                };
                Returns: unknown;
            };
            st_mlinefromtext: {
                Args: {
                    "": string;
                };
                Returns: unknown;
            };
            st_mpointfromtext: {
                Args: {
                    "": string;
                };
                Returns: unknown;
            };
            st_mpolyfromtext: {
                Args: {
                    "": string;
                };
                Returns: unknown;
            };
            st_multilinestringfromtext: {
                Args: {
                    "": string;
                };
                Returns: unknown;
            };
            st_multipointfromtext: {
                Args: {
                    "": string;
                };
                Returns: unknown;
            };
            st_multipolygonfromtext: {
                Args: {
                    "": string;
                };
                Returns: unknown;
            };
            st_node: {
                Args: {
                    g: unknown;
                };
                Returns: unknown;
            };
            st_normalize: {
                Args: {
                    geom: unknown;
                };
                Returns: unknown;
            };
            st_offsetcurve: {
                Args: {
                    distance: number;
                    line: unknown;
                    params?: string;
                };
                Returns: unknown;
            };
            st_orderingequals: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            st_overlaps: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            st_perimeter: {
                Args: {
                    geog: unknown;
                    use_spheroid?: boolean;
                };
                Returns: number;
            };
            st_pointfromtext: {
                Args: {
                    "": string;
                };
                Returns: unknown;
            };
            st_pointm: {
                Args: {
                    mcoordinate: number;
                    srid?: number;
                    xcoordinate: number;
                    ycoordinate: number;
                };
                Returns: unknown;
            };
            st_pointz: {
                Args: {
                    srid?: number;
                    xcoordinate: number;
                    ycoordinate: number;
                    zcoordinate: number;
                };
                Returns: unknown;
            };
            st_pointzm: {
                Args: {
                    mcoordinate: number;
                    srid?: number;
                    xcoordinate: number;
                    ycoordinate: number;
                    zcoordinate: number;
                };
                Returns: unknown;
            };
            st_polyfromtext: {
                Args: {
                    "": string;
                };
                Returns: unknown;
            };
            st_polygonfromtext: {
                Args: {
                    "": string;
                };
                Returns: unknown;
            };
            st_project: {
                Args: {
                    azimuth: number;
                    distance: number;
                    geog: unknown;
                };
                Returns: unknown;
            };
            st_quantizecoordinates: {
                Args: {
                    g: unknown;
                    prec_m?: number;
                    prec_x: number;
                    prec_y?: number;
                    prec_z?: number;
                };
                Returns: unknown;
            };
            st_reduceprecision: {
                Args: {
                    geom: unknown;
                    gridsize: number;
                };
                Returns: unknown;
            };
            st_relate: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: string;
            };
            st_removerepeatedpoints: {
                Args: {
                    geom: unknown;
                    tolerance?: number;
                };
                Returns: unknown;
            };
            st_segmentize: {
                Args: {
                    geog: unknown;
                    max_segment_length: number;
                };
                Returns: unknown;
            };
            st_setsrid: {
                Args: {
                    geom: unknown;
                    srid: number;
                };
                Returns: unknown;
            } | {
                Args: {
                    geog: unknown;
                    srid: number;
                };
                Returns: unknown;
            };
            st_sharedpaths: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: unknown;
            };
            st_shortestline: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: unknown;
            };
            st_simplifypolygonhull: {
                Args: {
                    geom: unknown;
                    is_outer?: boolean;
                    vertex_fraction: number;
                };
                Returns: unknown;
            };
            st_split: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: unknown;
            };
            st_square: {
                Args: {
                    cell_i: number;
                    cell_j: number;
                    origin?: unknown;
                    size: number;
                };
                Returns: unknown;
            };
            st_squaregrid: {
                Args: {
                    bounds: unknown;
                    size: number;
                };
                Returns: Record<string, unknown>[];
            };
            st_srid: {
                Args: {
                    geom: unknown;
                };
                Returns: number;
            } | {
                Args: {
                    geog: unknown;
                };
                Returns: number;
            };
            st_subdivide: {
                Args: {
                    geom: unknown;
                    gridsize?: number;
                    maxvertices?: number;
                };
                Returns: unknown[];
            };
            st_swapordinates: {
                Args: {
                    geom: unknown;
                    ords: unknown;
                };
                Returns: unknown;
            };
            st_symdifference: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                    gridsize?: number;
                };
                Returns: unknown;
            };
            st_symmetricdifference: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: unknown;
            };
            st_tileenvelope: {
                Args: {
                    bounds?: unknown;
                    margin?: number;
                    x: number;
                    y: number;
                    zoom: number;
                };
                Returns: unknown;
            };
            st_touches: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            st_transform: {
                Args: {
                    geom: unknown;
                    to_proj: string;
                };
                Returns: unknown;
            } | {
                Args: {
                    from_proj: string;
                    geom: unknown;
                    to_srid: number;
                };
                Returns: unknown;
            } | {
                Args: {
                    from_proj: string;
                    geom: unknown;
                    to_proj: string;
                };
                Returns: unknown;
            };
            st_triangulatepolygon: {
                Args: {
                    g1: unknown;
                };
                Returns: unknown;
            };
            st_union: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: unknown;
            } | {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                    gridsize: number;
                };
                Returns: unknown;
            };
            st_voronoilines: {
                Args: {
                    extend_to?: unknown;
                    g1: unknown;
                    tolerance?: number;
                };
                Returns: unknown;
            };
            st_voronoipolygons: {
                Args: {
                    extend_to?: unknown;
                    g1: unknown;
                    tolerance?: number;
                };
                Returns: unknown;
            };
            st_within: {
                Args: {
                    geom1: unknown;
                    geom2: unknown;
                };
                Returns: boolean;
            };
            st_wkbtosql: {
                Args: {
                    wkb: string;
                };
                Returns: unknown;
            };
            st_wkttosql: {
                Args: {
                    "": string;
                };
                Returns: unknown;
            };
            st_wrapx: {
                Args: {
                    geom: unknown;
                    move: number;
                    wrap: number;
                };
                Returns: unknown;
            };
            try_fix_mojibake: {
                Args: {
                    value: string;
                };
                Returns: string;
            };
            try_fix_mojibake_v2: {
                Args: {
                    value: string;
                };
                Returns: string;
            };
            unlockrows: {
                Args: {
                    "": string;
                };
                Returns: number;
            };
            updategeometrysrid: {
                Args: {
                    catalogn_name: string;
                    column_name: string;
                    new_srid_in: number;
                    schema_name: string;
                    table_name: string;
                };
                Returns: string;
            };
            validate_verse_range: {
                Args: {
                    end_verse_text_id: string;
                    start_verse_text_id: string;
                };
                Returns: boolean;
            } | {
                Args: {
                    end_verse_uuid: string;
                    start_verse_uuid: string;
                };
                Returns: boolean;
            };
        };
        Enums: {
            bookmark_type: "passage";
            budget_item_category: "meals" | "housing" | "transport" | "equipment";
            change_type: "create" | "update" | "delete";
            check_status: "pending" | "approved" | "rejected" | "requires_review";
            connectivity_type: "wifi" | "cellular" | "offline" | "unknown";
            contribution_status: "approved" | "not_approved";
            donation_intent_type: "language" | "region" | "operation" | "unrestricted";
            donation_status: "draft" | "pending" | "processing" | "completed" | "failed" | "refunded" | "cancelled";
            entity_status: "draft" | "available" | "funded" | "archived";
            feedback_actioned: "pending" | "actioned" | "rejected";
            feedback_type: "approved" | "change_required";
            funding_status: "unfunded" | "partially_funded" | "fully_funded";
            language_entity_level: "family" | "language" | "dialect" | "mother_tongue";
            location_source_type: "device" | "ip" | "unknown";
            media_type: "audio" | "video" | "image";
            operation_category: "travel" | "administration" | "legal" | "server" | "marketing" | "development";
            payment_attempt_status: "requires_payment_method" | "requires_confirmation" | "requires_action" | "processing" | "requires_capture" | "succeeded" | "canceled" | "failed";
            payment_method_type: "card" | "us_bank_account" | "sepa_debit";
            permission_key: "system.admin" | "team.read" | "team.write" | "team.delete" | "team.invite" | "team.manage_roles" | "project.read" | "project.write" | "project.delete" | "project.invite" | "project.manage_roles" | "base.read" | "base.write" | "base.delete" | "base.manage_roles" | "partner.read" | "partner.manage_roles" | "budget.read" | "budget.write" | "contribution.read" | "contribution.write";
            platform_type: "ios" | "android" | "web" | "desktop";
            playlist_item_type: "passage" | "custom_text";
            project_status: "precreated" | "active" | "completed" | "cancelled";
            publish_status: "pending" | "published" | "archived";
            region_level: "continent" | "world_region" | "country" | "state" | "province" | "district" | "town" | "village";
            resource_type: "global" | "team" | "project" | "base" | "partner";
            segment_type: "source" | "target";
            share_entity_type: "app" | "chapter" | "playlist" | "verse" | "passage";
            target_type: "chapter" | "book" | "sermon" | "passage" | "verse" | "podcast" | "film_segment" | "audio_segment";
            testament: "old" | "new";
            text_version_source: "official_translation" | "ai_transcription" | "user_submitted";
            transaction_kind: "payment" | "refund" | "adjustment" | "transfer";
            upload_status: "pending" | "uploading" | "completed" | "failed";
            version_filter_type: "audio_only" | "text_only" | "both_required" | "either";
            wallet_tx_type: "deposit" | "withdrawal" | "adjustment";
        };
        CompositeTypes: {
            geometry_dump: {
                path: number[] | null;
                geom: unknown;
            };
            valid_detail: {
                valid: boolean | null;
                reason: string | null;
                location: unknown;
            };
        };
    };
};
type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];
export type Tables<DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | {
    schema: keyof DatabaseWithoutInternals;
}, TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"]) : never = never> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
    Row: infer R;
} ? R : never : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
    Row: infer R;
} ? R : never : never;
export type TablesInsert<DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | {
    schema: keyof DatabaseWithoutInternals;
}, TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] : never = never> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I;
} ? I : never : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I;
} ? I : never : never;
export type TablesUpdate<DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | {
    schema: keyof DatabaseWithoutInternals;
}, TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] : never = never> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U;
} ? U : never : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U;
} ? U : never : never;
export type Enums<DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | {
    schema: keyof DatabaseWithoutInternals;
}, EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"] : never = never> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName] : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions] : never;
export type CompositeTypes<PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] | {
    schema: keyof DatabaseWithoutInternals;
}, CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"] : never = never> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName] : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions] : never;
export declare const Constants: {
    readonly graphql_public: {
        readonly Enums: {};
    };
    readonly public: {
        readonly Enums: {
            readonly bookmark_type: readonly ["passage"];
            readonly budget_item_category: readonly ["meals", "housing", "transport", "equipment"];
            readonly change_type: readonly ["create", "update", "delete"];
            readonly check_status: readonly ["pending", "approved", "rejected", "requires_review"];
            readonly connectivity_type: readonly ["wifi", "cellular", "offline", "unknown"];
            readonly contribution_status: readonly ["approved", "not_approved"];
            readonly donation_intent_type: readonly ["language", "region", "operation", "unrestricted"];
            readonly donation_status: readonly ["draft", "pending", "processing", "completed", "failed", "refunded", "cancelled"];
            readonly entity_status: readonly ["draft", "available", "funded", "archived"];
            readonly feedback_actioned: readonly ["pending", "actioned", "rejected"];
            readonly feedback_type: readonly ["approved", "change_required"];
            readonly funding_status: readonly ["unfunded", "partially_funded", "fully_funded"];
            readonly language_entity_level: readonly ["family", "language", "dialect", "mother_tongue"];
            readonly location_source_type: readonly ["device", "ip", "unknown"];
            readonly media_type: readonly ["audio", "video", "image"];
            readonly operation_category: readonly ["travel", "administration", "legal", "server", "marketing", "development"];
            readonly payment_attempt_status: readonly ["requires_payment_method", "requires_confirmation", "requires_action", "processing", "requires_capture", "succeeded", "canceled", "failed"];
            readonly payment_method_type: readonly ["card", "us_bank_account", "sepa_debit"];
            readonly permission_key: readonly ["system.admin", "team.read", "team.write", "team.delete", "team.invite", "team.manage_roles", "project.read", "project.write", "project.delete", "project.invite", "project.manage_roles", "base.read", "base.write", "base.delete", "base.manage_roles", "partner.read", "partner.manage_roles", "budget.read", "budget.write", "contribution.read", "contribution.write"];
            readonly platform_type: readonly ["ios", "android", "web", "desktop"];
            readonly playlist_item_type: readonly ["passage", "custom_text"];
            readonly project_status: readonly ["precreated", "active", "completed", "cancelled"];
            readonly publish_status: readonly ["pending", "published", "archived"];
            readonly region_level: readonly ["continent", "world_region", "country", "state", "province", "district", "town", "village"];
            readonly resource_type: readonly ["global", "team", "project", "base", "partner"];
            readonly segment_type: readonly ["source", "target"];
            readonly share_entity_type: readonly ["app", "chapter", "playlist", "verse", "passage"];
            readonly target_type: readonly ["chapter", "book", "sermon", "passage", "verse", "podcast", "film_segment", "audio_segment"];
            readonly testament: readonly ["old", "new"];
            readonly text_version_source: readonly ["official_translation", "ai_transcription", "user_submitted"];
            readonly transaction_kind: readonly ["payment", "refund", "adjustment", "transfer"];
            readonly upload_status: readonly ["pending", "uploading", "completed", "failed"];
            readonly version_filter_type: readonly ["audio_only", "text_only", "both_required", "either"];
            readonly wallet_tx_type: readonly ["deposit", "withdrawal", "adjustment"];
        };
    };
};
export {};

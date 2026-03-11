/**
 * LangQuest Supabase client - SERVER-SIDE ONLY
 * Use in Server Components, API routes, and Server Actions.
 * Uses service role key to read from the external LangQuest project.
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { serverEnv } from '@/lib/env';

export function isLangQuestConfigured(): boolean {
  return !!(
    serverEnv.LANGQUEST_SUPABASE_URL &&
    serverEnv.LANGQUEST_SUPABASE_SERVICE_ROLE_KEY
  );
}

export function createLangQuestClient(): SupabaseClient {
  const url = serverEnv.LANGQUEST_SUPABASE_URL;
  const serviceRoleKey = serverEnv.LANGQUEST_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing LangQuest Supabase config. Set LANGQUEST_SUPABASE_URL and LANGQUEST_SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  return createClient(url, serviceRoleKey);
}

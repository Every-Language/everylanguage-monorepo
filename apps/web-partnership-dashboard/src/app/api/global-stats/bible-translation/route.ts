import { NextResponse } from 'next/server';
import type { Database } from '@everylanguage/shared-types';
import { createClient } from '@/lib/supabase/server';

type GlobalTranslationStats =
  Database['public']['Views']['global_translation_statistics']['Row'];

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('global_translation_statistics')
      .select('*')
      .single<GlobalTranslationStats>();

    if (error) {
      throw error;
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[global-stats:bible-translation] Failed to load', error);
    return NextResponse.json(
      { error: 'Unable to load bible translation statistics' },
      { status: 500 }
    );
  }
}

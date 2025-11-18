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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[global-stats:bible-translation] Failed to load', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // In development/preview, include more error details
    const isDev =
      process.env.NODE_ENV === 'development' ||
      process.env.VERCEL_ENV === 'preview';
    return NextResponse.json(
      {
        error: 'Unable to load bible translation statistics',
        ...(isDev && { details: errorMessage }),
      },
      { status: 500 }
    );
  }
}

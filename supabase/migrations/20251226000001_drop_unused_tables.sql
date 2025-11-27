-- Drop unused tables
-- These tables are confirmed unused and have no production data
DROP TABLE IF EXISTS public.segments_targets cascade;


DROP TABLE IF EXISTS public.sequences_targets cascade;


DROP TABLE IF EXISTS public.sequences_tags cascade;


DROP TABLE IF EXISTS public.media_files_tags cascade;


DROP TABLE IF EXISTS public.media_files_targets cascade;


DROP TABLE IF EXISTS public.tags cascade;

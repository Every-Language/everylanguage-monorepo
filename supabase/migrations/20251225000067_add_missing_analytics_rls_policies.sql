-- Add missing RLS policies for analytics tables
-- 1. Add SELECT policy for share_opens (missing)
-- 2. Add UPDATE policies for all analytics tables (only sessions currently has one)
BEGIN;


-- Add SELECT policy for share_opens
CREATE POLICY "Users can view their own share_opens" ON public.share_opens FOR
SELECT
  USING (auth.uid () = user_id);


-- Add UPDATE policies for analytics tables that don't have them
-- app_downloads
CREATE POLICY "Users can update their own app downloads" ON public.app_downloads
FOR UPDATE
  USING (auth.uid () = user_id)
WITH
  CHECK (auth.uid () = user_id);


-- chapter_listens
CREATE POLICY "Users can update their own chapter listens" ON public.chapter_listens
FOR UPDATE
  USING (auth.uid () = user_id)
WITH
  CHECK (auth.uid () = user_id);


-- media_file_listens
CREATE POLICY "Users can update their own media file listens" ON public.media_file_listens
FOR UPDATE
  USING (auth.uid () = user_id)
WITH
  CHECK (auth.uid () = user_id);


-- share_opens
CREATE POLICY "Users can update their own share_opens" ON public.share_opens
FOR UPDATE
  USING (auth.uid () = user_id)
WITH
  CHECK (auth.uid () = user_id);


-- shares
CREATE POLICY "Users can update their own shares" ON public.shares
FOR UPDATE
  USING (auth.uid () = user_id)
WITH
  CHECK (auth.uid () = user_id);


-- verse_listens
CREATE POLICY "Users can update their own verse listens" ON public.verse_listens
FOR UPDATE
  USING (auth.uid () = user_id)
WITH
  CHECK (auth.uid () = user_id);


-- Note: sessions already has an UPDATE policy, so we skip it
COMMIT;

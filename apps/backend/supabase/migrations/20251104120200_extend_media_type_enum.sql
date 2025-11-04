-- Extend media_type enum to include 'image' for project update media
-- This allows project updates to attach images in addition to audio/video
ALTER TYPE media_type
ADD value if NOT EXISTS 'image';


comment ON type media_type IS 'Media types: audio (Bible recordings), video (Bible/update videos), image (update photos)';

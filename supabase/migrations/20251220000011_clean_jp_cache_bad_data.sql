-- Clean up bad JP cache data
-- Remove records that appear to be default/fallback responses from the API
-- These are records with all null/zero values and the suspicious language name "A'ou"
DELETE FROM jp_language_cache
WHERE
  language_name = 'A''ou'
  AND bible_status = 0
  AND bible_year IS NULL
  AND nt_year IS NULL
  AND portions_year IS NULL
  AND has_audio_recordings = FALSE
  AND grn_url IS NULL;

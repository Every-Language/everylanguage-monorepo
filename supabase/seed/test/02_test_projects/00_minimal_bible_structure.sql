-- Create minimal bible structure for testing
-- Just one book, one chapter, one verse

BEGIN;

-- Ensure bible version exists
INSERT INTO bible_versions (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Standard Bible')
ON CONFLICT (id) DO NOTHING;

-- Create one book
INSERT INTO books (id, bible_version_id, name, book_number)
VALUES ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Genesis', 1)
ON CONFLICT (id) DO NOTHING;

-- Create one chapter
INSERT INTO chapters (id, book_id, chapter_number, total_verses)
VALUES ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 1, 1)
ON CONFLICT (id) DO NOTHING;

-- Create one verse
INSERT INTO verses (id, chapter_id, verse_number)
VALUES ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 1)
ON CONFLICT (id) DO NOTHING;

COMMIT;

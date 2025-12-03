-- 20251221000000_restore_project_and_operation_search_rpcs.sql
-- Recreate fuzzy search RPCs for projects and operations using pg_trgm similarity
BEGIN;


CREATE EXTENSION if NOT EXISTS pg_trgm;


DROP FUNCTION if EXISTS public.search_projects (TEXT, INTEGER, DOUBLE PRECISION);


DROP FUNCTION if EXISTS public.search_operations (TEXT, INTEGER, DOUBLE PRECISION);


CREATE OR REPLACE FUNCTION public.search_projects (
  search_query TEXT,
  max_results INTEGER DEFAULT 50,
  min_similarity DOUBLE PRECISION DEFAULT 0.1
) returns TABLE (
  project_id UUID,
  project_name TEXT,
  target_language_entity_id UUID,
  target_language_name TEXT,
  similarity_score DOUBLE PRECISION
) language plpgsql security definer
SET
  search_path = 'public' AS $$
DECLARE
  similarity_threshold DOUBLE PRECISION;
BEGIN
  IF length(trim(search_query)) < 2 THEN
    RETURN;
  END IF;

  CASE
    WHEN length(trim(search_query)) >= 8 THEN
      similarity_threshold := GREATEST(min_similarity, 0.15);
    WHEN length(trim(search_query)) >= 5 THEN
      similarity_threshold := GREATEST(min_similarity, 0.25);
    WHEN length(trim(search_query)) >= 3 THEN
      similarity_threshold := GREATEST(min_similarity, 0.35);
    ELSE
      similarity_threshold := GREATEST(min_similarity, 0.45);
  END CASE;

  RETURN QUERY
  WITH project_scores AS (
    SELECT
      p.id AS project_id,
      p.name AS project_name,
      p.target_language_entity_id,
      le.name AS target_language_name,
      GREATEST(
        similarity(p.name, search_query)::double precision,
        similarity(le.name, search_query)::double precision
      ) AS similarity_score
    FROM projects p
    JOIN language_entities le ON p.target_language_entity_id = le.id
    WHERE p.deleted_at IS NULL
      AND le.deleted_at IS NULL
      AND (
        p.name % search_query
        OR le.name % search_query
      )
      AND GREATEST(
        similarity(p.name, search_query)::double precision,
        similarity(le.name, search_query)::double precision
      ) >= similarity_threshold
  )
  SELECT
    ps.project_id,
    ps.project_name,
    ps.target_language_entity_id,
    ps.target_language_name,
    ps.similarity_score
  FROM project_scores ps
  ORDER BY
    ps.similarity_score DESC,
    ps.project_name ASC
  LIMIT max_results;
END;
$$;


comment ON function public.search_projects IS 'Fuzzy search for projects by project name or target language using pg_trgm similarity.';


CREATE OR REPLACE FUNCTION public.search_operations (
  search_query TEXT,
  max_results INTEGER DEFAULT 50,
  min_similarity DOUBLE PRECISION DEFAULT 0.1
) returns TABLE (
  operation_id UUID,
  operation_name TEXT,
  category TEXT,
  similarity_score DOUBLE PRECISION
) language plpgsql security definer
SET
  search_path = 'public' AS $$
DECLARE
  similarity_threshold DOUBLE PRECISION;
BEGIN
  IF length(trim(search_query)) < 2 THEN
    RETURN;
  END IF;

  CASE
    WHEN length(trim(search_query)) >= 8 THEN
      similarity_threshold := GREATEST(min_similarity, 0.15);
    WHEN length(trim(search_query)) >= 5 THEN
      similarity_threshold := GREATEST(min_similarity, 0.25);
    WHEN length(trim(search_query)) >= 3 THEN
      similarity_threshold := GREATEST(min_similarity, 0.35);
    ELSE
      similarity_threshold := GREATEST(min_similarity, 0.45);
  END CASE;

  RETURN QUERY
  SELECT
    o.id AS operation_id,
    o.name AS operation_name,
    o.category::text AS category,
    GREATEST(
      similarity(o.name, search_query)::double precision,
      similarity(o.category::text, search_query)::double precision
    ) AS similarity_score
  FROM operations o
  WHERE o.deleted_at IS NULL
    AND o.status = 'available'
    AND (
      o.name % search_query
      OR o.category::text % search_query
    )
    AND GREATEST(
      similarity(o.name, search_query)::double precision,
      similarity(o.category::text, search_query)::double precision
    ) >= similarity_threshold
  ORDER BY
    GREATEST(
      similarity(o.name, search_query)::double precision,
      similarity(o.category::text, search_query)::double precision
    ) DESC,
    o.name ASC
  LIMIT max_results;
END;
$$;


comment ON function public.search_operations IS 'Fuzzy search for operations by name or category using pg_trgm similarity.';


COMMIT;

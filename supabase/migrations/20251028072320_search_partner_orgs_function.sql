-- Database function: search_partner_orgs
-- Fuzzy search for public partner organizations using trigram similarity
-- Drop function first if it exists with different signature to allow changing return type
DROP FUNCTION if EXISTS public.search_partner_orgs (TEXT, INTEGER);


CREATE FUNCTION public.search_partner_orgs (search_query TEXT, max_results INTEGER DEFAULT 10) returns TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  similarity_score REAL
) language plpgsql security definer
SET
  search_path TO 'public' AS $$
DECLARE
  similarity_threshold REAL;
BEGIN
  -- Validate input
  IF length(trim(search_query)) < 2 THEN
    RETURN;
  END IF;

  -- Set similarity threshold based on query length
  CASE 
    WHEN length(trim(search_query)) >= 8 THEN
      similarity_threshold := 0.15;
    WHEN length(trim(search_query)) >= 5 THEN  
      similarity_threshold := 0.25;
    WHEN length(trim(search_query)) >= 3 THEN
      similarity_threshold := 0.35;
    ELSE
      similarity_threshold := 0.4;
  END CASE;

  -- Return matching public partner orgs
  -- similarity() returns REAL, which matches our return type
  RETURN QUERY
  SELECT 
    po.id,
    po.name,
    po.description,
    similarity(po.name, search_query) AS similarity_score
  FROM partner_orgs po
  WHERE 
    po.is_public = true
    AND similarity(po.name, search_query) >= similarity_threshold
  ORDER BY 
    similarity(po.name, search_query) DESC,
    po.name ASC
  LIMIT max_results;
END;
$$;


comment ON function public.search_partner_orgs IS 'Fuzzy search for public partner organizations using trigram similarity matching';

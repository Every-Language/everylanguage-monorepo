-- Fix search_partner_orgs function to properly cast similarity() result from real to double precision
-- The similarity() function returns real, but the function signature expects double precision
CREATE OR REPLACE FUNCTION public.search_partner_orgs (search_query TEXT, max_results INTEGER DEFAULT 10) returns TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  similarity_score DOUBLE PRECISION
) language plpgsql security definer
SET
  search_path TO 'public' AS $$
DECLARE
  similarity_threshold double precision;
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
  -- Use CAST() explicitly to ensure real -> double precision conversion
  RETURN QUERY
  SELECT 
    po.id,
    po.name,
    po.description,
    CAST(similarity(po.name, search_query) AS double precision) as similarity_score
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

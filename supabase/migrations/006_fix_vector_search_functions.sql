-- Fix vector search functions to use website_id instead of project_id
-- First drop the old functions, then create new ones

-- Drop old functions
DROP FUNCTION IF EXISTS match_chunks(vector, integer, uuid);
DROP FUNCTION IF EXISTS hybrid_search(text, vector, uuid, integer);

-- Create updated match_chunks function with website_id
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  website_id uuid DEFAULT NULL
)
RETURNS TABLE (
  text text,
  source_url text,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.text,
    co.source_url,
    1 - (c.embedding <=> query_embedding) as similarity,
    c.metadata
  FROM chunks c
  JOIN content co ON c.content_id = co.id
  WHERE co.website_id = match_chunks.website_id
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create updated hybrid_search function with website_id
CREATE OR REPLACE FUNCTION hybrid_search(
  query_text text,
  query_embedding vector(1536),
  website_id uuid,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  text text,
  source_url text,
  similarity float,
  metadata jsonb,
  search_type text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  (
    -- Vector search results
    SELECT
      c.text,
      co.source_url,
      1 - (c.embedding <=> query_embedding) as similarity,
      c.metadata,
      'vector'::text as search_type
    FROM chunks c
    JOIN content co ON c.content_id = co.id
    WHERE co.website_id = hybrid_search.website_id
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count / 2
  )
  UNION ALL
  (
    -- Keyword search results
    SELECT
      c.text,
      co.source_url,
      0.5::float as similarity,
      c.metadata,
      'keyword'::text as search_type
    FROM chunks c
    JOIN content co ON c.content_id = co.id
    WHERE co.website_id = hybrid_search.website_id
      AND c.text ILIKE '%' || query_text || '%'
    ORDER BY similarity(c.text, query_text) DESC
    LIMIT match_count / 2
  )
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
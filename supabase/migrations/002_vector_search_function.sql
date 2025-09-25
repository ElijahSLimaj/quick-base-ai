-- Create function for vector similarity search
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  project_id uuid DEFAULT NULL
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
  WHERE co.project_id = match_chunks.project_id
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create index for better vector search performance
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_cosine ON chunks 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create function for hybrid search (vector + keyword)
CREATE OR REPLACE FUNCTION hybrid_search(
  query_text text,
  query_embedding vector(1536),
  project_id uuid,
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
    WHERE co.project_id = hybrid_search.project_id
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
    WHERE co.project_id = hybrid_search.project_id
      AND c.text ILIKE '%' || query_text || '%'
    ORDER BY similarity(c.text, query_text) DESC
    LIMIT match_count / 2
  )
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

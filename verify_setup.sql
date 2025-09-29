-- Check if vector extension exists
SELECT extname FROM pg_extension WHERE extname = 'vector';

-- Check if match_chunks function exists
SELECT proname FROM pg_proc WHERE proname = 'match_chunks';

-- Check if hybrid_search function exists
SELECT proname FROM pg_proc WHERE proname = 'hybrid_search';

-- Check if any projects exist
SELECT COUNT(*) as project_count FROM projects;

-- Check if chunks table has vector embedding column
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'chunks' AND column_name = 'embedding';
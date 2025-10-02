-- Rename projects table to websites
ALTER TABLE projects RENAME TO websites;

-- Rename project_id columns to website_id
ALTER TABLE content RENAME COLUMN project_id TO website_id;
ALTER TABLE queries RENAME COLUMN project_id TO website_id;
ALTER TABLE subscriptions RENAME COLUMN project_id TO website_id;

-- Rename indexes
ALTER INDEX idx_projects_owner_id RENAME TO idx_websites_owner_id;
ALTER INDEX idx_content_project_id RENAME TO idx_content_website_id;
ALTER INDEX idx_queries_project_id RENAME TO idx_queries_website_id;
ALTER INDEX idx_subscriptions_project_id RENAME TO idx_subscriptions_website_id;

-- Update RLS policies to use websites table
DROP POLICY IF EXISTS "Users can view their own projects" ON websites;
DROP POLICY IF EXISTS "Users can insert their own projects" ON websites;
DROP POLICY IF EXISTS "Users can update their own projects" ON websites;
DROP POLICY IF EXISTS "Users can delete their own projects" ON websites;

CREATE POLICY "Users can view their own websites" ON websites
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own websites" ON websites
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own websites" ON websites
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own websites" ON websites
  FOR DELETE USING (auth.uid() = owner_id);

-- Update content policies
DROP POLICY IF EXISTS "Users can view content from their projects" ON content;
DROP POLICY IF EXISTS "Users can insert content to their projects" ON content;

CREATE POLICY "Users can view content from their websites" ON content
  FOR SELECT USING (
    website_id IN (
      SELECT id FROM websites WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert content to their websites" ON content
  FOR INSERT WITH CHECK (
    website_id IN (
      SELECT id FROM websites WHERE owner_id = auth.uid()
    )
  );

-- Update chunks policies
DROP POLICY IF EXISTS "Users can view chunks from their projects" ON chunks;
DROP POLICY IF EXISTS "Users can insert chunks to their projects" ON chunks;

CREATE POLICY "Users can view chunks from their websites" ON chunks
  FOR SELECT USING (
    content_id IN (
      SELECT id FROM content WHERE website_id IN (
        SELECT id FROM websites WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert chunks to their websites" ON chunks
  FOR INSERT WITH CHECK (
    content_id IN (
      SELECT id FROM content WHERE website_id IN (
        SELECT id FROM websites WHERE owner_id = auth.uid()
      )
    )
  );

-- Update queries policies
DROP POLICY IF EXISTS "Users can view queries from their projects" ON queries;
DROP POLICY IF EXISTS "Users can insert queries to their projects" ON queries;

CREATE POLICY "Users can view queries from their websites" ON queries
  FOR SELECT USING (
    website_id IN (
      SELECT id FROM websites WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert queries to their websites" ON queries
  FOR INSERT WITH CHECK (
    website_id IN (
      SELECT id FROM websites WHERE owner_id = auth.uid()
    )
  );

-- Update subscriptions policies
DROP POLICY IF EXISTS "Users can view subscriptions from their projects" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert subscriptions to their projects" ON subscriptions;
DROP POLICY IF EXISTS "Users can update subscriptions for their projects" ON subscriptions;

CREATE POLICY "Users can view subscriptions from their websites" ON subscriptions
  FOR SELECT USING (
    website_id IN (
      SELECT id FROM websites WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert subscriptions to their websites" ON subscriptions
  FOR INSERT WITH CHECK (
    website_id IN (
      SELECT id FROM websites WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update subscriptions for their websites" ON subscriptions
  FOR UPDATE USING (
    website_id IN (
      SELECT id FROM websites WHERE owner_id = auth.uid()
    )
  );

-- Update trigger
DROP TRIGGER IF EXISTS update_projects_updated_at ON websites;
CREATE TRIGGER update_websites_updated_at BEFORE UPDATE ON websites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

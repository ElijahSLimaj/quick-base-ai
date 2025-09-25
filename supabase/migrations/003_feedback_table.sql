-- Create query_feedback table
CREATE TABLE query_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query_id UUID REFERENCES queries(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX idx_query_feedback_query_id ON query_feedback(query_id);
CREATE INDEX idx_query_feedback_created_at ON query_feedback(created_at);

-- Enable RLS
ALTER TABLE query_feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for feedback
CREATE POLICY "Users can view feedback from their projects" ON query_feedback
  FOR SELECT USING (
    query_id IN (
      SELECT id FROM queries WHERE project_id IN (
        SELECT id FROM projects WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert feedback for their projects" ON query_feedback
  FOR INSERT WITH CHECK (
    query_id IN (
      SELECT id FROM queries WHERE project_id IN (
        SELECT id FROM projects WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update feedback for their projects" ON query_feedback
  FOR UPDATE USING (
    query_id IN (
      SELECT id FROM queries WHERE project_id IN (
        SELECT id FROM projects WHERE owner_id = auth.uid()
      )
    )
  );

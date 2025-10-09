-- Update RLS policies to include team member access
-- Now that team_members table exists, we can properly implement team-based access control

-- ========================================
-- UPDATE ORGANIZATIONS RLS POLICIES
-- ========================================

-- Drop the original limited policy
DROP POLICY IF EXISTS "Users can view organizations they own" ON public.organizations;

-- Create comprehensive policy that includes team member access
CREATE POLICY "Users can view organizations they own or are members of" ON public.organizations
  FOR SELECT USING (
    auth.uid() = owner_id OR
    auth.uid() IN (
      SELECT user_id FROM public.team_members
      WHERE organization_id = id AND status = 'active'
    )
  );

-- ========================================
-- UPDATE WEBSITES RLS POLICIES
-- ========================================

-- Drop existing policies to recreate with team member access
DROP POLICY IF EXISTS "Users can view websites they own or have access to" ON public.websites;
DROP POLICY IF EXISTS "Users can insert websites they own" ON public.websites;
DROP POLICY IF EXISTS "Users can update websites they own" ON public.websites;
DROP POLICY IF EXISTS "Users can delete websites they own" ON public.websites;

-- New comprehensive policies with team member access
CREATE POLICY "Users can view websites they own or have team access to" ON public.websites
  FOR SELECT USING (
    -- Individual ownership (legacy)
    (organization_id IS NULL AND auth.uid() = owner_id) OR
    -- Organization ownership - owner can see
    (organization_id IS NOT NULL AND auth.uid() IN (
      SELECT owner_id FROM public.organizations WHERE id = organization_id
    )) OR
    -- Team members with appropriate permissions can see
    (organization_id IS NOT NULL AND auth.uid() IN (
      SELECT user_id FROM public.team_members
      WHERE organization_id = websites.organization_id
        AND status = 'active'
        AND (permissions->>'view_tickets')::boolean = true
    ))
  );

CREATE POLICY "Authorized users can create websites" ON public.websites
  FOR INSERT WITH CHECK (
    -- Individual ownership
    (organization_id IS NULL AND auth.uid() = owner_id) OR
    -- Organization ownership - only organization owner and admins can create websites
    (organization_id IS NOT NULL AND auth.uid() IN (
      SELECT owner_id FROM public.organizations WHERE id = organization_id
      UNION
      SELECT user_id FROM public.team_members
      WHERE organization_id = websites.organization_id
        AND status = 'active'
        AND role IN ('admin')
        AND (permissions->>'manage_team')::boolean = true
    ))
  );

CREATE POLICY "Authorized users can update websites" ON public.websites
  FOR UPDATE USING (
    -- Individual ownership
    (organization_id IS NULL AND auth.uid() = owner_id) OR
    -- Organization ownership - owner and admins can update
    (organization_id IS NOT NULL AND auth.uid() IN (
      SELECT owner_id FROM public.organizations WHERE id = organization_id
      UNION
      SELECT user_id FROM public.team_members
      WHERE organization_id = websites.organization_id
        AND status = 'active'
        AND role IN ('admin')
        AND (permissions->>'manage_team')::boolean = true
    ))
  );

CREATE POLICY "Authorized users can delete websites" ON public.websites
  FOR DELETE USING (
    -- Individual ownership
    (organization_id IS NULL AND auth.uid() = owner_id) OR
    -- Organization ownership - only organization owner can delete
    (organization_id IS NOT NULL AND auth.uid() IN (
      SELECT owner_id FROM public.organizations WHERE id = organization_id
    ))
  );

-- ========================================
-- UPDATE CONTENT TABLE RLS POLICIES
-- ========================================

-- Drop existing content policies
DROP POLICY IF EXISTS "Users can view content from their projects" ON public.content;
DROP POLICY IF EXISTS "Users can insert content to their projects" ON public.content;

-- Update content policies to work with new website access model
CREATE POLICY "Users can view content from accessible websites" ON public.content
  FOR SELECT USING (
    website_id IN (
      SELECT id FROM public.websites
      WHERE (
        -- Individual ownership
        (organization_id IS NULL AND auth.uid() = owner_id) OR
        -- Organization ownership - owner can see
        (organization_id IS NOT NULL AND auth.uid() IN (
          SELECT owner_id FROM public.organizations WHERE id = organization_id
        )) OR
        -- Team members with view_tickets permission can see
        (organization_id IS NOT NULL AND auth.uid() IN (
          SELECT user_id FROM public.team_members
          WHERE organization_id = websites.organization_id
            AND status = 'active'
            AND (permissions->>'view_tickets')::boolean = true
        ))
      )
    )
  );

CREATE POLICY "Authorized users can manage content" ON public.content
  FOR ALL USING (
    website_id IN (
      SELECT id FROM public.websites
      WHERE (
        -- Individual ownership
        (organization_id IS NULL AND auth.uid() = owner_id) OR
        -- Organization ownership - owner and admins can manage content
        (organization_id IS NOT NULL AND auth.uid() IN (
          SELECT owner_id FROM public.organizations WHERE id = organization_id
          UNION
          SELECT user_id FROM public.team_members
          WHERE organization_id = websites.organization_id
            AND status = 'active'
            AND role IN ('admin')
        ))
      )
    )
  );

-- ========================================
-- UPDATE CHUNKS TABLE RLS POLICIES
-- ========================================

-- Drop existing chunks policies
DROP POLICY IF EXISTS "Users can view chunks from their projects" ON public.chunks;
DROP POLICY IF EXISTS "Users can insert chunks to their projects" ON public.chunks;

-- Update chunks policies
CREATE POLICY "Users can view chunks from accessible websites" ON public.chunks
  FOR SELECT USING (
    content_id IN (
      SELECT id FROM public.content
      WHERE website_id IN (
        SELECT id FROM public.websites
        WHERE (
          -- Individual ownership
          (organization_id IS NULL AND auth.uid() = owner_id) OR
          -- Organization ownership - owner can see
          (organization_id IS NOT NULL AND auth.uid() IN (
            SELECT owner_id FROM public.organizations WHERE id = organization_id
          )) OR
          -- Team members with view_tickets permission can see
          (organization_id IS NOT NULL AND auth.uid() IN (
            SELECT user_id FROM public.team_members
            WHERE organization_id = websites.organization_id
              AND status = 'active'
              AND (permissions->>'view_tickets')::boolean = true
          ))
        )
      )
    )
  );

CREATE POLICY "Authorized users can manage chunks" ON public.chunks
  FOR ALL USING (
    content_id IN (
      SELECT id FROM public.content
      WHERE website_id IN (
        SELECT id FROM public.websites
        WHERE (
          -- Individual ownership
          (organization_id IS NULL AND auth.uid() = owner_id) OR
          -- Organization ownership - owner and admins can manage
          (organization_id IS NOT NULL AND auth.uid() IN (
            SELECT owner_id FROM public.organizations WHERE id = organization_id
            UNION
            SELECT user_id FROM public.team_members
            WHERE organization_id = websites.organization_id
              AND status = 'active'
              AND role IN ('admin')
          ))
        )
      )
    )
  );

-- ========================================
-- UPDATE QUERIES TABLE RLS POLICIES
-- ========================================

-- Drop existing queries policies
DROP POLICY IF EXISTS "Users can view queries from their projects" ON public.queries;
DROP POLICY IF EXISTS "Users can insert queries to their projects" ON public.queries;

-- Update queries policies
CREATE POLICY "Users can view queries from accessible websites" ON public.queries
  FOR SELECT USING (
    website_id IN (
      SELECT id FROM public.websites
      WHERE (
        -- Individual ownership
        (organization_id IS NULL AND auth.uid() = owner_id) OR
        -- Organization ownership - owner can see
        (organization_id IS NOT NULL AND auth.uid() IN (
          SELECT owner_id FROM public.organizations WHERE id = organization_id
        )) OR
        -- Team members with view_analytics permission can see queries
        (organization_id IS NOT NULL AND auth.uid() IN (
          SELECT user_id FROM public.team_members
          WHERE organization_id = websites.organization_id
            AND status = 'active'
            AND (permissions->>'view_analytics')::boolean = true
        ))
      )
    )
  );

CREATE POLICY "System can insert queries" ON public.queries
  FOR INSERT WITH CHECK (true); -- Queries are inserted by system, not directly by users

-- ========================================
-- UPDATE SUBSCRIPTIONS TABLE RLS POLICIES
-- ========================================

-- Drop existing subscriptions policies
DROP POLICY IF EXISTS "Users can view subscriptions from their projects" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert subscriptions to their projects" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update subscriptions for their projects" ON public.subscriptions;

-- Update subscriptions policies
CREATE POLICY "Users can view subscriptions for accessible websites" ON public.subscriptions
  FOR SELECT USING (
    website_id IN (
      SELECT id FROM public.websites
      WHERE (
        -- Individual ownership
        (organization_id IS NULL AND auth.uid() = owner_id) OR
        -- Organization ownership - owner can see
        (organization_id IS NOT NULL AND auth.uid() IN (
          SELECT owner_id FROM public.organizations WHERE id = organization_id
        )) OR
        -- Team members with manage_billing permission can see subscriptions
        (organization_id IS NOT NULL AND auth.uid() IN (
          SELECT user_id FROM public.team_members
          WHERE organization_id = websites.organization_id
            AND status = 'active'
            AND (permissions->>'manage_billing')::boolean = true
        ))
      )
    )
  );

CREATE POLICY "Authorized users can manage subscriptions" ON public.subscriptions
  FOR ALL USING (
    website_id IN (
      SELECT id FROM public.websites
      WHERE (
        -- Individual ownership
        (organization_id IS NULL AND auth.uid() = owner_id) OR
        -- Organization ownership - only owner can manage billing
        (organization_id IS NOT NULL AND auth.uid() IN (
          SELECT owner_id FROM public.organizations WHERE id = organization_id
        ))
      )
    )
  );

-- ========================================
-- HELPER FUNCTION TO CHECK USER PERMISSIONS
-- ========================================

-- Function to check if user has specific permission for a website
CREATE OR REPLACE FUNCTION user_has_website_permission(
  p_website_id UUID,
  p_permission TEXT,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
DECLARE
  website_org_id UUID;
BEGIN
  -- Get website organization
  SELECT organization_id INTO website_org_id
  FROM public.websites
  WHERE id = p_website_id;

  -- Individual website (no organization)
  IF website_org_id IS NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.websites
      WHERE id = p_website_id AND owner_id = p_user_id
    );
  END IF;

  -- Organization website
  RETURN EXISTS (
    -- Organization owner has all permissions
    SELECT 1 FROM public.organizations
    WHERE id = website_org_id AND owner_id = p_user_id
  ) OR EXISTS (
    -- Team member with specific permission
    SELECT 1 FROM public.team_members
    WHERE organization_id = website_org_id
      AND user_id = p_user_id
      AND status = 'active'
      AND (permissions->>p_permission)::boolean = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
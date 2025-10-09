-- Update websites table to support both individual and organizational ownership
-- This maintains backward compatibility while adding enterprise organization support

-- Add organization_id column (nullable for backward compatibility)
ALTER TABLE public.websites
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add plan tracking at website level (inherits from organization for enterprise)
ALTER TABLE public.websites
ADD COLUMN plan_name TEXT DEFAULT 'trial' CHECK (plan_name IN ('trial', 'starter', 'pro', 'enterprise'));

-- Add index for performance
CREATE INDEX idx_websites_organization_id ON public.websites(organization_id);

-- Function to determine if website is organization-owned vs individually-owned
CREATE OR REPLACE FUNCTION is_organization_website(website_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.websites
    WHERE id = website_id AND organization_id IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get website owner (either individual user_id or organization owner_id)
CREATE OR REPLACE FUNCTION get_website_owner(website_id UUID)
RETURNS UUID AS $$
DECLARE
  website_row public.websites%ROWTYPE;
  org_owner_id UUID;
BEGIN
  SELECT * INTO website_row FROM public.websites WHERE id = website_id;

  IF website_row.organization_id IS NOT NULL THEN
    -- Organization-owned website - return organization owner
    SELECT owner_id INTO org_owner_id
    FROM public.organizations
    WHERE id = website_row.organization_id;
    RETURN org_owner_id;
  ELSE
    -- Individual-owned website - return direct owner
    RETURN website_row.owner_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Update RLS policies to handle both individual and organization ownership
DROP POLICY IF EXISTS "Users can view their own projects" ON public.websites;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.websites;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.websites;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.websites;

-- New RLS policies supporting both ownership models
CREATE POLICY "Users can view websites they own or have access to" ON public.websites
  FOR SELECT USING (
    -- Individual ownership (legacy)
    (organization_id IS NULL AND auth.uid() = owner_id) OR
    -- Organization ownership - owner can see
    (organization_id IS NOT NULL AND auth.uid() IN (
      SELECT owner_id FROM public.organizations WHERE id = organization_id
    ))
    -- Note: Team member access will be added after team_members table is created
  );

CREATE POLICY "Users can insert websites they own" ON public.websites
  FOR INSERT WITH CHECK (
    -- Individual ownership
    (organization_id IS NULL AND auth.uid() = owner_id) OR
    -- Organization ownership - only organization owner can create websites
    (organization_id IS NOT NULL AND auth.uid() IN (
      SELECT owner_id FROM public.organizations WHERE id = organization_id
    ))
  );

CREATE POLICY "Users can update websites they own" ON public.websites
  FOR UPDATE USING (
    -- Individual ownership
    (organization_id IS NULL AND auth.uid() = owner_id) OR
    -- Organization ownership - only organization owner can update
    (organization_id IS NOT NULL AND auth.uid() IN (
      SELECT owner_id FROM public.organizations WHERE id = organization_id
    ))
  );

CREATE POLICY "Users can delete websites they own" ON public.websites
  FOR DELETE USING (
    -- Individual ownership
    (organization_id IS NULL AND auth.uid() = owner_id) OR
    -- Organization ownership - only organization owner can delete
    (organization_id IS NOT NULL AND auth.uid() IN (
      SELECT owner_id FROM public.organizations WHERE id = organization_id
    ))
  );

-- Function to migrate individual website to organization
CREATE OR REPLACE FUNCTION migrate_website_to_organization(
  website_id UUID,
  target_organization_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  website_owner UUID;
  org_owner UUID;
BEGIN
  -- Get current website owner
  SELECT owner_id INTO website_owner FROM public.websites WHERE id = website_id;

  -- Get organization owner
  SELECT owner_id INTO org_owner FROM public.organizations WHERE id = target_organization_id;

  -- Only allow migration if the user owns both the website and organization
  IF website_owner = org_owner AND auth.uid() = website_owner THEN
    UPDATE public.websites
    SET organization_id = target_organization_id,
        plan_name = (SELECT plan_name FROM public.organizations WHERE id = target_organization_id)
    WHERE id = website_id;

    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
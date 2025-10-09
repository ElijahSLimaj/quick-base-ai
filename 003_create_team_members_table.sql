-- Create team_members table for enterprise seat management and team collaboration
-- Handles multi-user access to organizations with role-based permissions

CREATE TABLE public.team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role and permissions
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  permissions JSONB DEFAULT '{
    "view_tickets": true,
    "create_tickets": true,
    "manage_tickets": false,
    "view_analytics": false,
    "manage_team": false,
    "manage_billing": false
  }',

  -- Invitation and status tracking
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'disabled')),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique user per organization
  UNIQUE(organization_id, user_id)
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_team_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_team_members_updated_at();

-- Create indexes for performance
CREATE INDEX idx_team_members_organization_id ON public.team_members(organization_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_team_members_status ON public.team_members(status);
CREATE INDEX idx_team_members_role ON public.team_members(role);

-- Enable Row Level Security
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_members
CREATE POLICY "Users can view team members of their organizations" ON public.team_members
  FOR SELECT USING (
    -- Organization owner can see all team members
    auth.uid() IN (
      SELECT owner_id FROM public.organizations WHERE id = organization_id
    ) OR
    -- Team members can see other team members in same organization
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT user_id FROM public.team_members tm
      WHERE tm.organization_id = team_members.organization_id
        AND tm.status = 'active'
    )
  );

CREATE POLICY "Organization owners can invite team members" ON public.team_members
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT owner_id FROM public.organizations WHERE id = organization_id
    )
  );

CREATE POLICY "Organization owners and admins can update team members" ON public.team_members
  FOR UPDATE USING (
    -- Organization owner can update anyone
    auth.uid() IN (
      SELECT owner_id FROM public.organizations WHERE id = organization_id
    ) OR
    -- Admins can update members (but not other admins or owners)
    (auth.uid() IN (
      SELECT user_id FROM public.team_members
      WHERE organization_id = team_members.organization_id
        AND role = 'admin'
        AND status = 'active'
    ) AND role = 'member')
  );

CREATE POLICY "Organization owners can remove team members" ON public.team_members
  FOR DELETE USING (
    auth.uid() IN (
      SELECT owner_id FROM public.organizations WHERE id = organization_id
    )
  );

-- Function to set default permissions based on role
CREATE OR REPLACE FUNCTION set_team_member_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- Set default permissions based on role if not explicitly provided
  IF NEW.permissions IS NULL OR NEW.permissions = '{}'::jsonb THEN
    CASE NEW.role
      WHEN 'owner' THEN
        NEW.permissions = '{
          "view_tickets": true,
          "create_tickets": true,
          "manage_tickets": true,
          "view_analytics": true,
          "manage_team": true,
          "manage_billing": true
        }';
      WHEN 'admin' THEN
        NEW.permissions = '{
          "view_tickets": true,
          "create_tickets": true,
          "manage_tickets": true,
          "view_analytics": true,
          "manage_team": true,
          "manage_billing": false
        }';
      WHEN 'member' THEN
        NEW.permissions = '{
          "view_tickets": true,
          "create_tickets": true,
          "manage_tickets": false,
          "view_analytics": false,
          "manage_team": false,
          "manage_billing": false
        }';
    END CASE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set default permissions
CREATE TRIGGER set_team_member_permissions_trigger
  BEFORE INSERT OR UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION set_team_member_permissions();

-- Function to check if organization is within seat limits
CREATE OR REPLACE FUNCTION check_seat_limit(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_seats INTEGER;
  max_allowed_seats INTEGER;
BEGIN
  -- Count active team members
  SELECT COUNT(*) INTO current_seats
  FROM public.team_members
  WHERE organization_id = org_id AND status = 'active';

  -- Get max seats for organization
  SELECT max_seats INTO max_allowed_seats
  FROM public.organizations
  WHERE id = org_id;

  RETURN current_seats < max_allowed_seats;
END;
$$ LANGUAGE plpgsql;

-- Function to update organization seat count
CREATE OR REPLACE FUNCTION update_organization_seat_count()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
  active_seats INTEGER;
BEGIN
  -- Determine organization_id from old or new record
  org_id := COALESCE(NEW.organization_id, OLD.organization_id);

  -- Count current active seats
  SELECT COUNT(*) INTO active_seats
  FROM public.team_members
  WHERE organization_id = org_id AND status = 'active';

  -- Update organization seat count
  UPDATE public.organizations
  SET seat_count = active_seats
  WHERE id = org_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain seat count in organizations table
CREATE TRIGGER update_organization_seat_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_seat_count();

-- Function to add organization owner as team member
CREATE OR REPLACE FUNCTION add_organization_owner_as_team_member()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically add organization owner as team member with owner role
  INSERT INTO public.team_members (
    organization_id,
    user_id,
    role,
    status,
    joined_at
  ) VALUES (
    NEW.id,
    NEW.owner_id,
    'owner',
    'active',
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-add organization owner as team member
CREATE TRIGGER add_organization_owner_as_team_member_trigger
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION add_organization_owner_as_team_member();